# -*- coding: utf-8 -*-
"""
공용 뜻 사전을 빌드에 굽는다.

  python tools/pull_dict.py

Supabase 의 dictionary 테이블을 통째로 받아 data/dict.js 로 쓴다.
앱은 이걸 즉시 읽고, builtAt 이후에 바뀐 것만 델타로 받는다.

굳이 굽는 이유는 첫 로딩과 오프라인이다. 사전이 커질수록 이게 중요해진다.
  - 굽지 않으면 첫 실행에서 뜻이 빈 채로 떴다가 나중에 채워진다
  - 비행기 모드에서 처음 여는 기기는 뜻을 아예 못 받는다

주소와 키는 아래 순서로 찾는다.
  1. 환경변수 SUPABASE_URL / SUPABASE_ANON_KEY
  2. data/config.js 안의 window.SYNC_CONFIG

anon 키만 있으면 된다 — 읽기는 전원에게 열려 있다.
쓰기는 운영자 계정으로 앱 안에서 한다 (설정 > 계정 > 사전에 발행).

배포 전에 이걸 돌리고 build_dist.py 를 돌리면 최신 사전이 실린다.
안 돌려도 앱은 정상 동작한다 — 사전 전체를 델타로 받게 될 뿐이다.
"""
import io
import json
import os
import re
import sys
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "data", "dict.js")
CONFIG = os.path.join(ROOT, "data", "config.js")

PAGE = 1000        # PostgREST 기본 상한에 걸리지 않게 나눠 받는다


def find_config():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_ANON_KEY")
    if url and key:
        return url, key

    if not os.path.exists(CONFIG):
        return None, None

    src = io.open(CONFIG, encoding="utf-8").read()
    u = re.search(r"url\s*:\s*['\"]([^'\"]+)['\"]", src)
    k = re.search(r"key\s*:\s*['\"]([^'\"]+)['\"]", src)
    return (u.group(1) if u else None), (k.group(1) if k else None)


def fetch_all(url, key):
    """dictionary 를 페이지 단위로 전부 받는다."""
    base = url.rstrip("/") + "/rest/v1/dictionary"
    q = "?select=id,patch,aliases,deleted,entry,updated_at&order=updated_at.asc"
    rows = []
    offset = 0

    while True:
        req = urllib.request.Request(
            base + q + "&limit=%d&offset=%d" % (PAGE, offset),
            headers={
                "apikey": key,
                "Authorization": "Bearer " + key,
                "Accept": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            chunk = json.loads(r.read().decode("utf-8"))
        rows.extend(chunk)
        if len(chunk) < PAGE:
            break
        offset += PAGE

    return rows


def bake(rows):
    """서버 행을 앱이 읽는 모양으로. js/dict.js 의 normalize() 와 같아야 한다."""
    out = {}
    built = "1970-01-01T00:00:00Z"

    for r in rows:
        ts = r.get("updated_at") or ""
        if ts > built:
            built = ts
        out[r["id"]] = {
            "p": r.get("patch") or {},
            "a": r.get("aliases") or [],
            "d": bool(r.get("deleted")),
            "e": r.get("entry"),
            "t": ts or None,
        }

    return out, built


HEADER = """/*
 * dict.js — 공용 뜻 사전 (자동 생성물, 직접 고치지 마세요)
 *
 * 만드는 법:  python tools/pull_dict.py
 * Supabase 의 dictionary 테이블을 통째로 받아 여기에 굽는다.
 * 앱은 이걸 즉시 읽고, builtAt 이후에 바뀐 것만 서버에서 델타로 받는다.
 *
 * 비어 있어도 앱은 정상 동작한다 — 사전 전체를 델타로 받게 될 뿐이다.
 */
"""


def write(rows_obj, built):
    body = json.dumps(
        {"builtAt": built, "rows": rows_obj},
        ensure_ascii=False, separators=(",", ":"), sort_keys=True,
    )
    io.open(OUT, "w", encoding="utf-8", newline="\n").write(
        HEADER + "window.DICT = " + body + ";\n"
    )
    return os.path.getsize(OUT)


def empty():
    """설정이 없을 때 — 빈 사전을 써 두면 앱이 그냥 델타로 다 받는다."""
    return write({}, "1970-01-01T00:00:00Z")


def main():
    url, key = find_config()
    if not url or not key:
        size = empty()
        print("Supabase 설정이 없어 빈 사전을 썼습니다 (%d bytes)" % size)
        print("  data/config.js 를 만들거나 SUPABASE_URL / SUPABASE_ANON_KEY 를 넣으세요.")
        return 0

    try:
        rows = fetch_all(url, key)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:200]
        print("사전을 받지 못했습니다: HTTP %s %s" % (e.code, detail))
        if e.code == 404:
            print("  dictionary 테이블이 없습니다. tools/schema.sql 을 먼저 실행하세요.")
        return 1
    except Exception as e:
        print("사전을 받지 못했습니다: %s" % e)
        return 1

    baked, built = bake(rows)
    size = write(baked, built)

    live = sum(1 for r in baked.values() if not r["d"])
    gone = len(baked) - live
    meanings = sum(1 for r in baked.values() if not r["d"] and r["p"].get("ko"))

    print("data/dict.js  %.1f KB" % (size / 1024.0))
    print("  항목 %d개 (뜻 %d개 · 지운 것 %d개)" % (live, meanings, gone))
    print("  기준 시각 %s" % built)
    print("\n다음: python tools/build_dist.py")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
