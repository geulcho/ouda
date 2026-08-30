# -*- coding: utf-8 -*-
"""
중간 TSV -> 구조화 엔트리 (JSON)

하는 일
  1) 여러 줄에 걸친 표제어를 하나의 엔트리로 합친다
     (동사 활용 나열, 하이픈 줄바꿈 등)
  2) 품사 판별: 명사 / 동사 / 그 외
  3) 명사: 성 + 복수형 계산 (움라우트 규칙 포함)
     동사: 3요형 + haben/sein + 분리동사 + 재귀 판별
  4) 확신 못 한 것은 review 목록으로 뽑는다

출력: tools/out/<level>.json
"""
import io
import json
import os
import re
import sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")

ARTICLE_GENDER = {"der": "m", "die": "f", "das": "n"}

# A1 PDF 는 움라우트 표시(¨)를 Ä/ä 로 내보낸다. A2/B1 은 ¨ 를 쓴다.
UMLAUT_MARK = "¨"


# Aspekte 교재는 표제어 앞에 과제 번호를 붙인다: "1b die Vorstellung, -en"
TASK_NO = re.compile(r"^\d+\s*[a-z]?\s+(?=[A-Za-zÄÖÜäöü(])")


def norm_head(s):
    """표제어 원문 정규화."""
    s = s.replace("–", "-").replace("—", "-")      # en/em dash -> hyphen
    s = TASK_NO.sub("", s.strip())
    # Aspekte 는 움라우트 표시로 ASCII 따옴표를 쓴다: der Abstand, "-e
    s = re.sub(r'(?<=,\s)"(?=-)', UMLAUT_MARK, s)
    s = re.sub(r'(?<=,)"(?=-)', UMLAUT_MARK, s)
    s = s.replace("„", '"').replace("“", '"')
    s = re.sub(r"\s+", " ", s).strip()
    # A1 은 움라우트 표시를 '¨' 가 아니라 '움라우트된 모음 자체' 로 쓴다.
    #   das Buch, -ü, er   das Haus, -ä, er   der Apfel, -Ä
    # 하이픈 바로 뒤에 단독으로 온 ä/ö/ü 만 ¨ 로 통일한다. (A2/B1 은 이미 ¨)
    s = re.sub(r"(?<=-)[äöüÄÖÜ](?=$|[,\s])", UMLAUT_MARK, s)
    s = s.replace(",-", ", -")                                # "Ausbildung,-en"
    s = re.sub(r"\s+", " ", s).strip()
    return s


def looks_like_noun(h):
    return bool(re.match(r"^(der|die|das)\s+\S", h))


# 'ist/hat gefahren' 처럼 조동사를 둘 다 쓰는 동사가 있다
RE_AUX = r"(?:hat|ist|haben|sind)(?:/(?:hat|ist))?"


def has_perfect(h):
    return bool(re.search(r"(^|[,\s])" + RE_AUX + r"\s+\S", h))


def looks_like_verb(h):
    if has_perfect(h):
        return True
    # 완료형이 아직 안 붙었어도 '부정형, 활용형…' 나열이면 동사다.
    # 부정형 어미(-en/-ern/-eln)를 요구해야 'an, auf, in' 같은 전치사 나열을
    # 동사로 오인하지 않는다.
    return bool(re.match(r"^\(?(sich\s+)?[a-zäöüß]{2,}(en|ern|eln)\)?\s*,\s*\(?[a-zäöüß]", h))


