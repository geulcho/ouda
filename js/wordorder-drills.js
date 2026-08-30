/*
 * wordorder-drills.js — 어순 드릴
 *
 * 목차 1-2(문장 성분과 어순) · 7-5(부사구) · 9-4(부사절) · 11(관계절) · 17-2(nicht)
 *
 * 채점은 js/wordorder.js 의 규칙 검증기가 한다. 정답 문자열과 비교하지 않으므로
 * 맞는 배열은 전부 정답이 되고, 틀리면 어긴 규칙을 짚어 준다.
 */
(function (global) {
  'use strict';

  var W = global.WordOrder;

  function shuffled(list) {
    var a = list.slice();
    for (var t = 0; t < 8; t++) {
      global.SRS.shuffle(a);
      if (a.map(function (c) { return c.t; }).join(' ') !==
          list.map(function (c) { return c.t; }).join(' ')) break;
    }
    return a;
  }

  function violationNote(r, extra) {
    if (r.ok) return extra || null;
    var v = r.violations[0];
    return v.msg + (v.hint ? '\n' + v.hint : '') + (extra ? '\n' + extra : '');
  }

  /** 규칙 검증기로 채점 — 맞는 배열은 전부 정답 */
  function gradeByRules(q, arrangement) {
    // 성분 배열이 아니면(빈 답·문자열) 채점할 게 없다
    if (!arrangement || !arrangement.length || typeof arrangement === 'string' ||
        typeof arrangement[0] !== 'object') {
      return { grade: 'wrong', note: '정답 예: ' + q.answer };
    }
    // 성분을 빼먹으면 안 된다. 남은 걸 안 쓰고도 문법적으로 맞는 배열이 나올 수 있다.
    if (q.tokens && arrangement.length !== q.tokens.length) {
      var missing = q.tokens.filter(function (t) { return arrangement.indexOf(t) < 0; });
      return {
        grade: 'wrong',
        note: '성분을 전부 써야 합니다. 빠진 것: ' +
              missing.map(function (c) { return '"' + c.t + '"'; }).join(', ') +
              '\n정답 예: ' + q.answer
      };
    }

    var r = W.validate(q.sentType, arrangement);
    if (r.ok) {
      var mine = W.render(arrangement, q.sentType);
      var same = mine === q.answer;
      return {
        grade: 'right',
        note: same ? null : '이 배열도 맞습니다. 원문은 "' + q.answer + '" 입니다.',
        fields: W.fields(q.sentType, arrangement)
      };
    }
    return {
      grade: 'wrong',
      note: violationNote(r, '정답 예: ' + q.answer),
      fields: W.fields(q.sentType, arrangement)
    };
  }

  // ================================================================ 정동사 자리

  /*
   * Goethe 예문에서 자동으로 만든다. 데이터를 새로 안 만들고도 2,400문장이 나온다.
   *
   * V2 는 "두 번째 낱말"이 아니라 "두 번째 성분"이다. Vorfeld 는 정동사 앞 전체이므로
   * 정동사만 찾으면 성분 경계를 정확히 그을 수 있다. 이 드릴이 그 차이를 직접 보여준다.
   */
  var verbForms = null;

  function buildVerbForms() {
    if (verbForms) return verbForms;
    var C = global.Conjugation, f = {};
    ['ich', 'du', 'er', 'wir', 'ihr', 'sie'].forEach(function (p) {
      (global.VERBS || []).forEach(function (v) {
        if (!v.pres3) return;
        try { var a = C.present(v, p); if (a) f[a.split(' ')[0].toLowerCase()] = 1; } catch (e) {}
        try { var b = C.preterite(v, p); if (b) f[b.split(' ')[0].toLowerCase()] = 1; } catch (e) {}
      });
    });
    ('bin bist ist sind seid war warst waren wart habe hast hat haben habt hatte hatten ' +
     'werde wirst wird werden werdet wurde wurden kann kannst können könnt konnte konnten ' +
     'muss musst müssen müsst musste mussten will willst wollen wollt wollte wollten ' +
     'soll sollst sollen sollt sollte sollten darf darfst dürfen dürft durfte ' +
     'mag magst mögen möchte möchten weiß weißt wissen wisst wusste')
      .split(' ').forEach(function (x) { f[x] = 1; });
    verbForms = f;
    return f;
  }

  /** 문장에서 정동사 위치를 찾는다 (못 찾으면 -1) */
  function findFiniteVerb(words) {
    var f = buildVerbForms();
    for (var i = 0; i < words.length; i++) {
      if (f[words[i].replace(/[.,!?;:]/g, '').toLowerCase()]) return i;
    }
    return -1;
  }

  function usableSentence(e) {
    var ex = (e.ex || []);
    for (var i = 0; i < ex.length; i++) {
      var t = ex[i].de;
      if (/[?!]/.test(t)) continue;                        // 의문문·명령문은 V2 가 아니다
      if (/^(Wenn|Weil|Als|Obwohl|Da|Nachdem|Bevor|Ob)\b/.test(t)) continue;  // 종속절 선행
      var w = t.replace(/[.]/g, '').split(/\s+/);
      if (w.length < 4 || w.length > 9) continue;
      var vi = findFiniteVerb(w);
      if (vi < 1 || vi >= w.length - 1) continue;           // 앞자리가 있고 뒤에도 뭔가 있어야
      return { text: t, words: w, vi: vi };
    }
    return null;
  }

  var verbSlotDrill = {
    id: 'verbSlot',
    label: '정동사 자리 (V2)',
    part: '1-2 문장 성분과 기본 어순',
    pos: '*',
    input: 'slot',
    applies: function (e) { return !!usableSentence(e); },
    make: function (e) {
      var s = usableSentence(e);
      if (!s) return null;
      var verb = s.words[s.vi].replace(/[.,]/g, '');
      var rest = s.words.slice(0, s.vi).concat(s.words.slice(s.vi + 1));

      return {
        prompt: rest.join(' ').replace(/\s+([.,])/g, '$1'),
        sub: '"' + verb + '" 가 들어갈 자리를 고르세요',
        slotWords: rest,
        verb: verb,
        answer: s.vi,
        original: s.text,
        vorfeld: s.words.slice(0, s.vi).join(' '),
        sentType: 'main'
      };
    },
    grade: function (q, input) {
      var got = parseInt(input, 10);
      var ok = got === q.answer;
      var note = '정동사는 두 번째 **성분** 뒤가 아니라, 두 번째 성분 **자리**입니다.\n' +
                 '앞자리(Vorfeld): "' + q.vorfeld + '" — ' +
                 q.vorfeld.split(/\s+/).length + '낱말이지만 성분은 하나입니다.\n' +
                 q.original;
      return { grade: ok ? 'right' : 'wrong', note: note };
    }
  };

  // ================================================================ 라벨 문장 드릴

  /** 성분 카드를 눌러 문장을 만드는 드릴 하나를 찍어낸다 */
  function assembleDrill(id, label, part, rule, subText) {
    return {
      id: id,
      label: label,
      part: part,
      pos: 'satz',
      input: 'assemble',
      applies: function (e) {
        return e.chunks && (e.teaches || []).indexOf(rule) >= 0;
      },
      make: function (e) {
        return {
          prompt: '성분을 눌러 문장을 만드세요',
          sub: subText,
          tokens: shuffled(e.chunks),
          chunkMode: true,
          sentType: e.type,
          answer: W.render(e.chunks, e.type),
          answerChunks: e.chunks,
          teaches: e.teaches,
          src: e.src || null
        };
      },
      grade: gradeByRules
    };
  }

  var freeOrderDrill = assembleDrill(
    'wordOrder', '어순 조립 (문장 만들기)', '1-2 문장 성분과 기본 어순', 'V2',
    '정동사는 두 번째 성분입니다. 앞자리에는 무엇이 와도 됩니다');

  var vorfeldDrill = {
    id: 'vorfeld',
    label: '앞자리 바꾸기 (Vorfeld)',
    part: '1-2 도치문에서 주어의 위치',
    pos: 'satz',
    input: 'assemble',
    applies: function (e) {
      if (!e.chunks || e.type !== 'main') return false;
      // 앞자리 후보가 둘 이상이어야 문제가 된다
      return e.chunks.filter(function (c) { return !W.NO_VORFELD[c.role]; }).length >= 2;
    },
    make: function (e) {
      var cands = e.chunks.filter(function (c) {
        return !W.NO_VORFELD[c.role] && c.role !== 'S';
      });
      if (!cands.length) return null;
      var want = cands[Math.floor(Math.random() * cands.length)];
      // 나머지를 원래 순서로 두면 주어가 뒤로 밀린다. 표준 순서로 다시 세운다.
      var model = W.arrange(e.type, e.chunks, want);
      return {
        prompt: '"' + want.t + '" 로 시작하는 문장을 만드세요',
        sub: '앞자리를 바꾸면 주어가 동사 뒤로 갑니다 — 동사는 그대로 두 번째',
        tokens: shuffled(e.chunks),
        chunkMode: true,
        sentType: e.type,
        mustStart: want.t,
        answerChunks: model,
        answer: W.render(model, e.type)
      };
    },
    grade: function (q, arrangement) {
      if (!arrangement || !arrangement.length) {
        return { grade: 'wrong', note: '정답 예: ' + q.answer };
      }
      if (arrangement[0].t !== q.mustStart) {
        return { grade: 'wrong',
          note: '"' + q.mustStart + '" 로 시작해야 합니다.\n정답 예: ' + q.answer };
      }
      return gradeByRules(q, arrangement);
    }
  };

  var tekamoloDrill = assembleDrill(
    'tekamolo', 'TeKaMoLo (부사구 순서)', '7-5 부사구 Adverbiale Angaben', 'TeKaMoLo',
    '부사구는 시간 → 이유 → 방법 → 장소 순서입니다 (언제·왜·어떻게·어디서)');

  var objOrderDrill = assembleDrill(
    'objOrder', '목적어 순서', '4-4 동사의 격 지배', 'ObjektOrder',
    '명사끼리는 3격 → 4격, 대명사가 끼면 대명사가 앞');

  var satzklammerDrill = assembleDrill(
    'satzklammer', 'Satzklammer (문장괄호)', '4-2 분리동사 · 5-2 Perfekt', 'Satzklammer',
    '정동사와 문장 끝 동사부가 짝을 이뤄 문장을 감쌉니다');

  var subClauseDrill = assembleDrill(
    'subOrder', '종속절 어순 (동사 후치)', '9-4 부사절 Adverbialsätze', 'V-End',
    '종속접속사가 맨 앞, 정동사가 맨 끝으로 갑니다');

  var nichtDrill2 = assembleDrill(
    'nichtOrder', 'nicht 위치 (성분)', '17-2 nicht와 kein', 'NichtPos',
    'nicht 는 뒤로 밀 수 없는 것 앞에서 멈춥니다');

  // ================================================================ 등록

  var DRILLS = [
    verbSlotDrill, freeOrderDrill, vorfeldDrill,
    tekamoloDrill, objOrderDrill, satzklammerDrill, subClauseDrill, nichtDrill2
  ];

  /** 라벨 문장을 표제어처럼 다루기 위해 id/pos/levels 를 붙인다 */
  function makeItems() {
    return (global.SENTENCES || []).map(function (s) {
      return {
        id: 'satz:' + s.id,
        pos: 'satz',
        de: W.render(s.chunks, s.type),
        levels: ['B1'],
        chunks: s.chunks,
        type: s.type,
        teaches: s.teaches,
        src: s.src || null,
        ex: []
      };
    });
  }

  global.WordOrderDrills = { DRILLS: DRILLS, makeItems: makeItems, findFiniteVerb: findFiniteVerb };

  if (global.Drills) {
    DRILLS.forEach(function (d) {
      // 낱말 섞기 wordOrder 를 성분 기반으로 갈아끼운다 (학습 기록 유지)
      var at = -1;
      global.Drills.ALL.forEach(function (x, i) { if (x.id === d.id) at = i; });
      if (at >= 0) global.Drills.ALL[at] = d;
      else global.Drills.ALL.push(d);
      global.Drills.BY_ID[d.id] = d;
    });
  }
})(window);
