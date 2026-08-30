/*
 * conjugation.js — 동사 활용 생성 엔진
 *
 * 저장된 네 조각(pres3 / praet / pp / aux)에서 나머지를 전부 만든다.
 * Goethe B1 목록이 이 네 조각을 그대로 주기 때문에 데이터가 얇아도 된다.
 *
 * 목차 Part 4(동사 기본기) · 5(시제) · 6(화법조동사) · 13(수동태) 대응.
 */
(function (global) {
  'use strict';

  var PERSONS = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];

  var PERSON_LABEL = {
    ich: 'ich',  du: 'du',   er: 'er/sie/es',
    wir: 'wir',  ihr: 'ihr', sie: 'sie/Sie'
  };

  var PRESENT_ENDINGS   = { ich: 'e',  du: 'st',   er: 't',  wir: 'en', ihr: 't',  sie: 'en' };
  var PRET_WEAK_ENDINGS = { ich: '',   du: 'st',   er: '',   wir: 'n',  ihr: 't',  sie: 'n'  };
  var PRET_STRONG_END   = { ich: '',   du: 'st',   er: '',   wir: 'en', ihr: 't',  sie: 'en' };

  // 규칙으로 못 만드는 것들. 전부 최고빈도 동사라 통째로 외우는 편이 맞다.
  var IRREGULAR_PRESENT = {
    sein:   { ich: 'bin',  du: 'bist',  er: 'ist',  wir: 'sind',  ihr: 'seid',  sie: 'sind' },
    haben:  { ich: 'habe', du: 'hast',  er: 'hat',  wir: 'haben', ihr: 'habt',  sie: 'haben' },
    werden: { ich: 'werde',du: 'wirst', er: 'wird', wir: 'werden',ihr: 'werdet',sie: 'werden' },
    wissen: { ich: 'weiß', du: 'weißt', er: 'weiß', wir: 'wissen',ihr: 'wisst', sie: 'wissen' },
    // 화법조동사 — 단수에서 어간이 통째로 바뀌고 1·3인칭에 어미가 없다 (목차 6-1)
    können: { ich: 'kann', du: 'kannst',er: 'kann', wir: 'können',ihr: 'könnt', sie: 'können' },
    dürfen: { ich: 'darf', du: 'darfst',er: 'darf', wir: 'dürfen',ihr: 'dürft', sie: 'dürfen' },
    müssen: { ich: 'muss', du: 'musst', er: 'muss', wir: 'müssen',ihr: 'müsst', sie: 'müssen' },
    wollen: { ich: 'will', du: 'willst',er: 'will', wir: 'wollen',ihr: 'wollt', sie: 'wollen' },
    sollen: { ich: 'soll', du: 'sollst',er: 'soll', wir: 'sollen',ihr: 'sollt', sie: 'sollen' },
    mögen:  { ich: 'mag',  du: 'magst', er: 'mag',  wir: 'mögen', ihr: 'mögt',  sie: 'mögen' },
    möchten:{ ich: 'möchte',du:'möchtest',er:'möchte',wir:'möchten',ihr:'möchtet',sie:'möchten' }
  };

  var HABEN = { de: 'haben', pres3: 'hat', praet: 'hatte', pp: 'gehabt', aux: 'haben' };
  var SEIN  = { de: 'sein',  pres3: 'ist', praet: 'war',   pp: 'gewesen', aux: 'sein' };
  var WERDEN= { de: 'werden',pres3: 'wird',praet: 'wurde', pp: 'geworden', aux: 'sein' };

  // ---------------------------------------------------------------- 어간

  /** 분리 접두어를 뗀 부정형. einsteigen -> steigen */
  function baseInfinitive(v) {
    if (v.separable && v.prefix && v.de.indexOf(v.prefix) === 0) {
      return v.de.slice(v.prefix.length);
    }
    return v.de;
  }

  /** 부정형에서 어간. machen -> mach, handeln -> handel, tun -> tu */
  function stemOf(inf) {
    if (/eln$|ern$/.test(inf)) return inf.slice(0, -1);   // handeln -> handel
    if (/en$/.test(inf)) return inf.slice(0, -2);
    if (/n$/.test(inf)) return inf.slice(0, -1);          // tun -> tu
    return inf;
  }

  /**
   * 모음변화가 일어난 어간. pres3 이 'fährt' 면 'fähr'.
   * 분리동사의 pres3 은 'steigt ein' 처럼 분리돼 있으므로 앞부분만 쓴다.
   */
  function changedStem(v) {
    if (!v.pres3) return null;
    var form = v.pres3.split(' ')[0];
    if (v.separable && v.prefix && form.indexOf(v.prefix) === 0 && form !== v.prefix) {
      form = form.slice(v.prefix.length);
    }
    return form.replace(/t$/, '');
  }

  // ---------------------------------------------------------------- 현재

  /**
   * 현재 인칭변화. 분리동사는 접두어를 뗀 형태만 돌려준다 (어순은 mainClause 가 담당).
   */
  function present(v, person) {
    var inf = baseInfinitive(v);
    var irr = IRREGULAR_PRESENT[v.de] || IRREGULAR_PRESENT[inf];
    if (irr) return irr[person];

    var stem = stemOf(inf);
    var ending = PRESENT_ENDINGS[person];

    // 모음변화는 du / er 에만 나타난다 (wir fahren, ihr fahrt 는 그대로)
    if ((person === 'du' || person === 'er') && v.irregular) {
      var ch = changedStem(v);
      if (ch) stem = ch;
    }

    // 어간이 d/t 로 끝나면 발음 때문에 e 를 넣는다: du arbeitest, ihr arbeitet
    if (/[dt]$/.test(stem) && /^(st|t)$/.test(ending)) {
      // 단, 모음변화한 어간은 e 를 넣지 않는다: du hältst (halten), er hält
      if (!(v.irregular && changedStem(v) === stem)) ending = 'e' + ending;
    } else if (/(chn|ffn|gn|tm|dm)$/.test(stem) && /^(st|t|en)$/.test(ending)) {
      ending = 'e' + ending;
    }

    // 어간이 s/ß/x/z 로 끝나면 du 의 -st 에서 s 가 떨어진다: du heißt, du sitzt
    if (person === 'du' && /[sßxz]$/.test(stem) && ending === 'st') ending = 't';

    // handeln 류는 1인칭에서 e 가 떨어진다: ich handle
    if (person === 'ich' && /el$/.test(stem)) return stem.slice(0, -2) + 'le';

    return stem + ending;
  }

  // ---------------------------------------------------------------- 과거

  function preterite(v, person) {
    if (!v.praet) return null;
    var base = v.praet.split(' ')[0];
    if (v.separable && v.prefix && base.indexOf(v.prefix) === 0 && base !== v.prefix) {
      base = base.slice(v.prefix.length);
    }
    // 약변화는 -te 로 끝난다 (machte). 강변화는 어미가 없다 (fuhr)
    var weak = /te$/.test(base);
    var end = (weak ? PRET_WEAK_ENDINGS : PRET_STRONG_END)[person];
    if (!weak && /[dt]$/.test(base) && (end === 'st' || end === 't')) end = 'e' + end;
    return base + end;
  }

  // ---------------------------------------------------------------- 복합시제

  function auxVerb(v) {
    // 'haben/sein' 둘 다 쓰는 동사는 haben 을 기본으로 (타동사 용법이 더 흔하다)
    return v.aux === 'sein' ? SEIN : HABEN;
  }

  function perfect(v, person) {
    if (!v.pp) return null;
    return present(auxVerb(v), person) + ' ' + v.pp;
  }

  function pluperfect(v, person) {
    if (!v.pp) return null;
    return preterite(auxVerb(v), person) + ' ' + v.pp;
  }

  function future(v, person) {
    return present(WERDEN, person) + ' ' + v.de;
  }

  /** Futur II — 'er wird gegangen sein' (목차 5-1) */
  function futureII(v, person) {
    if (!v.pp) return null;
    return present(WERDEN, person) + ' ' + v.pp + ' ' + v.aux;
  }

  // ---------------------------------------------------------------- 수동태 (목차 13)

  function passive(v, person, tense) {
    if (!v.pp) return null;
    var subj = person;
    switch (tense) {
      case 'present':    return subj + ' ' + present(WERDEN, 'er') + ' ' + v.pp;
      case 'preterite':  return subj + ' ' + preterite(WERDEN, 'er') + ' ' + v.pp;
      case 'perfect':    return subj + ' ' + present(SEIN, 'er') + ' ' + v.pp + ' worden';
      case 'stative':    return subj + ' ' + present(SEIN, 'er') + ' ' + v.pp;  // Zustandspassiv
      default:           return null;
    }
  }

  // ---------------------------------------------------------------- 어순 (목차 4-2)

  /** 주문장: 분리 접두어가 문장 끝으로 간다. 'ich steige schnell ein' */
  function mainClause(v, person, middle) {
    var conj = present(v, person);
    var parts = [person, conj];
    if (middle) parts.push(middle);
    if (v.separable && v.prefix) parts.push(v.prefix);
    return parts.join(' ');
  }

  /** 종속절: 동사가 끝으로 가고 분리동사는 다시 붙는다. 'ich einsteige' */
  function subClause(v, person, middle) {
    var conj = present(v, person);
    if (v.separable && v.prefix) conj = v.prefix + conj;
    var parts = [person];
    if (middle) parts.push(middle);
    parts.push(conj);
    return parts.join(' ');
  }

  /** zu 부정사: 분리동사는 접두어와 어간 사이에 zu 가 들어간다 (목차 12-1) */
  function zuInfinitive(v) {
    if (v.separable && v.prefix && v.de.indexOf(v.prefix) === 0) {
      return v.prefix + 'zu' + v.de.slice(v.prefix.length);
    }
    return 'zu ' + v.de;
  }

  /** 명령형 — du / ihr / Sie (목차 1-2) */
  function imperative(v, person) {
    var inf = baseInfinitive(v);
    var stem = stemOf(inf);
    var tail = (v.separable && v.prefix) ? ' ' + v.prefix : '';
    if (person === 'ihr') return present(v, 'ihr') + tail + '!';
    if (person === 'Sie') return inf + ' Sie' + tail + '!';
    // du 명령형은 모음변화 중 e->i 만 반영하고 a->ä 는 되돌린다: fahren -> Fahr!, geben -> Gib!
    var ch = changedStem(v);
    if (ch && /^[^aouäöü]*i/.test(ch) && !/^[^aouäöü]*[aou]/.test(stem)) stem = ch;
    else if (ch && /i/.test(ch) && /e/.test(stem)) stem = ch;
    if (/[dtmn]$/.test(stem)) stem += 'e';
    return stem + tail + '!';
  }

  // ---------------------------------------------------------------- 접속법 II (목차 15-1)

  var KONJ2_ENDINGS = { ich: 'e', du: 'est', er: 'e', wir: 'en', ihr: 'et', sie: 'en' };

  /** hätte / wäre / könnte … 강변화는 과거어간에 움라우트 + 어미 */
  function konjunktivII(v, person) {
    if (!v.praet) return null;
    var base = v.praet.split(' ')[0];
    if (/te$/.test(base)) {
      // 약변화는 과거형과 같다 -> 보통 würde + 부정형으로 대체한다
      return present(WERDEN, person).replace(/^werd/, 'würd') + ' ' + v.de;
    }
    var uml = base.replace(/a(?!u)/, 'ä').replace(/^([^aouäöü]*)o/, '$1ö').replace(/^([^aoäöü]*)u/, '$1ü');
    return uml + KONJ2_ENDINGS[person];
  }

  var TENSES = [
    { key: 'present',    label: '현재',       de: 'Präsens',        fn: present },
    { key: 'preterite',  label: '과거',       de: 'Präteritum',     fn: preterite },
    { key: 'perfect',    label: '현재완료',   de: 'Perfekt',        fn: perfect },
    { key: 'pluperfect', label: '과거완료',   de: 'Plusquamperfekt',fn: pluperfect },
    { key: 'future',     label: '미래',       de: 'Futur I',        fn: future }
  ];

  /** 시제 하나의 6인칭 표 */
  function tenseTable(v, tenseKey) {
    var t = null;
    for (var i = 0; i < TENSES.length; i++) if (TENSES[i].key === tenseKey) t = TENSES[i];
    if (!t) return null;
    var out = {};
    PERSONS.forEach(function (p) { out[p] = t.fn(v, p); });
    return out;
  }

  global.Conjugation = {
    PERSONS: PERSONS,
    PERSON_LABEL: PERSON_LABEL,
    TENSES: TENSES,
    IRREGULAR_PRESENT: IRREGULAR_PRESENT,
    baseInfinitive: baseInfinitive,
    stemOf: stemOf,
    changedStem: changedStem,
    present: present,
    preterite: preterite,
    perfect: perfect,
    pluperfect: pluperfect,
    future: future,
    futureII: futureII,
    passive: passive,
    mainClause: mainClause,
    subClause: subClause,
    zuInfinitive: zuInfinitive,
    imperative: imperative,
    konjunktivII: konjunktivII,
    tenseTable: tenseTable
  };
})(window);