def continues(buf, line):
    """buf(지금까지 모은 표제어)에 line 이 이어붙는가?"""
    if not buf:
        return False
    p = buf.strip()

    # 괄호가 열린 채 끝났으면 다음 줄이 무엇이든 이어진다.
    # 이 검사가 관사 검사보다 앞서야 한다 — 용례 괄호 안에도 관사가 나온다.
    #   "das Gegenüber, - (Sprechen Sie mit Ihrem" + "Gegenüber.)"
    #   "... (Erzählen Sie" + "die Geschichte?)"
    if p.count("(") > p.count(")"):
        return True

    # 새 표제어가 관사로 시작하면 항상 새 엔트리
    if looks_like_noun(line):
        return False

    if looks_like_noun(p):
        # 명사: "die Diskothek, -en/Disko," 처럼 쉼표/슬래시로 끝나면 이어짐
        if p.endswith(",") or p.endswith("/"):
            return True
        # "der Anruf-" 처럼 하이픈이 글자에 붙어 끝나면 줄바꿈 하이픈
        if re.search(r"\w-$", p):
            return True
        # 복수 표기가 줄 끝에서 잘린 경우:
        #   "der Zeitpunkt, -"  +  "e"   ->  "der Zeitpunkt, -e"
        # 'der Betreuer, -' (무변화) 와 헷갈리므로, 다음 줄이 복수 어미로
        # 쓰이는 짧은 소문자 조각일 때만 이어붙인다.
        if re.search(r"[-¨]$", p) and re.match(r"^(e|en|er|n|s|se|nen|innen)$", line):
            return True
        return False

    # 동사류: 쉼표로 끝나면 활용형이 더 남았다.
    # 끝의 하이픈/슬래시는 여기선 이어짐 신호가 아니다 —
    # B1 에는 'Bio-' 'Haupt-' 'gesamt-/Gesamt-' 같은 접두어 표제어가 따로 있다.
    if p.endswith(","):
        return True
    # 'fahren, fährt, fuhr, ist/hat' — 조동사만 나오고 과거분사가 다음 줄로 넘어간 경우
    if re.search(r"(^|[\s,])(hat|ist)(/(hat|ist))?(\s+sich)?$", p):
        return True
    # 활용 나열을 시작했는데 아직 완료형이 안 나왔으면 이어짐
    if looks_like_verb(p) and not has_perfect(p):
        return True
    return False


def join_head(buf, line):
    if re.search(r"\w-$", buf):          # 줄바꿈 하이픈은 붙여서 이어준다
        return buf[:-1] + line
    return buf + " " + line


# ---------------------------------------------------------------- 복수형

VOWELS = ["au", "a", "o", "u"]


def umlaut(stem):
    """
    마지막 a/o/u/au 에 움라우트. Apfel->Äpfel, Arbeitsplatz->Arbeitsplätz, Haus->Häus

    끝 위치가 같으면 긴 쪽(au)을 택해야 한다.
    'Haus' 에서 'u' 를 잡으면 Haüs 가 되고, 'au' 를 잡아야 Häus 가 된다.
    """
    low = stem.lower()
    best_i, best_v, best_end = -1, None, -1
    for v in VOWELS:
        i = low.rfind(v)
        if i < 0:
            continue
        end = i + len(v)
        if end > best_end or (end == best_end and len(v) > len(best_v)):
            best_i, best_v, best_end = i, v, end
    if best_i < 0:
        return stem, False
    rep = {"au": "äu", "a": "ä", "o": "ö", "u": "ü"}[best_v]
    if stem[best_i].isupper():
        rep = rep[0].upper() + rep[1:]
    return stem[:best_i] + rep + stem[best_i + len(best_v):], True


def make_plural(stem, marker):
    """
    marker 예: '-n' '-en' '-e' '-er' '-s' '-se' '-nen' '-' '¨' '¨-e' '-¨' '-¨, e' '¨-er'
               'Museen'(완전형) '-n (A)'(지역 표기)
    반환: (복수형 or None, 복수형클래스, 확신여부)
    """
    m = marker.strip()
    if not m:
        return None, "", False

    # 지역 변이 표기 제거: '-n (A)', '-e (A: ¨-e)', '- (D, CH)'
    m = re.sub(r"\s*\([^)]*\)\s*$", "", m).strip()
    m = m.rstrip(";").strip()
    if not m:
        return None, marker, False

    # 완전한 복수형이 그대로 적힌 경우 (라틴/그리스계 차용어)
    #   die Daten / Museen / Praktika / Themen / -Lexika / Säle
    bare = m.lstrip("-").strip()
    bare = re.sub(r"^(der|die|das)\s+", "", bare)
    if bare and bare[0].isupper() and re.match(r"^[\wäöüßÄÖÜ]+$", bare):
        return bare, "형태제시", True

    m = m.replace(" ", "")
    has_uml = UMLAUT_MARK in m
    suffix = m.replace(UMLAUT_MARK, "").replace("-", "").replace(",", "")

    if not has_uml and not suffix:
        # '-' 또는 '–' : 무변화
        return stem, "-", True

    base = stem
    if has_uml:
        base, ok = umlaut(stem)
        if not ok:
            return None, m, False

    if suffix and not re.match(r"^[a-zäöüß]+$", suffix):
        return None, m, False

    # 어간이 -e 로 끝나는데 접미어가 -en 이면 e 가 겹친다.
    # (Goethe 목록은 die Adresse 를 '-n' 이라 쓰기도, '-en' 이라 쓰기도 한다)
    if suffix.startswith("e") and base.endswith("e"):
        suffix = suffix[1:]

    cls = (UMLAUT_MARK if has_uml else "") + ("-" + suffix if suffix else "-")
    return base + suffix, cls, True


