# -*- coding: utf-8 -*-
"""
Goethe Wortliste PDF -> 중간 TSV 추출 (좌표 기반)

pdftotext -layout 은 다단 레이아웃에서 표제어와 예문의 짝이 어긋난다.
PyMuPDF 의 word 단위 좌표를 써서 컬럼을 정확히 가르고 y좌표로 행을 묶는다.

출력: tools/out/<level>.tsv   (level, page, headword, example)
표제어 칸이 빈 행 = 직전 항목에서 이어지는 줄.
"""
import re
import sys
import os
import io

import fitz

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")

# 실측한 레이아웃. B2 단어장이 오면 여기에 항목 하나만 추가하면 된다.
#   page_split : 페이지를 좌/우 단으로 나누는 x. None 이면 1단.
#   boundaries : 각 단에서 표제어/예문을 가르는 절대 x. 단마다 다르므로 개별 지정.
#                (x-start 히스토그램으로 실측한 값 — 아래 주석의 peak 참고)
#   first_page : 알파벳 목록이 시작되는 페이지(0-based)
#   y_tol      : 같은 행으로 묶을 y 허용 오차
#
# 참고: B1 은 예문 앞에 다의어 번호(1. 2. 3.)가 별도 x 위치에 온다.
#       번호는 예문 쪽에 두어야 어의별 분리가 가능하므로 경계를 그 앞에 잡는다.
DOCS = [
    {
        "level": "A1",
        "file": "A1_SD1_Wortliste_02.pdf",
        "page_split": None,
        "boundaries": [230.0],          # 표제어 142 / 예문 236
        "first_page": 8,
        "group_pages": (4, 8),          # Wortgruppen (요일/월/숫자/색상 …)
        "y_tol": 3.0,
    },
    {
        "level": "A2",
        "file": "Goethe-Zertifikat_A2_Wortliste.pdf",
        "page_split": 295.0,
        "boundaries": [100.0, 370.0],   # 표제어 36 / 예문 107  ·  표제어 304 / 예문 374
        "first_page": 8,
        "group_pages": (4, 8),
        "y_tol": 4.0,
    },
    {
        "level": "B1",
        "file": "Goethe-Zertifikat_B1_Wortliste.pdf",
        "page_split": 295.0,
        "boundaries": [128.0, 407.0],   # 표제어 35 / 번호 132 / 예문 142
        "first_page": 25,               #  ·  표제어 315 / 번호 411 / 예문 421
        "group_pages": (7, 25),
        "y_tol": 4.0,
    },
    {
        # Aspekte neu B2 교재 어휘목록. Goethe 와 달리 예문 칸이 없고 표제어만 있다.
        # 그래서 경계를 각 단의 오른쪽 끝 너머로 잡아 전부 표제어로 읽는다.
        "level": "B2",
        "file": "aspekte-neu-b2-lb-kapitelwortschatz.pdf",
        "page_split": 300.0,
        "boundaries": [300.0, 600.0],   # 좌단 92~250 / 우단 340~470, 둘 다 표제어
        "first_page": 0,
        "y_tol": 4.0,
    },
]

# 페이지 머리말/꼬리말 등 본문이 아닌 것들
NOISE = (
    "GOETHE-ZERTIFIKAT",
    "WORTLISTE",
    "ZERTIFIKAT B1",
    "START DEUTSCH",
    "Wortliste",
    "Inventare",
    "VS_02_280312",
    "VS_03",
    "A2_Wortliste_03_200616",
    "Seite ",
    # Aspekte 교재의 구역 제목
    "Kapitelwortschatz",
    "Aspekte neu",
    "Kapitel ",
    "Modul",
    "Auftakt",
    "Porträt",
    "Übungsteil",
)


def is_noise(text):
    t = text.strip()
    if not t:
        return True
    if t.isdigit():
        return True
    for n in NOISE:
        if t.startswith(n):
            return True
    # 알파벳 섹션 구분자 (단독 대문자 한 글자)
    if len(t) == 1 and t.isalpha() and t.isupper():
        return True
    return False


