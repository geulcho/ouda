/*
 * prefix.js — 접두사 동사 분해 · 패밀리
 *
 * 분해 결과를 저장하지 않고 매번 계산한다. 단어가 늘거나 뜻을 채우면 저절로 따라온다.
 *
 * ── 분리 여부를 어떻게 정하는가 (여기가 이 파일의 핵심)
 *
 * verbs.js 의 separable 필드를 그대로 믿으면 안 된다. 원문 단어장에 활용형이
 * 없던 동사는 파서가 판정을 못 해 null 로 두었고, anfangen · ankommen ·
 * mitkommen · abfahren 같은 A1 분리동사가 전부 여기 걸린다 (119개).
 * null 을 "비분리"로 읽으면 정반대를 가르치게 된다.
 *
 * 그래서 근거를 순서대로 본다.
 *   1. pp 가 있으면      → 접두사 바로 뒤에 ge 가 오는가  (aufgestanden vs verstanden)
 *   2. pres3 가 있으면   → 띄어 쓰였는가                  (steht auf vs versteht)
 *   3. 둘 다 없으면      → 접두사 종류로 추정 (an- 은 늘 분리, be- 는 늘 비분리)
 *
 * 3번은 가변 접두사(um · über · unter · durch · wieder · voll)에는 쓰지 않는다.
 * 그쪽은 동사마다 갈리므로 근거가 없으면 아예 다루지 않는다 — 찍어서 가르치지 않는다.
 */