# 형용사·분사에서 온 명사 (목차 8-3). 관사에 따라 어미가 바뀐다:
#   der Erwachsene / ein Erwachsener / den Erwachsenen
ADJ_NOUNS = set("""
Angestellte Angestellter Arbeitslose Bekannte Beamte Deutsche Erwachsene
Fremde Gefangene Jugendliche Kranke Reisende Selbstständige Studierende
Verletzte Verlobte Verwandte Vorgesetzte Weiße Abgeordnete Alte Blinde
Freiwillige Heilige Kleine Tote Behinderte Auszubildende
""".split())

# n-변화(약변화) 명사 — 1격 단수를 뺀 모든 격에서 -n/-en 이 붙는다 (목차 17-4).
# 어미 규칙으로 잡히지 않는 것들은 명단으로 둔다.
N_DEKL_WORDS = set("""
Herr Mensch Held Bär Bauer Nachbar Typ Bub Fürst Graf Prinz Christ Narr Hirt
Ahn Architekt Nachkomme Vorfahre Buchstabe Gedanke Wille Glaube Funke Same
""".split())

# 어미로 잡히는 것들 (전부 남성)
N_DEKL_SUFFIX = re.compile(
    r"(ent|ant|ist|at|graf|soph|arch|krat|log|nom|et|it|ot|and|urg)$"
)

# -or 로 끝나는 남성명사는 복수가 -en 이라 헷갈리지만 n-변화가 아니다.
#   der Professor / des Professors / den Professor   (복수만 Professoren)
NOT_N_DEKL_SUFFIX = re.compile(r"(or|eur|ier)$")

# 복수가 -n/-en 이지만 n-변화가 아닌 것들 (2격에 -s 가 붙는 평범한 명사)
#   der Schmerz / des Schmerzes / den Schmerz
NOT_N_DEKL_WORDS = set("""
Fleck Friede Muskel Nerv Schmerz Staat See Strahl Zins Bauch Lorbeer Vetter
Stachel Pantoffel Bett Auge Ohr Hemd Ende Interesse Herz
""".split())


def judge_n_dekl(gender, word, plural):
    """True / False / None(확신 못 함 -> 검수)"""
    if gender != "m":
        return False
    if word in NOT_N_DEKL_WORDS:
        return False
    if word in N_DEKL_WORDS:
        return True
    if NOT_N_DEKL_SUFFIX.search(word):
        return False
    # 복수가 -n/-en 이 아니면 n-변화일 수 없다
    if plural not in (word + "n", word + "en"):
        return False
    if word.endswith("e"):          # der Junge, der Kunde, der Kollege
        return True
    if N_DEKL_SUFFIX.search(word):  # der Student, der Kandidat, der Polizist
        return True
    return None


# 이 접미어를 가진 여성명사는 예외 없이 복수가 -en 이다
FEM_EN_PLURAL = re.compile(r"(ung|heit|keit|schaft|ion|tät|ei|ik)$")

NOUN_RE = re.compile(
    r"^(der|die|das)\s+"
    r"([A-ZÄÖÜ][\wäöüßÄÖÜ-]*(?:\s+[a-zäöüß][\wäöüß]*)?)"   # 'Pommes frites' 같은 복합 표제어
    r"\s*(?:,\s*(.*))?$"
)


