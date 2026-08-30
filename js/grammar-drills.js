/*
 * grammar-drills.js — 문법 드릴 (data/grammar.js 를 씁니다)
 *
 * 단어 목록이 아니라 문법 규칙 자체를 항목으로 삼는 드릴들.
 * Drills.ALL 에 이어붙이고, 항목은 GRAMMAR_ITEMS 로 따로 넘긴다.
 */
(function (global) {
  'use strict';

  var G = global.Grader;
  var D = global.Declension;

  function s() { return global.Store.settings(); }

  var CASE_KEY = { D: 'dat', A: 'akk', G: 'gen', N: 'nom' };
  var CASE_NAME = { D: '3격', A: '4격', G: '2격', N: '1격' };

  // ---------------------------------------------------------------- 전치사 격지배

  var prepCaseDrill = {
    id: 'prepCase',
    label: '전치사 격지배',
    part: '7-1 ~ 7-4 전치사',
    pos: 'prep',
    input: 'choice',
    applies: function (e) { return !!e.kase; },
    make: function (e) {
      if (e.kase === 'W') {
        return {
          prompt: e.de + ' + ___',
          sub: '어떤 격을 지배합니까?',
          hint: e.ko,
          choices: ['3격', '4격', '2격', '3·4격'],
          answer: '3·4격',
          why: '위치(Wo?)면 3격, 방향(Wohin?)이면 4격입니다.\n' +
               'Wo?  ' + e.wo + '\nWohin?  ' + e.wohin
        };
      }
      return {
        prompt: e.de + ' + ___',
        sub: '어떤 격을 지배합니까?',
        hint: e.ko,
        choices: ['3격', '4격', '2격', '3·4격'],
        answer: CASE_NAME[e.kase],
        why: e.sentence
      };
    },
    grade: function (q, input) {
      var ok = G.normalize(input) === q.answer;
      return { grade: ok ? 'right' : 'wrong',
               note: (ok ? '' : '정답: ' + q.answer + ' — ') + q.why };
    }
  };

  /** Wechselpräposition — 문맥을 주고 Wo?/Wohin? 을 가른다 (목차 7-2) */
  var wechselDrill = {
    id: 'wechsel',
    label: '3·4격 전치사 (Wo? / Wohin?)',
    part: '7-2 장소 전치사',
    pos: 'prep',
    input: 'choice',
    applies: function (e) { return e.kase === 'W' && e.wo && e.wohin; },
    make: function (e) {
      var wohin = Math.random() < 0.5;
      var sent = wohin ? e.wohin : e.wo;
      // 전치사 뒤 관사를 빈칸으로.
      // \b 는 ASCII 기준이라 'über' 처럼 움라우트로 시작하는 낱말을 못 잡는다.
      var re = new RegExp('(^|\\s)' + e.de + '\\s+(\\S+?)([\\s.!?,]|$)', 'i');
      var m = sent.match(re);
      var blanked = m ? sent.replace(re, '$1' + e.de + ' ______$3') : sent;
      return {
        prompt: blanked,
        sub: '빈칸의 관사는? (' + e.de + ' — ' + e.ko + ')',
        choices: uniq([m ? m[2] : '', altForm(m && m[2])]).filter(Boolean),
        answer: m ? m[2] : '',
        free: true,
        why: (wohin ? 'Wohin? → 4격' : 'Wo? → 3격') + '  ·  ' + sent
      };
    },
    grade: function (q, input) {
      var r = G.gradeText(input, q.answer, {});
      r.note = (r.grade === 'right' ? '' : '정답: ' + q.answer + ' · ') + q.why;
      return r;
    }
  };

  function altForm(a) {
    var map = { dem: 'den', den: 'dem', der: 'die', die: 'der', das: 'dem',
                einem: 'einen', einen: 'einem', einer: 'eine', eine: 'einer' };
    return a ? (map[a.toLowerCase()] || null) : null;
  }
  function uniq(a) {
    var seen = {}, out = [];
    a.forEach(function (x) { if (x && !seen[x]) { seen[x] = 1; out.push(x); } });
    return out;
  }

  /** 전치사 + 명사구 완성 — 격지배를 실제 형태로 (목차 7-1) */
  var prepPhraseDrill = {
    id: 'prepPhrase',
    label: '전치사 + 명사구',
    part: '7-1 기본 전치사',
    pos: 'prep',
    input: 'text',
    applies: function (e) { return e.kase === 'D' || e.kase === 'A' || e.kase === 'G'; },
    make: function (e) {
      var nouns = global.__PREP_NOUNS || [];
      var kase = CASE_KEY[e.kase];
      // 복수전용 명사(die Eltern)는 단수 칸이 없으므로 쓸 수 있는 것이 나올 때까지 고른다
      var n, t;
      for (var tries = 0; tries < 12; tries++) {
        n = nouns[Math.floor(Math.random() * nouns.length)];
        if (!n) continue;
        t = D.table(n, 'definite', { germanOrder: s().germanOrder });
        if (t.sg[kase]) break;
        t = null;
      }
      if (!t) return null;
      return {
        prompt: e.de + ' + ' + 'der/die/das ' + n.de,
        sub: e.de + ' 는 ' + CASE_NAME[e.kase] + ' 지배 — 전치사구를 완성하세요',
        placeholder: e.de + ' …',
        answer: e.de + ' ' + t.sg[kase].full,
        why: e.de + ' + ' + CASE_NAME[e.kase] + '  ·  ' + (e.sentence || '')
      };
    },
    grade: function (q, input) {
      var r = G.gradeText(input, q.answer, {});
      if (r.grade !== 'right') r.note = (r.note ? r.note + ' · ' : '') + q.why;
      return r;
    }
  };

  // ---------------------------------------------------------------- 접속사 어순

  var connectorDrill = {
    id: 'connector',
    label: '접속사 어순 3분류',
    part: '9-1 접속사 · 9-4 부사절',
    pos: 'conn',
    input: 'choice',
    applies: function (e) { return !!e.type; },
    make: function (e) {
      var T = global.CONNECTOR_TYPE;
      return {
        prompt: e.de,
        sub: '이 접속사 뒤에서 동사는 어디에 옵니까?  (' + e.ko + ')',
        choices: ['정치 (동사 2번째)', '도치 (주어가 동사 뒤)', '후치 (동사 문장 끝)'],
        answer: { main: '정치 (동사 2번째)', adv: '도치 (주어가 동사 뒤)',
                  sub: '후치 (동사 문장 끝)' }[e.type],
        why: T[e.type].sub + '\n' + e.sentence
      };
    },
    grade: function (q, input) {
      var ok = G.normalize(input) === q.answer;
      return { grade: ok ? 'right' : 'wrong',
               note: (ok ? '' : '정답: ' + q.answer + '\n') + q.why };
    }
  };

  // ---------------------------------------------------------------- 비교급

  var compDrill = {
    id: 'compGrammar',
    label: '비교급 · 최상급 (불규칙)',
    part: '8-2 비교급과 최상급',
    pos: 'comp',
    input: 'multi',
    applies: function (e) { return !!e.comp; },
    make: function (e) {
      return {
        prompt: e.de + (e.ko ? '  (' + e.ko + ')' : ''),
        sub: '비교급 · 최상급',
        fields: [
          { key: 'comp', label: '비교급',        answer: e.comp },
          { key: 'sup',  label: '최상급  am ___', answer: e.sup }
        ],
        answer: { comp: e.comp, sup: e.sup },
        why: e.irregular ? '완전 불규칙 — 통째로 외웁니다'
           : e.note ? e.note
           : '1음절 형용사는 비교급에서 움라우트가 붙습니다'
      };
    },
    grade: function (q, inputs) {
      var r = G.gradeTable(inputs, q.answer, {});
      if (r.grade !== 'right') r.note = q.why;
      return r;
    }
  };

  // ---------------------------------------------------------------- 동사 격지배

  var verbCaseDrill = {
    id: 'verbCase',
    label: '동사 격지배',
    part: '4-4 Rektion der Verben',
    pos: 'vcase',
    input: 'choice',
    applies: function (e) { return !!e.kase; },
    make: function (e) {
      return {
        prompt: e.de + ' + ___',
        sub: '이 동사는 어떤 격을 취합니까?  (' + e.ko + ')',
        choices: ['3격', '4격', '3격 + 4격', '2격'],
        answer: { D: '3격', A: '4격', DA: '3격 + 4격', G: '2격' }[e.kase],
        why: e.sentence
      };
    },
    grade: function (q, input) {
      var ok = G.normalize(input) === q.answer;
      return { grade: ok ? 'right' : 'wrong',
               note: (ok ? '' : '정답: ' + q.answer + ' — ') + q.why };
    }
  };

  // ---------------------------------------------------------------- 전치사격 보충어

  var verbPrepDrill = {
    id: 'verbPrep',
    label: '전치사격 보충어 (denken an …)',
    part: '14-3 전치사격 보충어',
    pos: 'vprep',
    input: 'text',
    applies: function (e) { return !!e.prep; },
    make: function (e) {
      return {
        prompt: e.de + ' ___ …',
        sub: '어떤 전치사를 씁니까?  (' + e.ko + ')',
        placeholder: 'an / auf / über …',
        answer: e.prep,
        kase: e.kase,
        why: e.de + ' + ' + e.prep + ' + ' + CASE_NAME[e.kase] + '\n' + e.sentence
      };
    },
    grade: function (q, input) {
      var r = G.gradeText(input, q.answer, {});
      r.note = (r.grade === 'right' ? '' : '정답: ' + q.answer + '  ') + q.why;
      return r;
    }
  };

  var verbPrepCaseDrill = {
    id: 'verbPrepCase',
    label: '전치사격 보충어의 격',
    part: '14-3 전치사격 보충어',
    pos: 'vprep',
    input: 'choice',
    applies: function (e) { return !!e.prep && (e.kase === 'A' || e.kase === 'D'); },
    make: function (e) {
      return {
        prompt: e.de + ' ' + e.prep + ' + ___',
        sub: '이 조합에서 전치사가 지배하는 격은?  (' + e.ko + ')',
        choices: ['3격', '4격'],
        answer: CASE_NAME[e.kase],
        why: e.sentence
      };
    },
    grade: function (q, input) {
      var ok = G.normalize(input) === q.answer;
      return { grade: ok ? 'right' : 'wrong',
               note: (ok ? '' : '정답: ' + q.answer + ' — ') + q.why };
    }
  };

  // ---------------------------------------------------------------- 등록

  var GRAMMAR_DRILLS = [
    prepCaseDrill, wechselDrill, prepPhraseDrill,
    connectorDrill, compDrill,
    verbCaseDrill, verbPrepDrill, verbPrepCaseDrill
  ];

  /**
   * 문법 항목을 표제어처럼 다루기 위해 id/pos/levels 를 붙인다.
   * grammar.js 는 예문을 문자열로 쓰지만 단어 항목은 배열이므로,
   * 여기서 두 형태를 맞춰 준다 (UI 가 e.ex[0].de 를 기대한다).
   */
  function norm(e, id, pos, levels) {
    var sentence = e.ex || e.wo || null;
    var o = Object.assign({}, e, {
      id: id, pos: pos, levels: levels,
      sentence: sentence,
      ex: sentence ? [{ de: sentence, lvl: levels[0] }] : []
    });
    return o;
  }

  function makeItems() {
    var out = [];
    (global.PREP_CASES || []).forEach(function (e) {
      out.push(norm(e, 'prep:' + e.de, 'prep', ['A1', 'A2', 'B1']));
    });
    (global.CONNECTORS || []).forEach(function (e) {
      out.push(norm(e, 'conn:' + e.de, 'conn', ['A2', 'B1']));
    });
    (global.COMPARATIVES || []).forEach(function (e) {
      out.push(norm(e, 'comp:' + e.de, 'comp', ['A2', 'B1']));
    });
    (global.VERB_CASES || []).forEach(function (e) {
      out.push(norm(e, 'vcase:' + e.de, 'vcase', ['A2', 'B1']));
    });
    (global.VERB_PREPS || []).forEach(function (e) {
      out.push(norm(e, 'vprep:' + e.de + '+' + e.prep, 'vprep', ['B1']));
    });
    return out;
  }

  global.GrammarDrills = {
    DRILLS: GRAMMAR_DRILLS,
    makeItems: makeItems
  };

  // 기존 레지스트리에 이어붙인다
  if (global.Drills) {
    GRAMMAR_DRILLS.forEach(function (d) {
      global.Drills.ALL.push(d);
      global.Drills.BY_ID[d.id] = d;
    });
  }
})(window);
