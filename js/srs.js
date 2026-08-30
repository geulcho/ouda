/*
 * srs.js — 간격 반복 스케줄러
 *
 * 카드 단위는 (표제어 × 드릴유형).
 * 'Apfel 의 성' 은 알아도 'Apfel 의 복수형' 은 모를 수 있고, 실제로 그런 일이 계속 생긴다.
 * 그래서 두 카드를 따로 스케줄한다.
 */
(function (global) {
  'use strict';

  var MIN = 60 * 1000;
  var DAY = 24 * 60 * MIN;

  // 상자 0 = 미학습. 오답이면 1로 떨어지고, 정답이면 한 칸씩 올라간다.
  var INTERVALS = [
    0,            // 0 아직 안 봄
    10 * MIN,     // 1
    1 * DAY,      // 2
    3 * DAY,      // 3
    7 * DAY,      // 4
    16 * DAY,     // 5
    35 * DAY,     // 6
    90 * DAY      // 7 사실상 암기 완료
  ];

  var MAX_BOX = INTERVALS.length - 1;

  function newCard() {
    return { box: 0, due: 0, seen: 0, right: 0, wrong: 0, lastWrong: null, firstDay: null };
  }

  /**
   * 채점 결과를 반영한다.
   * @param grade 'right' | 'partial' | 'wrong'
   */
  function review(card, grade) {
    card = card || newCard();
    card.seen++;
    if (!card.firstDay) card.firstDay = Store.today();

    if (grade === 'wrong') {
      card.wrong++;
      card.lastWrong = Date.now();
      card.box = 1;                       // 처음으로 되돌린다
    } else {
      card.right++;
      if (grade === 'partial') {
        // 부분 정답(대소문자·오타)은 올리되 한 칸만, 그리고 상자 3 위로는 못 올라간다
        card.box = Math.min(card.box + 1, Math.max(3, card.box));
      } else {
        card.box = Math.min(card.box + 1, MAX_BOX);
      }
    }
    card.due = Date.now() + INTERVALS[card.box];
    // 기기 간 병합에서 어느 쪽이 최신인지 가리는 기준
    card.ts = Date.now();
    return card;
  }

  function isDue(card, now) {
    if (!card || card.box === 0) return false;
    return card.due <= (now || Date.now());
  }

  function isNew(card) {
    return !card || card.box === 0;
  }

  /** 암기 정도 0~1 — 통계 막대에 쓴다 */
  function mastery(card) {
    if (!card || !card.box) return 0;
    return card.box / MAX_BOX;
  }

  /**
   * 세션 큐를 만든다: 복습 예정 먼저, 그 다음 신규.
   * @param pool  [{id, drill, entry}] 후보 전체
   * @param limit 한 세션 최대 문제 수
   */
  function buildQueue(pool, limit, opts) {
    opts = opts || {};
    var now = Date.now();
    var due = [], fresh = [];

    pool.forEach(function (item) {
      var card = Store.getCard(item.id, item.drill);
      item.card = card;
      if (isNew(card)) fresh.push(item);
      else if (isDue(card, now)) due.push(item);
    });

    // 복습은 오래 밀린 것부터
    due.sort(function (a, b) { return a.card.due - b.card.due; });

    // 신규는 상한을 지킨다 (하루에 쏟아부으면 다음 날 복습이 감당 안 된다)
    var newBudget = Math.max(0, (opts.newPerDay || 15) - Store.newTodayCount());
    shuffle(fresh);
    fresh = fresh.slice(0, newBudget);

    var queue = due.concat(fresh);
    return limit ? queue.slice(0, limit) : queue;
  }

  /** 오답노트 — 최근에 틀린 것부터 */
  function wrongList(pool) {
    var out = [];
    pool.forEach(function (item) {
      var card = Store.getCard(item.id, item.drill);
      if (card && card.lastWrong) {
        item.card = card;
        out.push(item);
      }
    });
    out.sort(function (a, b) { return b.card.lastWrong - a.card.lastWrong; });
    return out;
  }

  function counts(pool) {
    var now = Date.now(), due = 0, fresh = 0, learning = 0, done = 0;
    pool.forEach(function (item) {
      var c = Store.getCard(item.id, item.drill);
      if (isNew(c)) fresh++;
      else {
        if (isDue(c, now)) due++;
        if (c.box >= MAX_BOX) done++; else learning++;
      }
    });
    return { due: due, fresh: fresh, learning: learning, done: done, total: pool.length };
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  global.SRS = {
    INTERVALS: INTERVALS, MAX_BOX: MAX_BOX,
    newCard: newCard, review: review, isDue: isDue, isNew: isNew,
    mastery: mastery, buildQueue: buildQueue, wrongList: wrongList,
    counts: counts, shuffle: shuffle
  };
})(window);