RE_PLURAL_ONLY = re.compile(r"\((nur\s+)?(pl|Pl)(ural)?\.?\)")
RE_SING_ONLY = re.compile(r"\((Sg|Sing|Singular)\.?\)")
RE_REGION = re.compile(r"\(\s*(D|A|CH)(\s*,\s*(D|A|CH))*\s*\)")


def parse_noun(h):
    """
    괄호가 여러 뜻으로 쓰이므로 벗기는 순서가 중요하다.
      ① →  뒤의 지역 대응어      "das Eis (D, A) →CH: Glace"
      ② 수 표기                  "(Pl.)" "(nur Pl.)" "(Sg.)"
      ③ 지역 표기                "(A)" "(D, CH)"
      ④ 선택적 구성요소          "die (E-)Mail" "das (Fahr)Rad"
    ④ 를 먼저 하면 (A) 가 단어로 둔갑한다.
    """
    note = []

    # ① 지역 대응어
    variant = None
    mv = re.search(r"→\s*(.*)$", h)
    if mv:
        variant = mv.group(1).strip() or None
        h = h[: mv.start()].strip().rstrip(",;").strip()

    # ② 수 표기
    plural_only = bool(RE_PLURAL_ONLY.search(h))
    singular_only = bool(RE_SING_ONLY.search(h))
    h = RE_PLURAL_ONLY.sub("", h)
    h = RE_SING_ONLY.sub("", h)

    # ③ 지역 표기
    h = RE_REGION.sub("", h)
    h = re.sub(r"\s+", " ", h).strip().rstrip(",;").strip()

    # ④ 선택적 구성요소 — 괄호 안은 빼고 기본형을 표제어로, 합성형은 이형태로
    alt = None
    mo = re.match(r"^(der|die|das)\s+\(([\w-]+)\)\s*([\wäöüßÄÖÜ-]+)(.*)$", h)
    if mo:
        alt = mo.group(2).rstrip("-") + mo.group(3)
        h = "%s %s%s" % (mo.group(1), mo.group(3), mo.group(4))

    # 이형태 "die Diskothek, -en/Disko, -s" -> 주표제어만
    if "/" in h:
        parts = h.split("/", 1)
        alt = alt or parts[1].strip()
        h = parts[0].strip()

    m = NOUN_RE.match(h)
    if not m:
        return None, ["명사 형태 파싱 실패"]

    art, word, marker = m.group(1), m.group(2), (m.group(3) or "")
    gender = ARTICLE_GENDER[art]

    # 원문이 여성형 짝을 'die Kursleiter, -nen' 처럼 -in 을 빼고 적는 경우가 있다.
    # -nen 복수는 -in 으로 끝나는 명사에만 붙으므로 되살릴 수 있다.
    if gender == "f" and marker.strip().startswith("-nen") and not word.endswith("in"):
        word += "in"

    entry = {
        "pos": "noun",
        "de": word,
        "gender": gender,
        "pluralOnly": plural_only,
        "noPlural": False,
        "adjNoun": False,
        "variant": variant,
        "alt": alt,
    }

    if plural_only:
        entry["plural"] = word
        entry["pluralClass"] = "pl."
    elif singular_only:
        entry["plural"] = None
        entry["pluralClass"] = "Sg."
        entry["noPlural"] = True
    elif marker:
        pl, cls, ok = make_plural(word, marker)
        entry["plural"] = pl
        entry["pluralClass"] = cls
        if not ok:
            note.append("복수 표기 해석 실패: %r" % marker)
    elif FEM_EN_PLURAL.search(word) and gender == "f":
        # -ung / -heit / -keit / -schaft / -ion / -tät 는 예외 없이 복수가 -en 이다.
        # 원문이 표기를 빼먹었어도 이건 규칙으로 확정할 수 있다.
        entry["plural"] = word + "en"
        entry["pluralClass"] = "-en"
    else:
        entry["plural"] = None
        entry["pluralClass"] = ""
        entry["noPlural"] = True
        note.append("복수 표기 없음 (무복수/불명)")

    # 2격 단수 어미
    if gender == "f":
        entry["genSg"] = ""
    elif re.search(r"(s|ß|x|z|sch|st)$", word):
        entry["genSg"] = "es"
    else:
        entry["genSg"] = "s"

    # 형용사변화 명사 (der Erwachsene / ein Erwachsener).
    # 규칙으로 추정하면 'die Adresse' 같은 평범한 -e 명사가 전부 걸린다.
    # 실제로는 A1~B1 범위에 손에 꼽으므로 명단으로 판정한다.
    if word in ADJ_NOUNS:
        entry["adjNoun"] = True

    entry["nDekl"] = judge_n_dekl(gender, word, entry.get("plural"))
    if entry["nDekl"] is None:
        note.append("n-변화 여부 확인 필요")

    return entry, note


