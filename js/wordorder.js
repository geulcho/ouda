/*
 * wordorder.js — 독일어 어순 검증기
 *
 * 배열을 정답 문자열과 비교하지 않는다. 규칙을 하나씩 검사한다.
 * 그래야 맞는 배열은 전부 정답이 되고, 틀렸을 땐 무슨 규칙을 어겼는지 짚어 줄 수 있다.
 *
 *   Ich gehe morgen ins Kino.     정답
 *   Morgen gehe ich ins Kino.     정답  (Vorfeld 를 바꿨을 뿐)
 *   Ins Kino gehe ich morgen.     정답
 *   Ich morgen gehe ins Kino.     오답  — 정동사가 3번째 성분
 *
 * 문장은 낱말이 아니라 '성분(Satzglied)' 목록으로 다룬다.
 * V2 가 '두 번째 낱말'이 아니라 '두 번째 성분'이기 때문이다.
 */
(function (global) {
  'use strict';

  /*
   * 성분 역할
   *   S     주어
   *   V     정동사 (인칭변화한 동사)
   *   Vend  문장 끝 동사부 — 과거분사 · 부정형 · 분리 접두어 (Satzklammer 오른쪽)
   *   Te    시간 (temporal)      Ka  이유 (kausal)
   *   Mo    방법 (modal)         Lo  장소 (lokal)
   *   Dat   3격 목적어(명사)      Akk 4격 목적어(명사)
   *   DatP  3격 목적어(대명사)    AkkP 4격 목적어(대명사)
   *   Neg   nicht
   *   Präd  술어 (sein/werden 의 보어 — 형용사·명사)
   *   Konj  종속접속사
   *   W     의문사
   */
  var ROLE = {
    S:    { label: '주어',        ko: '누가' },
    V:    { label: '정동사',      ko: '동사' },
    Vend: { label: '문장 끝 동사부', ko: '과거분사·부정형·접두어' },
    Te:   { label: '시간',        ko: '언제',   tekamolo: 0 },
    Ka:   { label: '이유',        ko: '왜',     tekamolo: 1 },
    Mo:   { label: '방법',        ko: '어떻게', tekamolo: 2 },
    Lo:   { label: '장소',        ko: '어디서', tekamolo: 3 },
    Dat:  { label: '3격 목적어',  ko: '~에게' },
    Akk:  { label: '4격 목적어',  ko: '~을/를' },
    DatP: { label: '3격 대명사',  ko: '~에게' },
    AkkP: { label: '4격 대명사',  ko: '~을/를' },
    Neg:  { label: 'nicht',       ko: '부정' },
    'Präd': { label: '술어',      ko: '~이다/되다' },
    Konj: { label: '종속접속사',  ko: '접속사' },
    W:    { label: '의문사',      ko: '의문사' }
  };

  var ADVERBIAL = { Te: 1, Ka: 1, Mo: 1, Lo: 1 };
  var PRONOUN_OBJ = { DatP: 1, AkkP: 1 };
  var OBJECT = { Dat: 1, Akk: 1, DatP: 1, AkkP: 1 };

  // Vorfeld 에 올 수 없는 것들
  var NO_VORFELD = { V: 1, Vend: 1, Neg: 1, DatP: 1, AkkP: 1, Konj: 1 };

  // 인칭대명사 — 주어가 대명사인지 명사인지에 따라 가운데 자리 순서가 달라진다
  var PERSONAL = {
    ich: 1, du: 1, er: 1, sie: 1, es: 1, wir: 1, ihr: 1, man: 1,
    mich: 1, dich: 1, ihn: 1, uns: 1, euch: 1,
    mir: 1, dir: 1, ihm: 1, ihnen: 1, das: 1
  };

  function roleOf(c) { return c.role; }
  function textOf(c) { return c.t; }

  function isPronoun(c) {
    return PERSONAL[String(c.t).toLowerCase()] === true || PERSONAL[String(c.t).toLowerCase()] === 1;
  }

  function idx(arr, pred) {
    for (var i = 0; i < arr.length; i++) if (pred(arr[i], i)) return i;
    return -1;
  }

  function fail(rule, msg, hint) {
    return { rule: rule, msg: msg, hint: hint || null };
  }

  // ---------------------------------------------------------------- 주문장

  function checkMain(arr) {
    var v = [];
    var roles = arr.map(roleOf);

    // ① 정동사는 정확히 두 번째 성분
    var vi = roles.indexOf('V');
    if (vi < 0) {
      v.push(fail('V2', '정동사가 없습니다.'));
      return v;
    }
    if (vi !== 1) {
      v.push(fail('V2',
        '평서문에서 정동사는 두 번째 **성분**입니다. 지금은 ' + (vi + 1) + '번째입니다.',
        '앞자리(Vorfeld)에는 성분 하나만 옵니다. 그 성분이 몇 낱말이든 상관없습니다 — ' +
        '"Vor der Abfahrt rufe ich an." 도 정동사가 두 번째 성분입니다.'));
    }

    // ② Vorfeld 에 올 수 없는 것
    if (arr.length && NO_VORFELD[roles[0]]) {
      v.push(fail('Vorfeld',
        ROLE[roles[0]].label + ' 는 앞자리에 올 수 없습니다.',
        roles[0] === 'Neg' ? 'nicht 는 Vorfeld 에 오지 않습니다.'
          : PRONOUN_OBJ[roles[0]] ? '대명사 목적어는 앞자리에 잘 오지 않습니다.'
          : null));
    }

    // ③ Satzklammer — 문장 끝 동사부는 맨 끝
    var ve = roles.indexOf('Vend');
    if (ve >= 0 && ve !== arr.length - 1) {
      v.push(fail('Satzklammer',
        '"' + textOf(arr[ve]) + '" 은 문장 맨 끝으로 갑니다.',
        '정동사와 짝을 이뤄 문장을 감쌉니다 (문장괄호). ' +
        '가운데 있는 것들이 그 사이에 들어갑니다.'));
    }

    v = v.concat(checkMittelfeld(arr, vi));
    return v;
  }

  // ---------------------------------------------------------------- 종속절

  function checkSub(arr) {
    var v = [];
    var roles = arr.map(roleOf);

    if (roles[0] !== 'Konj') {
      v.push(fail('Konj', '종속접속사가 맨 앞에 옵니다.'));
    }

    var vi = roles.indexOf('V');
    if (vi < 0) { v.push(fail('V-End', '정동사가 없습니다.')); return v; }

    if (vi !== arr.length - 1) {
      v.push(fail('V-End',
        '종속절에서는 정동사가 맨 끝으로 갑니다. 지금은 ' + (vi + 1) + '/' + arr.length + ' 자리입니다.',
        'weil ich müde **bin** — bin 이 끝입니다.'));
    }

    // Vend 는 정동사 바로 앞
    var ve = roles.indexOf('Vend');
    if (ve >= 0 && vi >= 0 && ve !== vi - 1) {
      v.push(fail('Satzklammer',
        '"' + textOf(arr[ve]) + '" 은 정동사 바로 앞에 옵니다.',
        '..., weil ich gestern **gearbeitet habe**.'));
    }

    v = v.concat(checkMittelfeld(arr, 0, ve >= 0 ? ve : vi));
    return v;
  }

  // ---------------------------------------------------------------- 의문문

  function checkWFrage(arr) {
    var v = [];
    var roles = arr.map(roleOf);
    if (roles[0] !== 'W') v.push(fail('W', '의문사가 맨 앞에 옵니다.'));
    var vi = roles.indexOf('V');
    if (vi !== 1) {
      v.push(fail('V2', 'W-의문문도 정동사가 두 번째입니다.',
        '**Wann kommst** du? — 의문사 다음이 바로 동사입니다.'));
    }
    var ve = roles.indexOf('Vend');
    if (ve >= 0 && ve !== arr.length - 1) {
      v.push(fail('Satzklammer', '"' + textOf(arr[ve]) + '" 은 맨 끝입니다.'));
    }
    return v.concat(checkMittelfeld(arr, vi));
  }

  function checkJaNein(arr) {
    var v = [];
    var roles = arr.map(roleOf);
    if (roles[0] !== 'V') {
      v.push(fail('V1', '예/아니오 의문문은 정동사로 시작합니다.',
        '**Kommst** du morgen? — 앞자리를 비우고 동사부터 시작합니다.'));
    }
    var ve = roles.indexOf('Vend');
    if (ve >= 0 && ve !== arr.length - 1) {
      v.push(fail('Satzklammer', '"' + textOf(arr[ve]) + '" 은 맨 끝입니다.'));
    }
    return v.concat(checkMittelfeld(arr, 0));
  }

  // ---------------------------------------------------------------- Mittelfeld

  /**
   * 가운데 자리 검사 — 정동사 뒤부터 문장 끝 동사부 앞까지.
   * @param from 정동사 위치 (이 뒤부터가 Mittelfeld)
   * @param to   끝 경계 (없으면 Vend 위치 또는 배열 끝)
   */
  function checkMittelfeld(arr, from, to) {
    var v = [];
    var roles = arr.map(roleOf);
    var end = (to === undefined)
      ? (roles.indexOf('Vend') >= 0 ? roles.indexOf('Vend') : arr.length)
      : to;
    var mid = arr.slice(from + 1, end);
    if (mid.length < 2) return v;

    var midRoles = mid.map(roleOf);

    // ④ TeKaMoLo — 시간 → 이유 → 방법 → 장소
    var advs = [];
    midRoles.forEach(function (r, i) {
      if (ADVERBIAL[r]) advs.push({ r: r, i: i, rank: ROLE[r].tekamolo });
    });
    for (var a = 1; a < advs.length; a++) {
      if (advs[a].rank < advs[a - 1].rank) {
        v.push(fail('TeKaMoLo',
          ROLE[advs[a - 1].r].label + ' 보다 ' + ROLE[advs[a].r].label + ' 가 앞에 옵니다.',
          '부사구는 시간 → 이유 → 방법 → 장소 순서입니다 (TeKaMoLo). ' +
          '언제 → 왜 → 어떻게 → 어디서.'));
        break;
      }
    }

    // ⑤ 목적어 순서
    var objs = [];
    midRoles.forEach(function (r, i) { if (OBJECT[r]) objs.push({ r: r, i: i }); });
    if (objs.length === 2) {
      var first = objs[0].r, second = objs[1].r;
      var bothNoun = (first === 'Dat' || first === 'Akk') && (second === 'Dat' || second === 'Akk');
      var anyPron = PRONOUN_OBJ[first] || PRONOUN_OBJ[second];

      if (bothNoun && first === 'Akk') {
        v.push(fail('ObjektOrder',
          '목적어가 둘 다 명사면 3격이 먼저입니다.',
          'Ich gebe **dem Mann das Buch**. (3격 → 4격)'));
      } else if (anyPron && !PRONOUN_OBJ[first]) {
        v.push(fail('ObjektOrder',
          '대명사 목적어가 명사 목적어보다 앞에 옵니다.',
          'Ich gebe **es dem Mann**. (대명사 먼저)'));
      } else if (PRONOUN_OBJ[first] && PRONOUN_OBJ[second] && first === 'DatP') {
        v.push(fail('ObjektOrder',
          '둘 다 대명사면 4격이 먼저입니다.',
          'Ich gebe **es ihm**. (4격 → 3격)'));
      }
    }

    // ⑥ 주어는 가운데 자리의 앞쪽 — 부사구·명사 목적어보다 앞
    //    (Vorfeld 에 없으면 정동사 바로 뒤가 제자리다.
    //     "Morgen fahre nach Berlin ich" 처럼 뒤로 밀면 독일어가 아니게 된다.
    //     단, 대명사 목적어는 명사 주어보다 앞에 올 수 있다 — 그건 ⑦ 에서 따로 본다)
    var si = midRoles.indexOf('S');
    if (si > 0) {
      for (var b = 0; b < si; b++) {
        var rb = midRoles[b];
        // 대명사 목적어가 명사 주어 앞에 오는 건 정상이다 (⑦ 에서 다룬다)
        if (PRONOUN_OBJ[rb]) continue;
        if (ADVERBIAL[rb] || rb === 'Dat' || rb === 'Akk' || rb === 'Präd') {
          v.push(fail('SubjektVorn',
            '주어가 너무 뒤에 있습니다. ' + ROLE[rb].label + ' 보다 앞으로 옵니다.',
            '주어가 앞자리(Vorfeld)에 없으면 정동사 바로 뒤가 제자리입니다. ' +
            'Morgen fahre **ich** nach Berlin.'));
          break;
        }
      }
    }

    // ⑦ 대명사 목적어는 앞쪽으로 — 부사구와 '명사' 주어보다 앞.
    //    다만 대명사 주어보다는 뒤다. Kannst du mir helfen? 에서 du 가 먼저다.
    for (var p = 0; p < midRoles.length; p++) {
      if (!PRONOUN_OBJ[midRoles[p]]) continue;
      var hit = null;
      for (var q = 0; q < p; q++) {
        if (ADVERBIAL[midRoles[q]]) { hit = mid[q]; break; }
        if (midRoles[q] === 'S' && !isPronoun(mid[q])) { hit = mid[q]; break; }
      }
      // 대명사 주어가 있으면 그보다는 뒤여야 한다 (대명사끼리는 1격 → 4격 → 3격)
      for (var q2 = p + 1; q2 < midRoles.length; q2++) {
        if (midRoles[q2] === 'S' && isPronoun(mid[q2])) {
          v.push(fail('PronomenVorn',
            '대명사끼리는 주어가 먼저입니다. "' + textOf(mid[q2]) + '" 를 앞으로.',
            '1격 → 4격 → 3격 순서입니다. Kannst **du mir** helfen? / weil **ich es ihm** gesagt habe.'));
          hit = null;
          q2 = midRoles.length;
          p = midRoles.length;
        }
      }
      if (hit) {
        v.push(fail('PronomenVorn',
          '대명사 목적어는 "' + textOf(hit) + '" 보다 앞으로 옵니다.',
          '대명사는 가운데 자리 앞쪽에 몰립니다. ' +
          'Gestern hat **mir** mein Vater geholfen. ' +
          '(단, 대명사 주어보다는 뒤 — Kannst **du mir** helfen?)'));
        break;
      }
    }

    // ⑧ nicht — 문장 끝 동사부·술어·장소 앞
    var ni = midRoles.indexOf('Neg');
    if (ni >= 0) {
      for (var n = ni + 1; n < midRoles.length; n++) {
        var r2 = midRoles[n];
        if (r2 === 'Te' || r2 === 'Ka' || OBJECT[r2] || r2 === 'S') {
          v.push(fail('NichtPos',
            'nicht 가 너무 앞에 있습니다. ' + ROLE[r2].label + ' 뒤로 갑니다.',
            'nicht 는 뒤로 밀 수 없는 것(술어·장소·문장 끝 동사부) 바로 앞에서 멈춥니다.'));
          break;
        }
      }
    }

    return v;
  }

  // ---------------------------------------------------------------- 공개 API

  var CHECKERS = {
    main: checkMain,
    sub: checkSub,
    wFrage: checkWFrage,
    jaNein: checkJaNein
  };

  /**
   * 배열이 문법에 맞는가.
   * @param type 'main' | 'sub' | 'wFrage' | 'jaNein'
   * @param arrangement [{t, role}] 사용자가 만든 순서
   * @returns { ok, violations: [{rule, msg, hint}], text }
   */
  function validate(type, arrangement) {
    var fn = CHECKERS[type] || checkMain;
    var violations = fn(arrangement);
    return {
      ok: violations.length === 0,
      violations: violations,
      text: render(arrangement)
    };
  }

  /** 성분 배열을 문장 문자열로 (첫 글자 대문자, 끝에 문장부호) */
  function render(arr, type) {
    if (!arr.length) return '';
    var words = arr.map(textOf).join(' ');
    words = words.charAt(0).toUpperCase() + words.slice(1);
    var mark = (type === 'wFrage' || type === 'jaNein') ? '?' : '.';
    return words + mark;
  }

  /**
   * 문장 구조를 필드로 나눈다 — Satzklammer 시각화용.
   * @returns { vorfeld, linke, mittelfeld:[], rechte, nachfeld:[] }
   */
  function fields(type, arr) {
    var roles = arr.map(roleOf);
    var vi = roles.indexOf('V');
    var ve = roles.indexOf('Vend');

    if (type === 'sub') {
      return {
        vorfeld: roles[0] === 'Konj' ? arr[0] : null,
        linke: null,
        mittelfeld: arr.slice(1, ve >= 0 ? ve : vi),
        rechte: ve >= 0 ? [arr[ve], arr[vi]] : [arr[vi]],
        sub: true
      };
    }
    return {
      vorfeld: vi > 0 ? arr.slice(0, vi) : [],
      linke: vi >= 0 ? arr[vi] : null,
      mittelfeld: arr.slice(vi + 1, ve >= 0 ? ve : arr.length),
      rechte: ve >= 0 ? [arr[ve]] : [],
      sub: false
    };
  }

  /*
   * 가운데 자리의 표준 순서.
   * 위 규칙들을 전부 만족하는 하나의 순서 — 모범답안을 만들 때 쓴다.
   *   대명사 주어 → 대명사 목적어(4격→3격) → 명사 주어 → 3격 →
   *   시간 → 이유 → 방법 → 4격 → nicht → 장소 → 술어
   */
  function midRank(c) {
    var r = c.role;
    if (r === 'S') return isPronoun(c) ? 0 : 3;
    if (r === 'AkkP') return 1;
    if (r === 'DatP') return 2;
    if (r === 'Dat') return 4;
    if (r === 'Te') return 5;
    if (r === 'Ka') return 6;
    if (r === 'Mo') return 7;
    if (r === 'Akk') return 8;
    if (r === 'Neg') return 9;
    if (r === 'Lo') return 10;
    if (r === 'Präd') return 11;
    return 12;
  }

  /**
   * 모범답안을 만든다 — front 를 앞자리에 놓고 나머지를 표준 순서로.
   * 문장 데이터의 순서를 그대로 쓰면 앞자리를 바꿨을 때 주어가 뒤로 밀린다.
   */
  function arrange(type, chunks, front) {
    var fin = null, vend = null, konj = null, w = null, mid = [];
    chunks.forEach(function (c) {
      if (c === front) return;
      if (c.role === 'V' && !fin) fin = c;
      else if (c.role === 'Vend' && !vend) vend = c;
      else if (c.role === 'Konj' && !konj) konj = c;
      else if (c.role === 'W' && !w) w = c;
      else mid.push(c);
    });
    mid.sort(function (a, b) { return midRank(a) - midRank(b); });

    if (type === 'sub') {
      var head = konj ? [konj] : (front ? [front] : []);
      return head.concat(mid, vend ? [vend] : [], fin ? [fin] : []);
    }
    if (type === 'jaNein') {
      return (fin ? [fin] : []).concat(mid, vend ? [vend] : []);
    }
    var pre = front ? [front] : (w ? [w] : []);
    return pre.concat(fin ? [fin] : [], mid, vend ? [vend] : []);
  }

  /** 표준(사전) 배열 — 문장 데이터에 적힌 순서 그대로 */
  function canonical(sentence) {
    return sentence.chunks.slice();
  }

  /** 어떤 배열이 정답이 되는지 세어 본다 (테스트·힌트용) */
  function countValid(type, chunks, limit) {
    var results = [], seen = {};
    permute(chunks, [], function (arr) {
      if (results.length >= (limit || 200)) return true;   // 중단
      var key = arr.map(textOf).join(' ');
      if (seen[key]) return false;
      seen[key] = 1;
      if (validate(type, arr).ok) results.push(key);
      return false;
    });
    return results;
  }

  function permute(rest, acc, cb) {
    if (!rest.length) return cb(acc.slice());
    for (var i = 0; i < rest.length; i++) {
      acc.push(rest[i]);
      var next = rest.slice(0, i).concat(rest.slice(i + 1));
      if (permute(next, acc, cb)) { acc.pop(); return true; }
      acc.pop();
    }
    return false;
  }

  global.WordOrder = {
    ROLE: ROLE,
    ADVERBIAL: ADVERBIAL,
    PRONOUN_OBJ: PRONOUN_OBJ,
    NO_VORFELD: NO_VORFELD,
    validate: validate,
    arrange: arrange,
    midRank: midRank,
    render: render,
    fields: fields,
    canonical: canonical,
    countValid: countValid
  };
})(window);