# Wortgruppen(주제별 목록) 쪽에서 건져낼 표제어 형태.
# 요일·월·숫자·색상 같은 기초 어휘가 여기에만 있고 알파벳 목록에는 없다.
# 복수 표기 부분은 소문자·하이픈·움라우트 기호만 허용한다.
# 대문자를 허용하면 뒤에 붙은 예문("-en  Schreiben Sie eine")까지 삼킨다.
GROUP_HEAD = re.compile(
    r"^(der|die|das)\s+[A-ZÄÖÜ][\wäöüßÄÖÜ-]*"
    r"(\s*,\s*[¨\-–][a-zäöüß¨,\- ]{0,8})?$"
)


def extract_groups(doc, cfg):
    """
    Wortgruppen 쪽은 예문 없는 단순 나열이라 좌표를 쓸 필요가 없다.
    한 줄이 통째로 표제어인 것만 정규식으로 건진다. 산문·표제는 형태가 달라 걸리지 않는다.
    """
    rows = []
    lo, hi = cfg.get("group_pages", (0, 0))
    for pno in range(lo, min(hi, doc.page_count)):
        for raw in doc[pno].get_text().split("\n"):
            line = raw.strip().rstrip(";")
            if not line or len(line) > 45:
                continue
            if GROUP_HEAD.match(line):
                rows.append((cfg["level"], pno + 1, line, ""))
    return rows


def extract_doc(cfg):
    path = os.path.join(BASE, cfg["file"])
    doc = fitz.open(path)
    rows = extract_groups(doc, cfg)

    for pno in range(cfg["first_page"], doc.page_count):
        page = doc[pno]
        words = page.get_text("words")  # (x0, y0, x1, y1, word, block, line, wordno)
        if not words:
            continue

        # 본문 영역만 (머리말/꼬리말 잘라내기)
        h = page.rect.height
        words = [w for w in words if 0.05 * h < w[1] < 0.93 * h]

        # 단 나누기
        if cfg["page_split"] is None:
            column_groups = [words]
        else:
            column_groups = [
                [w for w in words if w[0] < cfg["page_split"]],
                [w for w in words if w[0] >= cfg["page_split"]],
            ]

        for ci, colwords in enumerate(column_groups):
            if not colwords:
                continue
            boundary = cfg["boundaries"][ci]

            # y 로 행 묶기 — y 순으로 정렬한 뒤 순차 그룹핑해야 결정적이다
            lines = []
            for w in sorted(colwords, key=lambda w: (w[1], w[0])):
                if lines and abs(w[1] - lines[-1][0]) <= cfg["y_tol"]:
                    lines[-1][1].append(w)
                else:
                    lines.append((w[1], [w]))

            for _y, lw in lines:
                lw = sorted(lw, key=lambda w: w[0])
                head = " ".join(w[4] for w in lw if w[0] < boundary).strip()
                ex = " ".join(w[4] for w in lw if w[0] >= boundary).strip()
                if is_noise(head) and is_noise(ex):
                    continue
                if is_noise(head):
                    head = ""
                if is_noise(ex):
                    ex = ""
                if not head and not ex:
                    continue
                rows.append((cfg["level"], pno + 1, head, ex))

    doc.close()
    return rows


def main():
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for cfg in DOCS:
        if only and cfg["level"] != only:
            continue
        rows = extract_doc(cfg)
        dest = os.path.join(OUT, cfg["level"] + ".tsv")
        with io.open(dest, "w", encoding="utf-8", newline="\n") as f:
            f.write("level\tpage\thead\texample\n")
            for lv, pg, head, ex in rows:
                head = head.replace("\t", " ")
                ex = ex.replace("\t", " ")
                f.write("%s\t%d\t%s\t%s\n" % (lv, pg, head, ex))
        heads = sum(1 for r in rows if r[2])
        print("%s: %d rows (%d with headword) -> %s" % (cfg["level"], len(rows), heads, dest))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