# ---------------------------------------------------------------- 동사

# 분리 접두어 (강세가 접두어에 있어 문장 끝으로 떨어진다).
# be- / emp- / ent- / er- / ge- / miss- / ver- / zer- 는 비분리라 여기 없다.
SEPARABLE_PREFIXES = set("""
ab an auf aus bei da dabei damit daran davon dazu durch ein empor entgegen
entlang fern fest fort frei gegenüber gleich heim her herab heran herauf heraus
herbei herein herum herunter hervor hin hinab hinauf hinaus hinein hinter hinunter
hinzu hoch kaputt los mit nach nieder statt teil um umher unter vor voran vorbei
vorüber weg weiter wieder zu zurecht zurück zusammen
""".split())


def parse_verb(h, level=None):
    """
    3요형을 몇 개 주느냐가 자료마다 다르다.
      Goethe A2  denken, denkt, hat gedacht          가운데가 '현재 3인칭'
      Goethe B1  diskutieren, diskutiert, diskutierte, hat diskutiert   넷 다
      Aspekte B2 bedenken, bedachte, hat bedacht     가운데가 '과거'
    형태만 보고는 hielt(과거) 와 hält(현재) 를 못 가르므로 레벨로 판단한다.
    """
    note = []
    reflexive = bool(re.match(r"^\(?sich\)?\s", h))
    h_clean = re.sub(r"^\(sich\)\s*", "", h)

    parts = [p.strip() for p in h_clean.split(",") if p.strip()]
    if not parts:
        return None, ["동사 파싱 실패"]

    inf = parts[0]
    if inf.startswith("sich "):
        reflexive = True
        inf = inf[5:].strip()

    entry = {
        "pos": "verb",
        "de": inf,
        "reflexive": reflexive,
        "pres3": None,
        "praet": None,
        "pp": None,
        "aux": None,
        "separable": False,
        "prefix": None,
        "irregular": None,
    }

    rest = parts[1:]
    # 완료형은 나열의 '마지막' hat/ist 항목이다.
    # 첫 번째를 잡으면 'sein, ist, war, ist gewesen' 에서 현재형 ist 를 완료형으로 오인한다.
    perf = None
    perf_i = -1
    for i, p in enumerate(rest):
        if re.match(r"^(hat|ist)(/(hat|ist))?\b", p):
            perf, perf_i = p, i
    if perf:
        rest = rest[:perf_i]
        toks = perf.split()
        # 'ist/hat gefahren' 처럼 두 조동사를 다 쓰는 동사가 있다
        head_tok = toks[0]
        if "/" in head_tok:
            entry["aux"] = "haben/sein"
        else:
            entry["aux"] = "haben" if head_tok == "hat" else "sein"
        pp = " ".join(t for t in toks[1:] if t != "sich").strip()
        # 'gemusst (hat müssen)' 처럼 괄호로 보충 설명이 붙는 경우가 있다
        pp = re.sub(r"\s*\(.*$", "", pp).strip()
        entry["pp"] = pp or None

    rest = [re.sub(r"\bsich\b", "", p).strip() for p in rest]
    rest = [p for p in rest if p]
    if len(rest) >= 2:
        entry["pres3"], entry["praet"] = rest[0], rest[1]
    elif len(rest) == 1:
        # 하나뿐이면 자료에 따라 현재형이거나 과거형이다
        if level == "B2":
            entry["praet"] = rest[0]
        else:
            entry["pres3"] = rest[0]

    # 'einverstanden sein' 처럼 부가어를 달고 다니는 복합 표현은
    # 활용형 전체에 같은 낱말이 붙어 나온다. 그걸 부정형 앞에 되돌려 준다.
    # (안 그러면 표제어가 'sein' 이 되어 진짜 sein 동사와 충돌한다)
    forms = [f for f in (entry["pres3"], entry["praet"], entry["pp"]) if f]
    if len(forms) >= 2:
        commons = set(forms[0].split())
        for f in forms[1:]:
            commons &= set(f.split())
        commons -= {"hat", "ist", "sich", inf}
        commons = {c for c in commons if not c.startswith(inf[:3])}
        if len(commons) == 1:
            extra = commons.pop()
            entry["de"] = extra + " " + inf
            for k in ("pres3", "praet", "pp"):
                if entry[k]:
                    entry[k] = " ".join(t for t in entry[k].split() if t != extra)

    # 분리동사 판정.
    # 가장 확실한 신호는 3인칭형이 "räumt auf" 처럼 떨어져 있는 것.
    # 과거분사 안쪽의 ge 는 신호가 약하다 — betrogen / vergessen 도 걸려버린다.
    # 그래서 접두어가 실제 분리 접두어 목록에 있을 때만 인정한다.
    if entry["pres3"] and " " in entry["pres3"]:
        entry["separable"] = True
        entry["prefix"] = entry["pres3"].split()[-1]
    elif entry["pp"] and re.search(r"^\w+ge\w", entry["pp"]) and not entry["pp"].startswith("ge"):
        i = entry["pp"].find("ge")
        cand = entry["pp"][:i]
        if cand in SEPARABLE_PREFIXES:
            entry["separable"] = True
            entry["prefix"] = cand

    # 접두어가 표제어 앞에 실제로 붙어 있어야 분리동사다.
    # 'herunter' 처럼 접두어 자체가 표제어인 항목이 걸리는 걸 막는다.
    if entry["separable"]:
        pref = entry["prefix"] or ""
        if (not pref or not inf.startswith(pref) or len(inf) <= len(pref) + 2
                or not re.search(r"(en|ern|eln)$", inf)):
            entry["separable"] = False
            entry["prefix"] = None

    # 불규칙 판정 — 세 군데 중 하나라도 약변화 규칙을 벗어나면 불규칙
    #   ① 현재 3인칭 모음변화 (fahren -> fährt)
    #   ② 과거가 -te 로 끝나지 않음 (bestehen -> bestand)
    #   ③ 과거분사가 -en 으로 끝남 (besitzen -> besessen)
    if entry["pres3"] or entry["praet"] or entry["pp"]:
        stem = re.sub(r"(en|ern|eln|n)$", "", inf)
        if entry["separable"] and entry["prefix"]:
            stem = re.sub(r"^" + re.escape(entry["prefix"]), "", stem)

        irr = False
        if entry["pres3"]:
            p3stem = re.sub(r"t$", "", entry["pres3"].split()[0])
            if entry["separable"] and entry["prefix"]:
                p3stem = re.sub(r"^" + re.escape(entry["prefix"]), "", p3stem)
            irr = irr or p3stem not in (stem, stem + "e")
        if entry["praet"]:
            irr = irr or not entry["praet"].split()[0].endswith("te")
        if entry["pp"]:
            irr = irr or entry["pp"].split()[-1].endswith("en")
        entry["irregular"] = irr

    if not entry["pp"]:
        note.append("완료형 없음 (상위 레벨에서 병합 필요)")
    return entry, note


