/*
 * declension.js — 관사 · 명사 · 형용사 격변화 생성 엔진
 *
 * 표를 데이터로 저장하지 않고 규칙으로 만든다.
 * 명사 하나를 추가할 때 {성, 복수형, 2격어미, n변화여부} 만 있으면 되도록.
 *
 * 이 파일이 틀리면 틀린 표로 외우게 되므로, tests.js 의 기준 케이스로 검증한다.
 */
(function (global) {
  'use strict';

  // 격 — 사용자가 요청한 표기. 순서는 설정에서 바꿀 수 있다.
  var CASES = {
    nom: { key: 'nom', de: 'Nominativ', abbr: 'Nom.', ko: '주격', particle: '-은/는' },
    gen: { key: 'gen', de: 'Genitiv',   abbr: 'Gen.', ko: '소유격', particle: '-의' },
    dat: { key: 'dat', de: 'Dativ',     abbr: 'Dat.', ko: '여격', particle: '-에게' },
    akk: { key: 'akk', de: 'Akkusativ', abbr: 'Akk.', ko: '목적격', particle: '-을/를' }
  };

  var ORDER_KO = ['nom', 'gen', 'dat', 'akk'];   // 주격-소유격-여격-목적격
  var ORDER_DE = ['nom', 'akk', 'dat', 'gen'];   // 독일 교재식

  // ---------------------------------------------------------------- 관사

  var DEFINITE = {
    m:  { nom: 'der', gen: 'des', dat: 'dem', akk: 'den' },
    f:  { nom: 'die', gen: 'der', dat: 'der', akk: 'die' },
    n:  { nom: 'das', gen: 'des', dat: 'dem', akk: 'das' },
    pl: { nom: 'die', gen: 'der', dat: 'den', akk: 'die' }
  };

  // ein / kein / mein / dein / sein / ihr / unser / euer / Ihr — 어미가 전부 같다
  var EIN_ENDINGS = {
    m:  { nom: '',  gen: 'es', dat: 'em', akk: 'en' },
    f:  { nom: 'e', gen: 'er', dat: 'er', akk: 'e'  },
    n:  { nom: '',  gen: 'es', dat: 'em', akk: ''   },
    pl: { nom: 'e', gen: 'er', dat: 'en', akk: 'e'  }
  };

  // 관사 종류. stem 이 null 이면 관사 없음(0-Artikel).
  var ARTICLE_KINDS = {
    definite:   { label: '정관사',   sub: 'bestimmter Artikel',   type: 'def',  stem: null },
    indefinite: { label: '부정관사', sub: 'unbestimmter Artikel', type: 'ein',  stem: 'ein', noPlural: true },
    kein:       { label: '부정 kein', sub: 'Negationsartikel',    type: 'ein',  stem: 'kein' },
    mein:       { label: '소유관사 mein', sub: 'Possessivartikel', type: 'ein', stem: 'mein' },
    dein:       { label: '소유관사 dein', sub: 'Possessivartikel', type: 'ein', stem: 'dein' },
    sein:       { label: '소유관사 sein', sub: 'Possessivartikel', type: 'ein', stem: 'sein' },
    ihr:        { label: '소유관사 ihr',  sub: 'Possessivartikel', type: 'ein', stem: 'ihr' },
    unser:      { label: '소유관사 unser', sub: 'Possessivartikel', type: 'ein', stem: 'unser' },
    euer:       { label: '소유관사 euer', sub: 'Possessivartikel', type: 'ein', stem: 'euer' },
    none:       { label: '무관사',   sub: '0-Artikel',            type: 'none', stem: null }
  };

  /**
   * 관사 형태 하나.
   * @returns 문자열, 또는 형태가 없으면 null (ein 의 복수형)
   */
  function article(kind, gender, kase) {
    var k = ARTICLE_KINDS[kind];
    if (!k) throw new Error('알 수 없는 관사 종류: ' + kind);
    if (k.type === 'none') return '';
    if (k.type === 'def') return DEFINITE[gender][kase];
    if (gender === 'pl' && k.noPlural) return null;   // ein 은 복수가 없다

    var stem = k.stem;
    var ending = EIN_ENDINGS[gender][kase];
    // euer + er/es/em/en -> eure / euer / eurem …  (e 탈락)
    if (stem === 'euer' && ending) stem = 'eur';
    return stem + ending;
  }

  // ---------------------------------------------------------------- 명사

  function endsWithAny(s, list) {
    for (var i = 0; i < list.length; i++) {
      if (s.slice(-list[i].length) === list[i]) return true;
    }
    return false;
  }

  /** 형용사변화 명사의 어간: 'Erwachsene' -> 'Erwachsen' */
  function adjNounStem(word) {
    return word.replace(/e$/, '');
  }

  /**
   * 명사 자체의 격변화형. 관사만 외우면 반쪽이다.
   *   2격 단수 m/n : +s / +es          des Apfels, des Kindes
   *   3격 복수     : +n                den Äpfeln  (단, -n/-s 복수는 그대로)
   *   n-변화 명사  : 1격 단수 빼고 전부 +n/+en   den Studenten
   */
  function nounForm(noun, kase, plural, articleKind) {
    if (plural) {
      if (noun.adjNoun) {
        var st = adjNounStem(noun.de);
        return st + adjEnding(kase, 'pl', declensionType(articleKind));
      }
      var pl = noun.plural;
      if (!pl) return null;
      if (kase === 'dat' && !endsWithAny(pl, ['n', 's'])) return pl + 'n';
      return pl;
    }

    if (noun.adjNoun) {
      return adjNounStem(noun.de) + adjEnding(kase, noun.gender, declensionType(articleKind));
    }

    if (noun.nDekl && kase !== 'nom') {
      // 어간이 -e 로 끝나면 -n, 아니면 -en   (der Junge -> den Jungen / der Student -> den Studenten)
      return noun.de + (/e$/.test(noun.de) ? 'n' : 'en');
    }

    if (kase === 'gen' && (noun.gender === 'm' || noun.gender === 'n')) {
      return noun.de + (noun.genSg || 's');
    }

    return noun.de;
  }

  /**
   * 명사 하나의 격변화 표 전체.
   * @returns { sg: {nom:{article,noun,full}, …}, pl: {…} }
   */
  function table(noun, kind, opts) {
    opts = opts || {};
    var order = opts.germanOrder ? ORDER_DE : ORDER_KO;
    var out = { order: order, sg: {}, pl: {}, kind: kind, noun: noun };

    order.forEach(function (kase) {
      // 단수
      if (noun.pluralOnly) {
        out.sg[kase] = null;
      } else {
        var a = article(kind, noun.gender, kase);
        var n = nounForm(noun, kase, false, kind);
        out.sg[kase] = { article: a, noun: n, full: join(a, n) };
      }
      // 복수
      if (noun.noPlural || !noun.plural) {
        out.pl[kase] = null;
      } else {
        var ap = article(kind, 'pl', kase);
        var np = nounForm(noun, kase, true, kind);
        out.pl[kase] = ap === null
          ? null                                   // ein 의 복수 — 형태 없음
          : { article: ap, noun: np, full: join(ap, np) };
      }
    });
    return out;
  }

  function join(a, n) {
    if (a === null || n === null) return null;
    return a ? a + ' ' + n : n;
  }

  // ---------------------------------------------------------------- 형용사 어미

  // 약변화 — 정관사·dieser 뒤 (관사가 이미 격을 표시하므로 형용사는 -e/-en 만)
  var WEAK = {
    m:  { nom: 'e',  gen: 'en', dat: 'en', akk: 'en' },
    f:  { nom: 'e',  gen: 'en', dat: 'en', akk: 'e'  },
    n:  { nom: 'e',  gen: 'en', dat: 'en', akk: 'e'  },
    pl: { nom: 'en', gen: 'en', dat: 'en', akk: 'en' }
  };

  // 혼합변화 — ein/kein/mein 뒤 (관사가 격을 못 밝히는 칸에서 형용사가 대신 밝힌다)
  var MIXED = {
    m:  { nom: 'er', gen: 'en', dat: 'en', akk: 'en' },
    f:  { nom: 'e',  gen: 'en', dat: 'en', akk: 'e'  },
    n:  { nom: 'es', gen: 'en', dat: 'en', akk: 'es' },
    pl: { nom: 'en', gen: 'en', dat: 'en', akk: 'en' }
  };

  // 강변화 — 관사 없음 (형용사가 관사 어미를 통째로 짊어진다)
  var STRONG = {
    m:  { nom: 'er', gen: 'en', dat: 'em', akk: 'en' },
    f:  { nom: 'e',  gen: 'er', dat: 'er', akk: 'e'  },
    n:  { nom: 'es', gen: 'en', dat: 'em', akk: 'es' },
    pl: { nom: 'e',  gen: 'er', dat: 'en', akk: 'e'  }
  };

  var ADJ_TABLES = { weak: WEAK, mixed: MIXED, strong: STRONG };

  /** 관사 종류 -> 형용사 변화 유형 */
  function declensionType(kind) {
    var k = ARTICLE_KINDS[kind];
    if (!k || k.type === 'none') return 'strong';
    if (k.type === 'def') return 'weak';
    return 'mixed';
  }

  function adjEnding(kase, gender, type) {
    return ADJ_TABLES[type][gender][kase];
  }

  /** 형용사 + 명사 구 전체:  'den großen Hund' */
  function phrase(noun, adj, kase, plural, kind) {
    var gender = plural ? 'pl' : noun.gender;
    var a = article(kind, gender, kase);
    if (a === null) return null;
    var type = declensionType(kind);
    // ein 계열이라도 복수에서는 kein/mein 이 격을 밝히므로 mixed 가 맞다
    var adjWord = adj + adjEnding(kase, gender, type);
    var n = nounForm(noun, kase, plural, kind);
    return [a, adjWord, n].filter(function (x) { return x; }).join(' ');
  }

  // ---------------------------------------------------------------- 성 추론

  // 접미어로 성을 알 수 있는 것들 (목차 2-1). 긴 것부터 검사한다.
  var GENDER_RULES = [
    { suffix: 'ung',    gender: 'f', note: '-ung 은 항상 여성' },
    { suffix: 'heit',   gender: 'f', note: '-heit 은 항상 여성' },
    { suffix: 'keit',   gender: 'f', note: '-keit 은 항상 여성' },
    { suffix: 'schaft', gender: 'f', note: '-schaft 은 항상 여성' },
    { suffix: 'tion',   gender: 'f', note: '-tion 은 항상 여성' },
    { suffix: 'sion',   gender: 'f', note: '-sion 은 항상 여성' },
    { suffix: 'tät',    gender: 'f', note: '-tät 은 항상 여성' },
    { suffix: 'ik',     gender: 'f', note: '-ik 은 대개 여성' },
    { suffix: 'ei',     gender: 'f', note: '-ei 는 대개 여성' },
    { suffix: 'in',     gender: 'f', note: '-in 은 여성형 명사' },
    { suffix: 'chen',   gender: 'n', note: '-chen 축소형은 항상 중성' },
    { suffix: 'lein',   gender: 'n', note: '-lein 축소형은 항상 중성' },
    { suffix: 'ment',   gender: 'n', note: '-ment 는 대개 중성' },
    { suffix: 'um',     gender: 'n', note: '-um 은 대개 중성' },
    { suffix: 'ismus',  gender: 'm', note: '-ismus 는 항상 남성' },
    { suffix: 'ling',   gender: 'm', note: '-ling 은 항상 남성' },
    { suffix: 'or',     gender: 'm', note: '-or 는 대개 남성' },
    { suffix: 'ent',    gender: 'm', note: '-ent 는 대개 남성 (n-변화)' },
    { suffix: 'ant',    gender: 'm', note: '-ant 는 대개 남성 (n-변화)' },
    { suffix: 'ist',    gender: 'm', note: '-ist 는 항상 남성 (n-변화)' },
    { suffix: 'er',     gender: 'm', note: '-er 행위자 명사는 대개 남성' }
  ];

  function guessGender(word) {
    var w = word.toLowerCase();
    for (var i = 0; i < GENDER_RULES.length; i++) {
      var r = GENDER_RULES[i];
      if (w.length > r.suffix.length && w.slice(-r.suffix.length) === r.suffix) return r;
    }
    return null;
  }

  // ---------------------------------------------------------------- 복수형 유형

  var PLURAL_CLASSES = {
    '-':     '무변화',
    '¨-':    '움라우트만',
    '-e':    '-e',
    '¨-e':   '움라우트 + -e',
    '-er':   '-er',
    '¨-er':  '움라우트 + -er',
    '-n':    '-n',
    '-en':   '-en',
    '-nen':  '-nen (여성형)',
    '-s':    '-s (외래어)',
    'pl.':   '복수만 존재',
    'Sg.':   '단수만 존재',
    '형태제시': '불규칙 (외래어)'
  };

  global.Declension = {
    CASES: CASES,
    ORDER_KO: ORDER_KO,
    ORDER_DE: ORDER_DE,
    ARTICLE_KINDS: ARTICLE_KINDS,
    DEFINITE: DEFINITE,
    EIN_ENDINGS: EIN_ENDINGS,
    ADJ_TABLES: ADJ_TABLES,
    GENDER_RULES: GENDER_RULES,
    PLURAL_CLASSES: PLURAL_CLASSES,
    article: article,
    nounForm: nounForm,
    table: table,
    adjEnding: adjEnding,
    declensionType: declensionType,
    phrase: phrase,
    guessGender: guessGender
  };
})(window);
