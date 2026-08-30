/*
 * grader.js — 답 채점
 *
 * 타이핑 모드의 성패가 여기 달렸다.
 * 너무 빡빡하면 아는 것도 틀렸다고 하고, 너무 느슨하면 철자를 안 외우게 된다.
 *
 * 판정은 세 단계:
 *   right   정답
 *   partial 정답으로 치되 경고 (대소문자, 오타 1글자)
 *   wrong   오답
 *
 * 성과 철자는 따로 채점한다. 'die Apfel' 은 철자는 맞고 성만 틀린 것이므로
 * SRS 도 '성' 카드만 되돌려야 한다.
 */
(function (global) {
  'use strict';

  var ARTICLES = ['der', 'die', 'das'];

  /** 움라우트 없는 키보드 대응: ae/oe/ue/ss 를 ä/ö/ü/ß 로 본다 */
  function foldUmlaut(s) {
    return s
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue');
  }

  function normalize(s) {
    return String(s == null ? '' : s)
      .replace(/[‘’“”]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** 비교용 키 — 대소문자·움라우트 표기 차이를 무시 */
  function key(s) {
    return foldUmlaut(normalize(s)).toLowerCase();
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(
          prev[j] + 1,
          cur[j - 1] + 1,
          prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
      for (j = 0; j <= b.length; j++) prev[j] = cur[j];
    }
    return prev[b.length];
  }

  /**
   * 단일 문자열 채점.
   * @param opts.noun       명사인가 (대문자 규칙 적용)
   * @param opts.strictCase 대소문자를 틀리면 오답 처리
   * @param opts.alts       추가 정답들
   */
  function gradeText(input, expected, opts) {
    opts = opts || {};
    var got = normalize(input);
    var want = normalize(expected);

    if (!got) return { grade: 'wrong', note: '답을 입력하지 않았습니다.' };

    var candidates = [want].concat(opts.alts || []).filter(Boolean).map(normalize);

    // 완전 일치
    for (var i = 0; i < candidates.length; i++) {
      if (got === candidates[i]) return { grade: 'right' };
    }

    // 대소문자/움라우트 표기만 다름
    for (var j = 0; j < candidates.length; j++) {
      if (key(got) === key(candidates[j])) {
        var sameCase = got.toLowerCase() !== candidates[j].toLowerCase() ? false
                     : got !== candidates[j];
        if (opts.noun && /^[a-zäöüß]/.test(got) && /^[A-ZÄÖÜ]/.test(candidates[j])) {
          return opts.strictCase
            ? { grade: 'wrong', note: '독일어 명사는 항상 대문자로 씁니다.' }
            : { grade: 'partial', note: '명사는 항상 대문자! → ' + candidates[j] };
        }
        return { grade: 'partial', note: '표기 차이 → ' + candidates[j] };
      }
    }

    // 오타 한 글자
    for (var k = 0; k < candidates.length; k++) {
      if (levenshtein(key(got), key(candidates[k])) <= 1) {
        return { grade: 'partial', note: '오타 → ' + candidates[k] };
      }
    }

    return { grade: 'wrong', note: null };
  }

  /**
   * '관사 + 명사' 채점. 성과 철자를 분리해서 어느 쪽이 틀렸는지 알려준다.
   * @returns {grade, genderOk, spellingOk, note}
   */
  function gradeArticleNoun(input, gender, word, opts) {
    opts = opts || {};
    var wantArticle = { m: 'der', f: 'die', n: 'das', pl: 'die' }[gender];
    var got = normalize(input);
    var parts = got.split(' ');

    var gotArticle = null, gotWord = got;
    if (parts.length > 1 && ARTICLES.indexOf(parts[0].toLowerCase()) >= 0) {
      gotArticle = parts[0].toLowerCase();
      gotWord = parts.slice(1).join(' ');
    }

    if (!gotArticle) {
      return {
        grade: 'wrong', genderOk: false, spellingOk: key(gotWord) === key(word),
        note: '관사까지 같이 써야 합니다. → ' + wantArticle + ' ' + word
      };
    }

    var genderOk = gotArticle === wantArticle;
    var spell = gradeText(gotWord, word, { noun: true, strictCase: opts.strictCase, alts: opts.alts });
    var spellingOk = spell.grade !== 'wrong';

    if (genderOk && spell.grade === 'right') {
      return { grade: 'right', genderOk: true, spellingOk: true };
    }
    if (genderOk && spell.grade === 'partial') {
      return { grade: 'partial', genderOk: true, spellingOk: true, note: spell.note };
    }
    if (!genderOk && spellingOk) {
      return {
        grade: 'wrong', genderOk: false, spellingOk: true,
        note: '철자는 맞았습니다. 성이 틀렸습니다: ' + gotArticle + ' → ' + wantArticle
      };
    }
    if (genderOk && !spellingOk) {
      return {
        grade: 'wrong', genderOk: true, spellingOk: false,
        note: '성은 맞았습니다. 철자가 틀렸습니다 → ' + word
      };
    }
    return {
      grade: 'wrong', genderOk: false, spellingOk: false,
      note: '정답: ' + wantArticle + ' ' + word
    };
  }

  /** 표(여러 칸) 채점 — 칸별 정오와 전체 등급 */
  function gradeTable(inputs, expected, opts) {
    opts = opts || {};
    var cells = [], right = 0, partial = 0, total = 0;
    Object.keys(expected).forEach(function (k) {
      if (expected[k] == null) return;
      total++;
      var r = gradeText(inputs[k], expected[k], opts);
      if (r.grade === 'right') right++;
      else if (r.grade === 'partial') partial++;
      cells.push({ key: k, grade: r.grade, note: r.note, want: expected[k], got: inputs[k] });
    });
    var grade = (right === total) ? 'right'
              : (right + partial === total) ? 'partial'
              : 'wrong';
    return { grade: grade, cells: cells, right: right, partial: partial, total: total };
  }

  global.Grader = {
    normalize: normalize, key: key, foldUmlaut: foldUmlaut, levenshtein: levenshtein,
    gradeText: gradeText, gradeArticleNoun: gradeArticleNoun, gradeTable: gradeTable
  };
})(window);