# ---------------------------------------------------------------- Aspekte 표기

# 문법 표시로 쓰는 괄호 — 용례가 아니다
GRAM_PAREN = re.compile(
    r"^(Sg|Sing|Singular|pl|Pl|Plural|nur Pl|D|A|CH|D, A|D, CH|A, CH|D, A, CH)\.?$"
)

# 전치사격 지배: "(von + D.)" "(für + A.)" "(nach + D.)"
PREP_GOV = re.compile(r"^([a-zäöü]+)\s*\+\s*([ADG])\.?$")

# 남녀 쌍: "der/die Begleiter/in, -/-nen"  "der/die Einwanderer/Einwanderin, -/-nen"
GENDER_PAIR = re.compile(
    r"^der/die\s+([A-ZÄÖÜ][\wäöüßÄÖÜ-]*?)/([\wäöüßÄÖÜ-]+)\s*,\s*([^/]*)/(.*)$"
)


def split_parens(h):
    """
    Aspekte 는 괄호에 세 가지를 섞어 넣는다.
      (Sg.)              수 표기       -> 그대로 남긴다
      (von + D.)         전치사격 지배 -> 따로 뽑는다
      (Kontakte knüpfen) 용례          -> 예문으로 쓴다

    (sich) 는 재귀 표시라 버리지 않고 'sich ' 를 앞에 붙여 돌려준다.

    반환: (괄호를 걷어낸 표제어, 예문 목록, 전치사격 {prep, case} 또는 None)
    """
    uses, gov, refl = [], None, False
    depth, buf, out = 0, "", ""
    for ch in h:
        if ch == "(":
            depth += 1
            if depth == 1:
                buf = ""
                continue
        if ch == ")" and depth > 0:
            depth -= 1
            if depth == 0:
                inner = buf.strip()
                m = PREP_GOV.match(inner)
                if GRAM_PAREN.match(inner):
                    out += "(" + inner + ")"          # 수 표기는 파서가 봐야 한다
                elif m:
                    gov = {"prep": m.group(1), "case": m.group(2)}
                elif inner == "sich":
                    refl = True                       # 'benehmen (sich)' = 재귀동사
                elif " " in inner and len(inner) > 6:
                    uses.append(inner)                # 용례
                # 그 밖(짧은 조각)은 버린다
                continue
        if depth == 0:
            out += ch
        else:
            buf += ch
    out = re.sub(r"\s+", " ", out)
    out = re.sub(r"\s+([,;])", r"\1", out)     # 괄호를 뺀 자리에 남는 " ," 정리
    out = re.sub(r",\s*,", ",", out)
    out = out.strip().rstrip(",").strip()
    if refl and not out.startswith('sich '):
        out = 'sich ' + out            # 기존 동사 파서가 알아보는 형태로
    return out, uses, gov


