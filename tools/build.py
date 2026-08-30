# -*- coding: utf-8 -*-
"""
레벨별 JSON -> 통합 마스터 -> data/*.js

핵심: 같은 표제어를 레벨별로 합치면서 '정보가 더 많은 쪽'을 채택한다.
      A1 은 동사 활용을 안 주고, A1/A2 는 복수형을 자주 생략한다.
      B1 이 그 빈칸을 메운다 — 레벨 통합을 택한 실질적 이득이 이것.

출력 형식은 JSON 이 아니라 window.X = [...] 를 선언하는 .js 다.
file:// 로 열면 fetch() 가 CORS 로 막히기 때문.
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
DATA = os.path.join(os.path.dirname(HERE), "data")

LEVELS = ["A1", "A2", "B1", "B2"]
LEVEL_RANK = {lv: i for i, lv in enumerate(LEVELS)}

# 기능어 — 목차 Part 7·9·3 에서 따로 훈련해야 하는 폐쇄 집합.
# 여기 없는 'other' 는 형용사/부사로 분류한다.
FUNCTION_WORDS = set("""
ab an auf aus bei bis durch entlang für gegen gegenüber hinter in innerhalb
mit nach neben ohne seit statt anstatt trotz über um unter von vor während
wegen zu zwischen aufgrund außerhalb bezüglich dank einschließlich laut
mittels seitens trotzdem zufolge zugunsten

und oder aber denn sondern doch beziehungsweise
dass weil da wenn als ob obwohl damit bevor nachdem seitdem sobald solange
sowie falls indem sodass soweit sofern wohingegen
deshalb deswegen daher darum trotzdem dennoch außerdem jedoch allerdings
sonst stattdessen zwar entweder weder

