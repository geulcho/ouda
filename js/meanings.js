/*
 * meanings.js — 뜻 채우기 전용 화면
 *
 * 학습이 아니라 '입력'이 목적이다. 단어를 하나씩 띄우고 뜻만 적어 넘긴다.
 * Enter 로 저장하고 바로 다음 단어, 포커스는 입력칸에 계속 머문다 —
 * 손이 키보드를 안 떠나야 3,500개를 감당할 수 있다.
 *
 * 저장은 기존 Store.editWord() 를 그대로 쓴다.
 */
(function (global) {
  'use strict';

  var S = global.Store;

  var LEVEL_RANK = { A1: 0, A2: 1, B1: 2, B2: 3, 추가: 4 };

  var state = {
    level: '',        // '' = 전체
    pos: '',
    onlyEmpty: true,
    prefixOnly: false,   // 접두사 동사만
    focusId: null,       // 다른 화면에서 '이 단어를 채우러' 넘어온 경우
    i: 0,
    list: null
  };

  function meaningOf(e) {
    return [e.ko, e.en].filter(Boolean).join(' · ');
  }

  /**
   * 채울 순서.
   * A1 → A2 → B1 로 두는 게 핵심이다. 기초 단어부터 뜻이 붙어야
   * 힌트가 쓸모 있어지고, 그게 다시 학습 속도를 올린다.
   */
  function build(words) {
    var P = global.Prefix;
    var list = words.filter(function (e) {
      if (e.pos !== 'noun' && e.pos !== 'verb' && e.pos !== 'adj') return false;
      if (state.onlyEmpty && meaningOf(e)) return false;
      if (state.level && (e.levels || []).indexOf(state.level) < 0) return false;
      if (state.pos && e.pos !== state.pos) return false;
      if (state.prefixOnly) {
        if (!P) return false;
        // 파생어와 그 기본 동사를 함께 남긴다 — 기본 동사 뜻이 있어야
        // 추론 힌트가 성립하므로 기본 동사를 빼면 안 된다
        if (!P.info(e, words) && !isBase(e, words, P)) return false;
      }
      return true;
    });

    if (state.prefixOnly && P) return sortByFamily(list, words, P);

    list.sort(function (a, b) {
      var la = Math.min.apply(null, (a.levels || ['B1']).map(function (l) {
        return LEVEL_RANK[l] === undefined ? 9 : LEVEL_RANK[l];
      }));
      var lb = Math.min.apply(null, (b.levels || ['B1']).map(function (l) {
        return LEVEL_RANK[l] === undefined ? 9 : LEVEL_RANK[l];
      }));
      if (la !== lb) return la - lb;
      // 같은 레벨이면 여러 레벨에 걸친(= 자주 쓰는) 단어부터
      if ((b.levels || []).length !== (a.levels || []).length) {
        return (b.levels || []).length - (a.levels || []).length;
      }
      return a.de.localeCompare(b.de);
    });
    return list;
  }

  /** 파생어를 가진 기본 동사인가 */
  var baseSet = null;
  function isBase(e, words, P) {
    if (!baseSet) {
      baseSet = {};
      words.forEach(function (w) {
        var n = P.info(w, words);
        if (n && n.base) baseSet[n.base] = true;
      });
    }
    return e.pos === 'verb' && baseSet[P.bare(e.de)] === true;
  }

  /**
   * 접두사 모드의 순서: 기본 동사 먼저, 그 다음 그 파생어들.
   * 기본 동사 뜻이 없으면 파생어의 추론 힌트를 만들 수 없다.
   */
  function sortByFamily(list, words, P) {
    function key(e) {
      var n = P.info(e, words);
      return n && n.base ? n.base : P.bare(e.de);
    }
    return list.sort(function (a, b) {
      var ka = key(a), kb = key(b);
      if (ka !== kb) return ka.localeCompare(kb);
      // 같은 계열 안에서는 기본 동사가 맨 앞
      var ba = P.bare(a.de) === ka ? 0 : 1;
      var bb = P.bare(b.de) === kb ? 0 : 1;
      if (ba !== bb) return ba - bb;
      return a.de.localeCompare(b.de);
    });
  }

  function counts(words) {
    var total = 0, filled = 0;
    words.forEach(function (e) {
      if (e.pos !== 'noun' && e.pos !== 'verb' && e.pos !== 'adj') return;
      total++;
      if (meaningOf(e)) filled++;
    });
    return { total: total, filled: filled };
  }

  /** 단어 목록이 새로 만들어지면 기본 동사 집합도 다시 계산해야 한다 */
  function reset() { baseSet = null; }

  global.Meanings = {
    state: state,
    build: build,
    counts: counts,
    meaningOf: meaningOf,
    reset: reset
  };
})(window);