def split_gender_pair(h):
    """
    'der/die Begleiter/in, -/-nen' -> ['der Begleiter, -', 'die Begleiterin, -nen']
    남녀 두 낱말을 다 실어야 실제로 쓸 수 있다.
    """
    m = GENDER_PAIR.match(h)
    if not m:
        return None
    stem, fem, mpl, fpl = m.group(1), m.group(2), m.group(3).strip(), m.group(4).strip()
    # 'Begleiter/in' 은 어간 + in, 'Einwanderer/Einwanderin' 은 통째로 적혀 있다
    femword = fem if fem[:1].isupper() else stem + fem
    return [
        "der %s, %s" % (stem, mpl or "-"),
        "die %s, %s" % (femword, fpl or "-nen"),
    ]


# ---------------------------------------------------------------- 예문

SENSE_RE = re.compile(r"(?:^|\s)(\d)\.\s")


# 문장 끝처럼 보이지만 아닌 것들 — 여기서 자르면 안 된다
ABBREV = re.compile(r"(?:\b[A-Za-z]|z\. ?B|bzw|usw|etc|Nr|Dr|Hr|Fr|St|ca|Abb|vgl)\.$")


def split_sentences(text):
    """
    한 예문 칸에 여러 문장이 들어 있는 경우가 많다.
    Cloze 문제로 쓰려면 문장 하나씩 떼어야 한다.
    """
    parts = re.split(r"(?<=[.!?])\s+(?=[A-ZÄÖÜ„])", text)
    out, buf = [], ""
    for p in parts:
        cand = (buf + " " + p).strip() if buf else p
        # 'z. B.' 같은 약어 뒤에서 잘렸으면 도로 붙인다
        if ABBREV.search(cand):
            buf = cand
            continue
        buf = ""
        out.append(cand)
    if buf:
        out.append(buf)
    return [s.strip() for s in out if len(s.strip()) > 3]


