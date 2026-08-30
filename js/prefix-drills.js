/*
 * prefix-drills.js — 접두사 동사 드릴 5종
 *
 * 기존 레지스트리(js/drills.js)에 객체만 얹으면 세션·SRS·오답노트·통계가
 * 자동으로 따라온다. pos:'verb' 로 등록하므로 새 항목 타입도 필요 없다.
 *
 * 뜻이 없어도 되는 것 셋 (문법):  pfxSeparable · pfxPP · pfxSplit   → 350개 바로 출제
 * 뜻이 있어야 하는 것 둘 (의미):  pfxMeaning · pfxWhich            → 뜻을 채운 만큼 늘어남
 */
(function (global) {
  'use strict';

  var P = global.Prefix;
  var C = global.Conjugation;
  var G = global.Grader;

  function nfo(e) { return P.info(e); }

  /** 시드 뜻 → 없으면 사용자가 채운 ko */
  function meaningsOf(e) { return P.meanings(e, nfo(e)); }

  /** 항목마다 늘 같은 값이 나오게 — 문제가 매번 달라지면 헷갈린다 */
  function seedNum(s) {
    var n = 0;
    for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
    return n;
  }

  function pick(list, s, i) {
    return list[(seedNum(s) + (i || 0) * 7) % list.length];
  }

  function shuffleFor(list, s) {
    var out = list.slice(), n = seedNum(s);
    for (var i = out.length - 1; i > 0; i--) {
      n = (n * 1103515245 + 12345) >>> 0;
      var j = n % (i + 1);
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  /** 접두사와 기본 동사를 눈에 보이게 갈라 준다 */
  function split(e) {
    var n = nfo(e);
    if (!n) return e.de;
    return n.prefix + ' + ' + (n.base || '—');
  }

  function typeLabel(n) {
    return n.separable === true ? '분리' : n.separable === false ? '비분리' : '미상';
  }

  // ================================================================ 1. 분리 / 비분리

  var separableDrill = {
    id: 'pfxSeparable',
    label: '분리 · 비분리 판별',
    part: '접두사 동사 — 문법',
    pos: 'verb',
    input: 'choice',
    applies: function (e) {
      var n = nfo(e);
      return !!(n && n.separable !== null && n.base);
    },
    make: function (e) {
      var n = nfo(e);
      var c = P.forConjugation(e);
      var right = C.mainClause(c, 'ich');

      // 실제로 학습자가 저지르는 두 가지 오류를 오답으로 쓴다
      var joined = { de: P.bare(e.de), pos: 'verb', separable: false, prefix: null };
      var baseOnly = { de: n.base, pos: 'verb' };
      var wrong = n.separable
        ? ['ich ' + C.present(joined, 'ich'),               // 안 떼고 그대로 활용
           'ich ' + n.prefix + ' ' + C.present(c, 'ich')]   // 접두어를 앞에 둠
        : ['ich ' + C.present(baseOnly, 'ich') + ' ' + n.prefix,   // 떼어 버림
           'ich ' + n.prefix + ' ' + C.present(baseOnly, 'ich')];

      var choices = [right].concat(wrong.filter(function (w) { return w !== right; }));
      return {
        prompt: P.bare(e.de),
        sub: split(e) + ' — ich 로 주문장을 만들면?',
        choices: shuffleFor(choices.slice(0, 3), e.id),
        answer: right,
        sep: n.separable,
        prefix: n.prefix,
        why: n.separable
          ? '분리동사입니다. 주문장에서 접두어 "' + n.prefix + '" 는 문장 끝으로 갑니다.'
          : '비분리동사입니다. 접두어가 떨어지지 않고 하나의 낱말로 활용합니다.'
      };
    },
    grade: function (q, input) {
      // 채점 화면이 정답을 이미 찍으므로 여기서는 규칙만 설명한다
      return { grade: String(input).trim() === q.answer ? 'right' : 'wrong', note: q.why };
    }
  };

  // ================================================================ 2. 과거분사 ge 위치

  var ppDrill = {
    id: 'pfxPP',
    label: '과거분사에서 ge 위치',
    part: '접두사 동사 — 문법',
    pos: 'verb',
    input: 'choice',
    applies: function (e) {
      var n = nfo(e);
      if (!n || n.separable === null) return false;
      return !!P.ppForms(P.forConjugation(e), n);
    },
    make: function (e) {
      var n = nfo(e);
      var c = P.forConjugation(e);
      var f = P.ppForms(c, n);
      var aux = c.aux === 'sein' ? 'ist' : 'hat';
      return {
        prompt: 'Er ' + aux + ' … ______.',
        sub: P.bare(e.de) + '  (' + split(e) + ') 의 과거분사는?',
        choices: shuffleFor([f.right].concat(f.wrong), e.id),
        answer: f.right,
        why: P.ppRule(n)
      };
    },
    grade: function (q, input) {
      return { grade: String(input).trim() === q.answer ? 'right' : 'wrong', note: q.why };
    }
  };

  // ================================================================ 3. 주문장 분리 위치

  var FRAMES = ['jeden Morgen', 'heute Abend', 'am Wochenende', 'jeden Tag', 'sofort'];
  var SUBJ = ['ich', 'er', 'wir'];

  var splitDrill = {
    id: 'pfxSplit',
    label: '분리동사 자리 (두 칸)',
    part: '접두사 동사 — 문법',
    pos: 'verb',
    input: 'multi',
    applies: function (e) {
      var n = nfo(e);
      if (!n || n.separable !== true) return false;
      var c = P.forConjugation(e);
      return !!C.present(c, 'er');
    },
    make: function (e) {
      var n = nfo(e);
      var c = P.forConjugation(e);
      var who = pick(SUBJ, e.id);
      var mid = pick(FRAMES, e.id, 1);
      var verb = C.present(c, who);
      var cap = who.charAt(0).toUpperCase() + who.slice(1);

      return {
        prompt: cap + ' ______ ' + mid + ' ______.',
        sub: P.bare(e.de) + '  (' + split(e) + ') — 두 칸을 채우세요',
        fields: [
          { key: 'v', label: '정동사 (2번째 자리)', answer: verb },
          { key: 'p', label: '접두어 (문장 끝)', answer: n.prefix }
        ],
        answer: { v: verb, p: n.prefix },
        sentence: cap + ' ' + verb + ' ' + mid + ' ' + n.prefix + '.',
        why: '분리동사는 정동사만 2번째 자리에 남고 접두어 "' + n.prefix +
             '" 는 문장 끝으로 갑니다. 둘이 문장을 앞뒤에서 감쌉니다 (문장괄호).'
      };
    },
    grade: function (q, inputs) {
      var r = G.gradeTable(inputs, q.answer, {});
      r.note = (r.grade === 'right' ? q.sentence : '정답: ' + q.sentence) + '\n' + q.why;
      return r;
    }
  };

  // ================================================================ 4. 의미 추론

  /** 오답 후보 — 같은 계열에서 뽑아야 그럴듯하다 */
  function distractors(e, right) {
    var n = nfo(e);
    var out = [];

    function add(x) {
      if (!x) return;
      x = String(x).trim();
      if (!x || x === right) return;
      // 정답과 글자가 겹치면 문제가 이상해진다
      if (x.indexOf(right) >= 0 || right.indexOf(x) >= 0) return;
      if (out.indexOf(x) < 0) out.push(x);
    }

    var seeds = P.SEEDS;
    // ① 같은 기본 동사를 쓰는 다른 파생어의 뜻
    seeds.forEach(function (s) {
      if (s.lemma === P.bare(e.de)) return;
      var sn = P.SEED_BY_LEMMA[s.lemma];
      var other = P.info({ id: 'x:' + s.lemma, de: s.lemma, pos: 'verb' });
      if (other && n && other.base === n.base) add(s.meanings[0].ko);
    });
    // ② 같은 접두사를 쓰는 다른 동사의 뜻
    seeds.forEach(function (s) {
      if (s.lemma === P.bare(e.de)) return;
      var other = P.info({ id: 'x:' + s.lemma, de: s.lemma, pos: 'verb' });
      if (other && n && other.prefix === n.prefix) add(s.meanings[0].ko);
    });
    // ③ 그래도 모자라면 아무 시드에서
    shuffleFor(seeds, e.id).forEach(function (s) {
      if (s.lemma !== P.bare(e.de)) add(s.meanings[0].ko);
    });
    return out;
  }

  var meaningDrill = {
    id: 'pfxMeaning',
    label: '의미 추론 (접두사 + 기본 동사)',
    part: '접두사 동사 — 의미',
    pos: 'verb',
    input: 'choice',
    applies: function (e) {
      var n = nfo(e);
      if (!n || !n.base) return false;
      if (!meaningsOf(e).length) return false;
      // 기본 동사 뜻을 모르면 '추론'이 성립하지 않는다
      return !!n.baseKo;
    },
    make: function (e) {
      var n = nfo(e);
      var list = meaningsOf(e);
      var right = list[0];
      var baseKo = n.baseKo;

      var d = distractors(e, right).slice(0, 3);
      var choices = shuffleFor([right].concat(d), e.id);

      return {
        prompt: P.bare(e.de),
        // ① 기본 동사 뜻 ② 접두사 중심 이미지 를 먼저 준다
        sub: n.base + ' = ' + baseKo + '   ·   ' +
             n.prefix + '- = ' + n.prefixData.coreKo,
        choices: choices,
        answer: right,
        all: list,
        transparency: n.transparency,
        why: (n.seed && n.seed.whyKo) || null,
        literal: n.literalKo,
        ex: (n.seed && n.seed.ex && n.seed.ex[0]) || null,
        warning: (n.seed && n.seed.warning) || null
      };
    },
    grade: function (q, input) {
      var ok = String(input).trim() === q.answer;
      var parts = [];
      if (q.all.length > 1) parts.push('전체 뜻: ' + q.all.join(' / '));
      if (q.why) parts.push(q.why);
      if (q.ex) parts.push(q.ex.de + '\n' + q.ex.ko);
      if (q.warning) parts.push('주의 — ' + q.warning);
      return {
        grade: ok ? 'right' : 'wrong',
        note: parts.join('\n'),
        transparency: q.transparency
      };
    }
  };

  // ================================================================ 5. 접두사 맞히기

  var whichDrill = {
    id: 'pfxWhich',
    label: '뜻 보고 접두사 맞히기',
    part: '접두사 동사 — 의미',
    pos: 'verb',
    input: 'choice',
    applies: function (e) {
      var n = nfo(e);
      return !!(n && n.base && meaningsOf(e).length && !P.BY_ID[n.prefix].warning);
    },
    make: function (e) {
      var n = nfo(e);
      var list = meaningsOf(e);

      // 같은 분리 유형의 다른 접두사를 오답으로
      var same = P.PREFIXES.filter(function (p) {
        return p.id !== n.prefix && p.type === n.prefixData.type;
      });
      var d = shuffleFor(same, e.id).slice(0, 3).map(function (p) { return p.id; });

      return {
        prompt: '___ + ' + n.base + '  =  ' + list[0],
        sub: '어떤 접두사가 붙었을까요?',
        choices: shuffleFor([n.prefix].concat(d), e.id + 'w'),
        answer: n.prefix,
        word: P.bare(e.de),
        core: n.prefixData.coreKo,
        why: (n.seed && n.seed.whyKo) || null
      };
    },
    grade: function (q, input) {
      var ok = String(input).trim() === q.answer;
      var parts = [q.word + '  (' + q.answer + '- = ' + q.core + ')'];
      if (q.why) parts.push(q.why);
      return { grade: ok ? 'right' : 'wrong', note: parts.join('\n') };
    }
  };

  // ================================================================ 등록

  var DRILLS = [separableDrill, ppDrill, splitDrill, meaningDrill, whichDrill];

  global.PrefixDrills = {
    DRILLS: DRILLS,
    GRAMMAR: ['pfxSeparable', 'pfxPP', 'pfxSplit'],
    MEANING: ['pfxMeaning', 'pfxWhich'],
    split: split,
    typeLabel: typeLabel
  };

  if (global.Drills) {
    DRILLS.forEach(function (d) {
      global.Drills.ALL.push(d);
      global.Drills.BY_ID[d.id] = d;
    });
  }
})(window);