(function (global) {
  'use strict';

  var PREFIXES = global.PREFIXES || [];
  var SEEDS = global.PREFIXVERBS || [];
  var BASE_KO = global.BASEVERBS || {};

  var BY_ID = {};
  PREFIXES.forEach(function (p) { BY_ID[p.id] = p; });

  // 긴 것부터 봐야 zurück- 이 zu- 로 잘리지 않는다
  var IDS = PREFIXES.map(function (p) { return p.id; })
    .sort(function (a, b) { return b.length - a.length; });

  var SEED_BY_LEMMA = {};
  SEEDS.forEach(function (s) { SEED_BY_LEMMA[s.lemma] = s; });

  // ge- 는 지금 새 동사를 만들지 않는다. 자동 분해하면 과거분사(gekommen)를
  // 동사로 오해한다. 시드에 prefix:'ge' 라고 적은 것만 다룬다.
  var NO_AUTO = { ge: 1 };

  var verbIndex = null;     // de -> entry
  var cache = {};           // id -> info | false

  function reset() { verbIndex = null; cache = {}; }

  /*
   * 기본 동사 찾기용 색인. 한 번 만들어 두면 드릴에서 words 없이 불러도 된다.
   * ui.js 가 WORDS 를 새로 만들 때마다 reset() 하고 다시 태운다 —
   * 그래야 사용자가 채운 뜻이 직역 조립에 반영된다.
   */
  function indexOf(words) {
    if (verbIndex) return verbIndex;
    var list = words || global.VERBS || [];
    verbIndex = {};
    list.forEach(function (e) {
      if (e.pos === 'verb') verbIndex[bare(e.de)] = e;
    });
    return verbIndex;
  }

  /** ui.js 가 단어 목록을 새로 만든 뒤 부른다 */
  function prime(words) { reset(); indexOf(words); }

  /** 'sich umziehen' -> 'umziehen' */
  function bare(de) {
    return String(de || '').replace(/^sich\s+/, '').trim();
  }

  /** 'übernommen.' -> 'übernommen' — 원문에 딸려 온 구두점을 턴다 */
  function clean(x) {
    return String(x || '').replace(/[.,;:]+$/, '').trim();
  }

  function hasForms(e) {
    return !!(clean(e.pp) || clean(e.praet) || clean(e.pres3));
  }

  // ---------------------------------------------------------------- 분리 여부

  /**
   * @return true 분리 · false 비분리 · null 알 수 없음
   */
  function separability(e, prefixId) {
    var p = BY_ID[prefixId];
    var pp = clean(e.pp);
    var pres3 = clean(e.pres3);

    // 1. 과거분사: 분리형은 접두사와 어간 사이에 ge 가 낀다
    if (pp && pp.indexOf(prefixId) === 0) {
      return pp.slice(prefixId.length, prefixId.length + 2) === 'ge';
    }
    // 2. 3인칭 현재: 분리형은 접두어가 떨어져 나가 띄어쓰기가 생긴다
    if (pres3) return /\s/.test(pres3);

    // 3. 근거가 없다 — 접두사 종류로만 추정한다.
    //    가변 접두사는 동사마다 갈리므로 추정하지 않는다.
    if (!p || p.type === 'variable') return null;
    return p.type === 'separable';
  }

  // ---------------------------------------------------------------- 분해

  /**
   * @return { prefix, prefixData, base, baseEntry, separable, seed,
   *           transparency, literalKo } 또는 null
   */
  function info(e, words) {
    if (!e || e.pos !== 'verb') return null;
    if (cache[e.id] !== undefined) return cache[e.id] || null;

    var out = compute(e, words);
    cache[e.id] = out || false;
    return out;
  }

  function compute(e, words) {
    var de = bare(e.de);
    // 'es regnen' 처럼 여러 낱말로 된 항목은 다루지 않는다
    if (/\s/.test(de)) return null;

    var idx = indexOf(words);
    var seed = SEED_BY_LEMMA[de] || null;

    var prefixId = null, baseDe = null;

    if (seed && seed.prefix) {
      // 시드가 직접 적어 준 경우 (ge- 계열, emp- 처럼 쪼갤 수 없는 것)
      prefixId = seed.prefix;
      baseDe = seed.base || null;
    } else {
      for (var i = 0; i < IDS.length; i++) {
        var id = IDS[i];
        if (NO_AUTO[id]) continue;
        if (de.indexOf(id) !== 0) continue;
        var rest = de.slice(id.length);
        if (rest.length < 4) continue;            // 어간이 너무 짧으면 우연이다
        if (!idx[rest]) continue;                 // 기본 동사가 우리 데이터에 있어야 한다
        prefixId = id; baseDe = rest;
        break;
      }
    }
    if (!prefixId) return null;

    var p = BY_ID[prefixId];
    if (!p) return null;

    var sep = separability(e, prefixId);

    // 가변 접두사인데 근거가 없으면 다루지 않는다.
    // (vollkommen 처럼 동사가 아닌 항목이 여기서 걸러진다)
    if (sep === null && p.type === 'variable') return null;
    if (!hasForms(e) && p.type === 'variable') return null;

    var baseEntry = baseDe ? idx[baseDe] || null : null;

    return {
      prefix: prefixId,
      prefixData: p,
      base: baseDe,
      baseEntry: baseEntry,
      separable: sep,
      seed: seed,
      transparency: seed ? seed.transparency : null,
      literalKo: literal(seed, p, baseEntry, baseDe),
      baseKo: baseMeaning(baseEntry, baseDe)
    };
  }

  /**
   * 직역. 시드에 적어 둔 것이 있으면 그것을 쓰고,
   * 없으면 접두사 중심 이미지 + 기본 동사 뜻으로 조립한다.
   * 기본 동사 뜻이 없으면 만들지 않는다 — 없는 걸 지어내지 않는다.
   */
  function literal(seed, p, baseEntry, baseDe) {
    if (seed && seed.literalKo !== undefined) return seed.literalKo;
    var ko = baseMeaning(baseEntry, baseDe);
    if (!ko) return null;
    return (p.meaningsKo[0] || p.coreKo) + ' + ' + ko;
  }

  /**
   * 기본 동사의 뜻 한 줄.
   * 사용자가 뜻 채우기에서 적은 값이 먼저고, 없으면 시드(BASEVERBS)를 쓴다.
   */
  function baseMeaning(baseEntry, baseDe) {
    var ko = baseEntry ? String(baseEntry.ko || '').trim() : '';
    if (!ko && baseDe) ko = String(BASE_KO[baseDe] || '').trim();
    if (!ko) return null;
    return ko.split(',')[0].trim();
  }

  // ---------------------------------------------------------------- 활용형 보정

  /*
   * 활용 엔진에 넘길 수 있게 손본 항목.
   *
   * 원문 단어장이 파생 동사의 활용형을 안 적어 둔 경우가 많다 (abfahren 은
   * pres3 도 pp 도 없다). 그런데 파생 동사는 기본 동사와 똑같이 활용하므로
   * 기본 동사에서 그대로 끌어올 수 있다.
   *
   *   abfahren  ← fahren(fährt · gefahren)   →  fährt ab · abgefahren
   *   verstehen ← stehen(steht · gestanden)  →  versteht · verstanden
   *
   * 비분리형은 과거분사의 ge 를 떼고 붙인다. 이게 곧 우리가 가르치려는 규칙이다.
   * 원래 데이터에 값이 있으면 절대 건드리지 않는다 — 실제 값이 언제나 이긴다.
   */
  function forConjugation(e, words) {
    var nfo = info(e, words);
    if (!nfo) return e;

    var c = {};
    Object.keys(e).forEach(function (k) { c[k] = e[k]; });

    var sep = nfo.separable === true;
    c.separable = sep;
    c.prefix = sep ? nfo.prefix : null;

    var b = nfo.baseEntry;
    if (!b) return c;

    if (!clean(c.pres3) && clean(b.pres3)) {
      c.pres3 = sep ? clean(b.pres3) + ' ' + nfo.prefix
                    : nfo.prefix + clean(b.pres3);
    }
    if (!clean(c.pp) && clean(b.pp)) {
      var bpp = clean(b.pp);
      c.pp = sep ? nfo.prefix + bpp
                 : nfo.prefix + bpp.replace(/^ge/, '');
    }
    if (!clean(c.praet) && clean(b.praet)) {
      var bpr = clean(b.praet);
      c.praet = sep ? bpr + ' ' + nfo.prefix : nfo.prefix + bpr;
    }
    if (!c.aux && b.aux) c.aux = b.aux;
    if (c.irregular == null) c.irregular = b.irregular;

    return c;
  }

  // ---------------------------------------------------------------- 묶음

  function decomposable(words) {
    return (words || []).filter(function (e) { return !!info(e, words); });
  }

  /** 같은 기본 동사를 쓰는 파생 동사들 */
  function family(baseDe, words) {
    return decomposable(words).filter(function (e) {
      return info(e, words).base === baseDe;
    });
  }

  /** 파생어가 많은 기본 동사부터 */
  function families(words, min) {
    var m = {};
    decomposable(words).forEach(function (e) {
      var b = info(e, words).base;
      if (!b) return;
      (m[b] = m[b] || []).push(e);
    });
    return Object.keys(m)
      .filter(function (b) { return m[b].length >= (min || 2); })
      .map(function (b) { return { base: b, verbs: m[b] }; })
      .sort(function (a, b) { return b.verbs.length - a.verbs.length; });
  }

  function byPrefix(id, words) {
    return decomposable(words).filter(function (e) {
      return info(e, words).prefix === id;
    });
  }

  /** 접두사별 동사 수 — 탐색 화면의 카드에 쓴다 */
  function counts(words) {
    var m = {};
    decomposable(words).forEach(function (e) {
      var id = info(e, words).prefix;
      m[id] = (m[id] || 0) + 1;
    });
    return m;
  }

  // ---------------------------------------------------------------- 과거분사 규칙

  /**
   * 과거분사와 '그럴듯한 오답' 두 개.
   * 오답이 그럴듯해야 규칙을 익힌다.
   *
   *   분리형  aufmachen → aufgemacht  (틀린 답: geaufmacht · aufmacht)
   *   비분리  besuchen  → besucht     (틀린 답: gebesucht  · gesucht)
   */
  function ppForms(e, nfo) {
    var pp = clean(e.pp);
    if (!pp || nfo.separable === null) return null;
    var stem = pp.indexOf(nfo.prefix) === 0 ? pp.slice(nfo.prefix.length) : null;
    if (!stem) return null;

    var wrong = [];
    if (nfo.separable) {
      // 접두사 앞에 ge 를 붙여 버리는 실수
      wrong.push('ge' + nfo.prefix + stem.replace(/^ge/, ''));
      // ge 를 아예 빼먹는 실수
      wrong.push(nfo.prefix + stem.replace(/^ge/, ''));
    } else {
      // 비분리인데 ge 를 붙이는 실수
      wrong.push('ge' + pp);
      // 접두사를 떼고 기본 동사의 과거분사를 쓰는 실수
      if (nfo.baseEntry && clean(nfo.baseEntry.pp)) wrong.push(clean(nfo.baseEntry.pp));
      else wrong.push('ge' + stem);
    }
    wrong = wrong.filter(function (w, i) {
      return w && w !== pp && wrong.indexOf(w) === i;
    });
    if (wrong.length < 2) return null;
    return { right: pp, wrong: wrong.slice(0, 2) };
  }

  /** 채점 뒤 보여줄 규칙 한 줄 */
  function ppRule(nfo) {
    return nfo.separable
      ? '분리동사는 접두사와 어간 사이에 ge 가 들어갑니다 — auf + ge + macht.'
      : '비분리동사는 과거분사에 ge 가 붙지 않습니다 — besucht (gebesucht 아님).';
  }

  // ---------------------------------------------------------------- 뜻

  /** 시드의 뜻 → 없으면 사용자가 채운 ko → 없으면 빈 배열 (빈도 높은 것부터) */
  function meanings(e, nfo) {
    if (nfo && nfo.seed && nfo.seed.meanings && nfo.seed.meanings.length) {
      return nfo.seed.meanings.map(function (m) { return m.ko; });
    }
    return String(e.ko || '').split(',')
      .map(function (x) { return x.trim(); })
      .filter(Boolean);
  }

  function hasMeaning(e, nfo) { return meanings(e, nfo).length > 0; }

  /** 학습 순서 — 접두사 카드 정렬 */
  var LEVEL_ORDER = { A1: 0, A2: 1, B1: 2, B2: 3 };
  function sortPrefixes(list) {
    // A1 의 순위가 0 이라 `|| 9` 를 쓰면 A1 이 맨 뒤로 간다. undefined 만 걸러야 한다.
    function rank(l) {
      return LEVEL_ORDER[l] === undefined ? 9 : LEVEL_ORDER[l];
    }
    return list.slice().sort(function (a, b) {
      var d = rank(a.level) - rank(b.level);
      return d !== 0 ? d : a.id.localeCompare(b.id);
    });
  }

  global.Prefix = {
    PREFIXES: PREFIXES,
    BY_ID: BY_ID,
    SEEDS: SEEDS,
    SEED_BY_LEMMA: SEED_BY_LEMMA,
    info: info,
    forConjugation: forConjugation,
    separability: separability,
    decomposable: decomposable,
    family: family,
    families: families,
    byPrefix: byPrefix,
    counts: counts,
    ppForms: ppForms,
    ppRule: ppRule,
    meanings: meanings,
    hasMeaning: hasMeaning,
    literal: literal,
    baseMeaning: baseMeaning,
    BASE_KO: BASE_KO,
    sortPrefixes: sortPrefixes,
    bare: bare,
    clean: clean,
    prime: prime,
    reset: reset
  };
})(window);
