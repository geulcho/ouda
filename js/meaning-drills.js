/*
 * meaning-drills.js — 단어 뜻 테스트
 *
 * 뜻을 적어 넣은 단어만 출제한다. 뜻을 채워 나가면 출제 범위도 저절로 늘어난다.
 *
 * 뜻은 쉼표로 여러 개를 적어 둘 수 있고, 그중 하나만 맞혀도 정답이다.
 *   der Zug  →  "기차, 열차, 행렬"   에서 '기차' 만 적어도 맞다.
 *
 * 띄어쓰기나 사소한 표기 차이는 정규화로 흡수하고, 그래도 안 걸리는 것은
 * 채점 화면에서 '이것도 정답' 을 눌러 답지에 넣을 수 있다 (Store.addAlias).
 */
(function (global) {
  'use strict';

  var S = global.Store;
  var G = global.Grader;

  // 뜻을 나눌 때 쓰는 구분자. 쉼표가 기본이고 나머지는 덤이다.
  var SPLIT = /[,;/·∙、，]+/;

  /** "기차, 열차 (Zug)" -> ["기차", "열차"] */
  function senses(text) {
    return String(text || '')
      .split(SPLIT)
      .map(function (x) { return x.trim(); })
      .filter(Boolean);
  }

  /** 한 단어의 모든 정답 — 한국어 뜻 + 영어 뜻 + 사용자가 인정한 답 */
  function answers(e) {
    var out = senses(e.ko).concat(senses(e.en));
    (S.getAliases(e.id) || []).forEach(function (a) {
      if (out.indexOf(a) < 0) out.push(a);
    });
    return out;
  }

  function hasMeaning(e) {
    return !!(String(e.ko || '').trim() || String(e.en || '').trim());
  }

  /**
   * 비교용 정규화.
   * 띄어쓰기·문장부호·괄호 설명을 걷어낸다. 여기서 흡수되는 차이는
   * 굳이 '이것도 정답' 을 누르지 않아도 맞는 것으로 처리된다.
   */
  function key(s) {
    return String(s || '')
      .replace(/\([^)]*\)/g, '')      // 괄호 설명
      .replace(/[~\-–—.,!?;:'"’”“·]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  function matches(input, list) {
    var k = key(input);
    if (!k) return false;
    for (var i = 0; i < list.length; i++) {
      if (key(list[i]) === k) return true;
    }
    return false;
  }

  function headword(e) {
    var art = { m: 'der', f: 'die', n: 'das' }[e.gender];
    return e.pos === 'noun' && art ? art + ' ' + e.de : e.de;
  }

  /** 문법 정보 한 줄 — 채점 뒤 같이 보여준다 */
  function info(e) {
    if (e.pos === 'noun' && e.plural) return 'pl. die ' + e.plural;
    if (e.pos === 'verb' && e.pp) {
      return [e.pres3, e.praet, (e.aux === 'sein' ? 'ist ' : 'hat ') + e.pp]
             .filter(Boolean).join(' · ');
    }
    return '';
  }

  // ================================================================ 독일어 → 뜻

  var deToKoDrill = {
    id: 'meaningDe',
    label: '뜻 맞히기 (독일어 → 뜻)',
    part: '어휘 — 뜻을 적어 둔 단어만',
    pos: '*',
    input: 'text',
    allowAlias: true,               // 채점 뒤 '이것도 정답' 을 쓸 수 있는 드릴
    applies: hasMeaning,
    make: function (e) {
      var list = answers(e);
      return {
        prompt: headword(e),
        sub: list.length > 1
          ? '뜻을 적으세요 (' + list.length + '개 중 하나만 맞으면 정답)'
          : '뜻을 적으세요',
        placeholder: '',
        answer: list[0],
        allAnswers: list,
        wordId: e.id,
        extra: info(e)
      };
    },
    grade: function (q, input) {
      var got = String(input || '').trim();
      if (!got) {
        return { grade: 'wrong', note: '정답: ' + q.allAnswers.join(' / '), canAlias: false };
      }
      if (matches(got, q.allAnswers)) {
        return {
          grade: 'right',
          note: q.allAnswers.length > 1 ? '전체 뜻: ' + q.allAnswers.join(' / ') : null
        };
      }
      return {
        grade: 'wrong',
        note: '정답: ' + q.allAnswers.join(' / ') + (q.extra ? '\n' + q.extra : ''),
        // 비슷한데 답지에 없는 경우 — 사용자가 직접 인정할 수 있게 한다
        canAlias: true,
        aliasWord: q.wordId,
        aliasText: got
      };
    }
  };

  // ================================================================ 뜻 → 독일어

  var koToDeDrill = {
    id: 'meaningKo',
    label: '단어 맞히기 (뜻 → 독일어)',
    part: '어휘 — 뜻을 적어 둔 단어만',
    pos: '*',
    input: 'text',
    applies: hasMeaning,
    make: function (e) {
      var list = answers(e);
      var isNoun = e.pos === 'noun' && e.gender && e.gender !== 'pl';
      return {
        prompt: list.join(' · '),
        sub: isNoun ? '독일어로 — 관사와 함께' : '독일어로',
        placeholder: isNoun ? 'der Apfel' : '',
        answer: headword(e),
        word: e.de,
        gender: isNoun ? e.gender : null,
        extra: info(e)
      };
    },
    grade: function (q, input) {
      var r = q.gender
        ? G.gradeArticleNoun(input, q.gender, q.word, { strictCase: S.settings().strictCase })
        : G.gradeText(input, q.answer, { strictCase: S.settings().strictCase });
      if (r.grade !== 'right') {
        r.note = (r.note ? r.note + '\n' : '') + '정답: ' + q.answer +
                 (q.extra ? '  (' + q.extra + ')' : '');
      }
      return r;
    }
  };

  // ================================================================ 등록

  var DRILLS = [deToKoDrill, koToDeDrill];

  global.MeaningDrills = {
    DRILLS: DRILLS,
    senses: senses,
    answers: answers,
    hasMeaning: hasMeaning,
    key: key,
    matches: matches
  };

  if (global.Drills) {
    DRILLS.forEach(function (d) {
      global.Drills.ALL.push(d);
      global.Drills.BY_ID[d.id] = d;
    });
  }
})(window);
