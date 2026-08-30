# -*- coding: utf-8 -*-
"""
배포 빌드

  python tools/build_dist.py

만드는 것
  dist/              호스팅에 그대로 올리는 폴더 (PWA·서비스워커 포함)
  dist/single.html   전부 인라인한 단일 파일 — 인터넷 없이 폰에 넣어 쓰는 백업본

배포는 main 에 푸시하면 GitHub Actions 가 알아서 한다
(.github/workflows/deploy.yml). 이 스크립트를 손으로 돌릴 일은
dist 를 직접 확인하거나 다른 곳에 올릴 때뿐이다.

최신 공용 사전을 실으려면 먼저 tools/pull_dict.py 를 돌린다.

서비스워커는 https 에서만 동작하므로 호스팅해야 오프라인이 된다.
로컬에서 index.html 을 더블클릭하는 방식은 지금처럼 그대로 쓸 수 있다.
"""
import io
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DIST = os.path.join(ROOT, "dist")

# 배포에 포함할 것 (tools/ 와 PDF 는 뺀다)
COPY_FILES = ["index.html", "manifest.json", "icon.svg", "sw.js"]
COPY_DIRS = ["css", "js", "data"]

# 단어장 원본과 설정 예시는 배포본에 넣지 않는다
SKIP = {"config.example.js"}


def read(p):
    return io.open(p, encoding="utf-8").read()


def build_dist():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)

    for f in COPY_FILES:
        src = os.path.join(ROOT, f)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(DIST, f))

    for d in COPY_DIRS:
        src = os.path.join(ROOT, d)
        if not os.path.isdir(src):
            continue
        dst = os.path.join(DIST, d)
        os.makedirs(dst)
        for name in sorted(os.listdir(src)):
            if not name.endswith((".js", ".css")) or name in SKIP:
                continue
            shutil.copy2(os.path.join(src, name), os.path.join(dst, name))

    total = 0
    for base, _dirs, files in os.walk(DIST):
        for f in files:
            total += os.path.getsize(os.path.join(base, f))
    return total


SCRIPT_RE = re.compile(r'<script src="([^"]+)"></script>')
LINK_RE = re.compile(r'<link rel="stylesheet" href="([^"]+)">')


def build_single():
    """
    모든 js/css 를 index.html 안으로 집어넣는다.
    파일이 하나뿐이라 클라우드에 올려 두고 폰에서 내려받아 열 수 있다.
    """
    html = read(os.path.join(ROOT, "index.html"))

    def inline_script(m):
        path = os.path.join(ROOT, m.group(1))
        if not os.path.exists(path):
            return ""              # data/config.js 처럼 없을 수 있는 것
        return "<script>\n" + read(path) + "\n</script>"

    def inline_css(m):
        path = os.path.join(ROOT, m.group(1))
        if not os.path.exists(path):
            return ""
        return "<style>\n" + read(path) + "\n</style>"

    html = SCRIPT_RE.sub(inline_script, html)
    html = LINK_RE.sub(inline_css, html)

    # 단일 파일에서는 서비스워커와 매니페스트가 의미 없다 (상대 경로가 없다)
    html = html.replace('<link rel="manifest" href="manifest.json">', "")
    html = re.sub(r"<script>\s*/\* 서비스워커.*?</script>", "", html, flags=re.S)

    dest = os.path.join(DIST, "single.html")
    io.open(dest, "w", encoding="utf-8", newline="\n").write(html)
    return os.path.getsize(dest)


def rewrite_sw():
    """
    서비스워커의 캐시 목록을 dist 에 실제로 있는 파일로 다시 쓴다.
    손으로 관리하면 새 js 파일을 추가할 때마다 빠뜨려서 오프라인이 깨진다.
    """
    swp = os.path.join(DIST, "sw.js")
    if not os.path.exists(swp):
        return []
    assets = ["./", "./index.html", "./manifest.json", "./icon.svg"]
    for d in ("css", "js", "data"):
        p2 = os.path.join(DIST, d)
        if not os.path.isdir(p2):
            continue
        for name in sorted(os.listdir(p2)):
            assets.append("./%s/%s" % (d, name))

    body = "var ASSETS = [\n" + "".join("  '%s',\n" % a for a in assets) + "];"
    src = read(swp)
    start = src.index("var ASSETS = [")
    end = src.index("];", start) + 2
    io.open(swp, "w", encoding="utf-8", newline="\n").write(src[:start] + body + src[end:])
    return assets


def check(size_single):
    """빌드 결과가 실제로 동작할 모양인지 최소한만 확인한다."""
    problems = []
    idx = read(os.path.join(DIST, "index.html"))
    for m in SCRIPT_RE.finditer(idx):
        src = m.group(1)
        if src.endswith("config.js"):
            continue               # 선택 사항
        if not os.path.exists(os.path.join(DIST, src)):
            problems.append("index.html 이 부르는 %s 가 dist 에 없음" % src)

    single = read(os.path.join(DIST, "single.html"))
    if 'src="' in single.replace('src="data:', ""):
        problems.append("single.html 에 외부 참조가 남아 있음")
    if "window.NOUNS" not in single:
        problems.append("single.html 에 단어 데이터가 안 들어감")
    if size_single < 900 * 1024:
        problems.append("single.html 이 너무 작음 (%d bytes)" % size_single)
    return problems


def main():
    total = build_dist()
    assets = rewrite_sw()
    single = build_single()
    problems = check(single)

    print("dist/         %6.1f MB  (호스팅 업로드용)" % (total / 1048576.0))
    print("dist/single.html %5.1f MB  (오프라인 백업본)" % (single / 1048576.0))

    n = sum(len(files) for _b, _d, files in os.walk(DIST))
    print("파일 %d개  ·  서비스워커 캐시 %d개" % (n, len(assets)))

    if problems:
        print("\n확인 필요:")
        for p in problems:
            print("  X " + p)
        return 1
    print("\nOK")
    print("  배포: main 에 푸시하면 Actions 가 Pages 로 올린다")
    print("  오프라인: dist/single.html 하나만 폰에 넣기")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