ich du er sie es wir ihr Sie man
mein dein sein ihr unser euer
mich dich ihn uns euch sich
mir dir ihm ihnen
der die das dieser diese dieses jener jene jenes
welcher welche welches wer was wem wen wessen
jeder jede jedes alle beide einige mehrere manche
niemand jemand nichts etwas alles
kein keine
wo woher wohin wann wie warum wieso weshalb
ja nein nicht
""".split())


def norm_id(s):
    return s.lower().replace("ß", "ss").strip()


def better_noun(a, b):
    """b 의 정보로 a 를 보강."""
    if not a.get("plural") and b.get("plural"):
        a["plural"] = b["plural"]
        a["pluralClass"] = b.get("pluralClass", "")
        a["noPlural"] = b.get("noPlural", False)
    if a.get("nDekl") is None and b.get("nDekl") is not None:
        a["nDekl"] = b["nDekl"]
    if not a.get("adjNoun") and b.get("adjNoun"):
        a["adjNoun"] = True
    for k in ("variant", "alt"):
        if not a.get(k) and b.get(k):
            a[k] = b[k]
    return a


def better_verb(a, b):
    for k in ("pres3", "praet", "pp", "aux", "prefix"):
        if not a.get(k) and b.get(k):
            a[k] = b[k]
    for k in ("separable", "reflexive"):
        if b.get(k):
            a[k] = True
    if a.get("irregular") is None and b.get("irregular") is not None:
        a["irregular"] = b["irregular"]
    # 활용 정보가 더 갖춰진 쪽 기준으로 불규칙 재판정
    if b.get("praet") and b.get("pp"):
        a["irregular"] = b.get("irregular", a.get("irregular"))
    return a


POS_RANK = {"noun": 3, "verb": 3, "other": 0}


def merge():
    master = {}
    conflicts = []

    for lv in LEVELS:
        src = os.path.join(OUT, lv + ".json")
        entries = json.load(io.open(src, encoding="utf-8"))
        for e in entries:
            base = norm_id(e["de"])
            if not base:
                continue
            # 명사는 따로 관리한다. das Essen(명사) 과 essen(동사) 은 다른 항목이고,
            # 그렇다고 품사별로 완전히 쪼개면 A1 의 미분류 'other' 동사가
            # B1 의 'verb' 와 못 만난다. 명사/비명사 두 갈래면 충분하다.
            key = ("n:" if e["pos"] == "noun" else "w:") + base
            if key not in master:
                master[key] = e
                continue

            cur = master[key]
            # 레벨 누적
            for l in e["levels"]:
                if l not in cur["levels"]:
                    cur["levels"].append(l)
            # 예문 누적 (중복 제거)
            seen = {x["de"] for x in cur["ex"]}
            for x in e["ex"]:
                if x["de"] not in seen:
                    cur["ex"].append(x)
                    seen.add(x["de"])

            # 품사가 다르면 정보가 많은 쪽 채택 (A1 의 'other' 동사 -> B1 의 'verb')
            if cur["pos"] != e["pos"]:
                if POS_RANK[e["pos"]] > POS_RANK[cur["pos"]]:
                    e["levels"] = cur["levels"]
                    e["ex"] = cur["ex"]
                    master[key] = e
                    cur = e
                else:
                    continue

            if cur["pos"] == "noun":
                if cur["gender"] != e["gender"]:
                    conflicts.append("성 충돌: %s  %s(%s) vs %s(%s)"
                                     % (cur["de"], cur["gender"], "/".join(cur["levels"]),
                                        e["gender"], lv))
                better_noun(cur, e)
            elif cur["pos"] == "verb":
                better_verb(cur, e)

    return master, conflicts


# -en/-ern/-eln 으로 끝나지만 동사가 아닌 것들.
# 독일어 부정형은 거의 다 이 어미라서, 예외만 막으면 나머지는 동사로 봐도 된다.
NON_VERBS = set("""
betrunken bisschen dagegen daneben draußen drin drinnen drüben eben einverstanden
einzeln entschlossen erwachsen geschieden geschlossen gestern gestorben gewesen
hinten innen inzwischen meinetwegen mitten modern morgen oben offen selten
trocken umgezogen unentschieden unten verboten verschieden vorgestern willkommen
zufrieden zusammen übermorgen eigen golden seiden hessen
""".split())

# 추출 부산물 — 표제어가 아닌 조각
JUNK = {"en", "dem österreichischen", "dagegen gewesen", "im Freien"}

RE_COMPARATIVE = re.compile(
    r"^([\wäöüßÄÖÜ]+),\s*([\wäöüßÄÖÜ]+),\s*am\s+([\wäöüßÄÖÜ]+)$"
)


def classify_other(e):
    w = e["de"].strip()
    if w in JUNK:
        return "junk"
    if w.lower() in FUNCTION_WORDS or norm_id(w) in FUNCTION_WORDS:
        return "function"
    # 'gut, besser, am besten' — 원문이 불규칙 비교급을 통째로 준다 (목차 8-2)
    m = RE_COMPARATIVE.match(w)
    if m:
        e["de"] = m.group(1)
        e["comp"] = m.group(2)
        e["sup"] = m.group(3)
        e["irregularComp"] = True
        return "adj"
    # 부정형 어미로 끝나면 동사 — A1 은 활용을 안 주므로 여기서 건져야 한다
    body = re.sub(r"^sich\s+", "", w)
    if (" " not in body and body[:1].islower()
            and re.search(r"(en|ern|eln)$", body)
            and body not in NON_VERBS):
        e["pos"] = "verb"
        e.setdefault("reflexive", w.startswith("sich "))
        for k in ("pres3", "praet", "pp", "aux", "prefix"):
            e.setdefault(k, None)
        for k in ("separable", "irregular"):
            e.setdefault(k, None)
        return "verb"
    return "adj"


def emit(path, varname, rows):
    with io.open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("// 자동 생성 — tools/build.py 가 만듭니다. 직접 고치지 마세요.\n")
        f.write("// A1/A2/B1: Goethe-Zertifikat 공식 Wortliste · B2: Aspekte neu B2 교재 어휘목록.\n")
        f.write("window.%s = [\n" % varname)
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False, sort_keys=True) + ",\n")
        f.write("];\n")


def main():
    master, conflicts = merge()

    nouns, verbs, adjs, funcs = [], [], [], []
    for key in sorted(master):
        e = master[key]
        e["id"] = key[2:]
        e.pop("raw", None)
        e["levels"] = sorted(e["levels"], key=lambda l: LEVEL_RANK[l])
        e["ex"] = e["ex"][:4]                 # 예문은 넉넉히 4개까지
        e["en"] = ""                          # 나중에 채우면 영어 출제가 켜진다
        e["ko"] = ""

        if e["pos"] == "noun":
            nouns.append(e)
            continue
        if e["pos"] == "verb":
            verbs.append(e)
            continue
        kind = classify_other(e)
        if kind == "junk":
            continue
        if kind == "function":
            e["pos"] = "function"
            funcs.append(e)
        elif kind == "verb":
            verbs.append(e)
        else:
            e["pos"] = "adj"
            adjs.append(e)

    if not os.path.isdir(DATA):
        os.makedirs(DATA)
    emit(os.path.join(DATA, "nouns.js"), "NOUNS", nouns)
    emit(os.path.join(DATA, "verbs.js"), "VERBS", verbs)
    emit(os.path.join(DATA, "adjectives.js"), "ADJECTIVES", adjs)
    emit(os.path.join(DATA, "functionwords.js"), "FUNCTIONWORDS", funcs)

    # 통계
    print("통합 결과")
    print("  명사      %5d" % len(nouns))
    print("  동사      %5d" % len(verbs))
    print("  형용사/부사 %5d" % len(adjs))
    print("  기능어    %5d" % len(funcs))
    print("  합계      %5d" % (len(nouns) + len(verbs) + len(adjs) + len(funcs)))

    npl = sum(1 for n in nouns if n.get("plural"))
    print("\n명사 복수형 확보  %d / %d  (%.0f%%)" % (npl, len(nouns), 100.0 * npl / max(1, len(nouns))))
    v3 = sum(1 for v in verbs if v.get("praet") and v.get("pp"))
    vpp = sum(1 for v in verbs if v.get("pp"))
    print("동사 완료형 확보  %d / %d  (%.0f%%)" % (vpp, len(verbs), 100.0 * vpp / max(1, len(verbs))))
    print("동사 3요형 완비   %d / %d  (%.0f%%)" % (v3, len(verbs), 100.0 * v3 / max(1, len(verbs))))
    nex = sum(1 for e in nouns + verbs + adjs + funcs if e["ex"])
    tot = len(nouns) + len(verbs) + len(adjs) + len(funcs)
    print("예문 보유         %d / %d  (%.0f%%)" % (nex, tot, 100.0 * nex / max(1, tot)))

    if conflicts:
        dest = os.path.join(OUT, "conflicts.txt")
        with io.open(dest, "w", encoding="utf-8") as f:
            f.write("\n".join(conflicts))
        print("\n성 충돌 %d 건 -> %s" % (len(conflicts), dest))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