def split_senses(text):
    """'1. Aaa 2. Bbb' -> ['Aaa','Bbb'] / 번호 없으면 문장 단위로 쪼갠다"""
    text = re.sub(r"(\w)-\s+(\w)", r"\1\2", text)   # 줄바꿈 하이픈 복원
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    hits = list(SENSE_RE.finditer(text))
    if len(hits) < 2:
        return split_sentences(re.sub(r"^\d\.\s*", "", text).strip())
    out = []
    for i, m in enumerate(hits):
        s = m.end()
        e = hits[i + 1].start() if i + 1 < len(hits) else len(text)
        seg = text[s:e].strip()
        # 어의 하나 안에 문장이 여럿이면 첫 문장만 쓴다 (어의 대표 예문)
        out += split_sentences(seg)[:2]
    return out


# ---------------------------------------------------------------- 메인

def parse_level(level):
    src = os.path.join(OUT, level + ".tsv")
    rows = []
    with io.open(src, encoding="utf-8") as f:
        next(f)
        for line in f:
            p = line.rstrip("\n").split("\t")
            if len(p) < 4:
                p += [""] * (4 - len(p))
            rows.append((p[0], int(p[1]), p[2], p[3]))

    # 1) 여러 줄 표제어 병합
    groups = []
    for _lv, pg, head, ex in rows:
        head = norm_head(head)
        if head:
            if groups and continues(groups[-1]["head"], head):
                groups[-1]["head"] = join_head(groups[-1]["head"], head)
                if ex:
                    groups[-1]["ex"].append(ex)
            else:
                groups.append({"head": head, "ex": [ex] if ex else [], "page": pg})
        else:
            if groups and ex:
                groups[-1]["ex"].append(ex)

    # 2) 품사 판별 + 파싱
    entries, review = [], []
    for g in groups:
        h = g["head"]
        extext = " ".join(g["ex"])
        senses = split_senses(extext)

        # Aspekte: 괄호 안의 용례·전치사격 지배를 먼저 걷어낸다
        h, uses, gov = split_parens(h)
        senses = senses + uses
        if not h:
            continue

        # Aspekte: 'der/die Begleiter/in, -/-nen' 은 두 낱말이다
        pair = split_gender_pair(h)
        if pair:
            for one in pair:
                e2, n2 = parse_noun(one)
                if e2 is None:
                    review.append((level, g["page"], one, "; ".join(n2)))
                    continue
                e2["raw"] = one
                e2["levels"] = [level]
                e2["ex"] = [{"de": x, "lvl": level} for x in senses]
                entries.append(e2)
                if n2:
                    review.append((level, g["page"], one, "; ".join(n2)))
            continue

        if looks_like_noun(h):
            e, note = parse_noun(h)
        elif looks_like_verb(h):
            e, note = parse_verb(h, level)
        else:
            e, note = {"pos": "other", "de": h}, []

        if e is None:
            review.append((level, g["page"], h, "; ".join(note)))
            continue

        e["raw"] = h
        e["levels"] = [level]
        e["ex"] = [{"de": s, "lvl": level} for s in senses]
        if gov:
            e["gov"] = gov          # 형용사·동사의 전치사격 지배 (Aspekte 가 준다)
        entries.append(e)
        if note:
            review.append((level, g["page"], h, "; ".join(note)))

    dest = os.path.join(OUT, level + ".json")
    with io.open(dest, "w", encoding="utf-8") as f:
        f.write(json.dumps(entries, ensure_ascii=False, indent=1))

    counts = {}
    for e in entries:
        counts[e["pos"]] = counts.get(e["pos"], 0) + 1
    print("%s: %d entries %s | review %d -> %s" % (level, len(entries), counts, len(review), dest))
    return review


def main():
    allrev = []
    for lv in ["A1", "A2", "B1", "B2"]:
        allrev += parse_level(lv)
    dest = os.path.join(OUT, "review.txt")
    with io.open(dest, "w", encoding="utf-8") as f:
        f.write("검수 필요 항목 (%d건)\n" % len(allrev))
        f.write("레벨\t쪽\t표제어\t사유\n")
        for r in allrev:
            f.write("%s\t%d\t%s\t%s\n" % r)
    print("review -> %s (%d)" % (dest, len(allrev)))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
