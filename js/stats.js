/*
 * stats.js — 통계 집계
 *
 * "정말 늘고 있나"에 답하는 게 목적이다. 오늘 몇 개 풀었나보다
 * 장기기억으로 몇 개 넘어갔나, 지난주보다 나아졌나가 진짜 지표다.
 *
 * 스키마를 늘리지 않는다. 이미 저장 중인 것만으로 전부 계산된다.
 *   cards: { box, seen, right, wrong, lastWrong, firstDay, due }
 *   log:   [{ d:'2026-08-29', n, right }]
 */
(function (global) {
  'use strict';

  var S = global.Store;
  var SRS = global.SRS;
  var DAY = 24 * 60 * 60 * 1000;

  function dayKey(d) {
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  function daysAgo(n) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return d;
  }

  /** 학습 기록이 있는 카드만 (id|drill -> card) */
  function seenCards() {
    var cards = S.load().cards, out = [];
    Object.keys(cards).forEach(function (k) {
      var c = cards[k];
      if (!c || !c.seen) return;
      var i = k.lastIndexOf('|');
      out.push({ key: k, id: k.slice(0, i), drill: k.slice(i + 1), card: c });
    });
    return out;
  }

  // ---------------------------------------------------------------- ① 장기기억 전환

  /**
   * 상자별 분포. 상자가 클수록 복습 간격이 길다 = 오래 기억한다.
   * 이게 "정말 외웠는가"에 가장 가까운 숫자다.
   */
  function boxDistribution() {
    var LABELS = ['미학습', '10분', '1일', '3일', '7일', '16일', '35일', '90일'];
    var counts = [];
    for (var i = 0; i < LABELS.length; i++) counts.push(0);

    seenCards().forEach(function (x) {
      var b = Math.min(x.card.box || 0, LABELS.length - 1);
      counts[b]++;
    });

    var total = counts.reduce(function (a, b) { return a + b; }, 0);
    // 상자 4(7일) 이상이면 장기기억으로 넘어가는 중이라고 본다
    var longTerm = counts.slice(4).reduce(function (a, b) { return a + b; }, 0);

    return {
      labels: LABELS,
      counts: counts,
      total: total,
      longTerm: longTerm,
      rows: LABELS.map(function (l, i) {
        return { label: l, n: counts[i], pct: total ? counts[i] / total : 0 };
      }).slice(1)      // 미학습은 막대에서 뺀다 (분모가 압도한다)
    };
  }

  // ---------------------------------------------------------------- ② 주간 비교

  function weekSlice(log, from, to) {
    var a = dayKey(from), b = dayKey(to);
    var n = 0, right = 0, days = 0;
    log.forEach(function (d) {
      if (d.d >= a && d.d <= b) { n += d.n; right += d.right; days++; }
    });
    return { n: n, right: right, days: days, rate: n ? right / n : 0 };
  }

  /** 이번 주(최근 7일) vs 지난 주(그 앞 7일) */
  function weekCompare() {
    var log = S.load().log || [];
    var cur = weekSlice(log, daysAgo(6), daysAgo(0));
    var prev = weekSlice(log, daysAgo(13), daysAgo(7));

    // 이번 주에 처음 본 카드 = 새로 외우기 시작한 단어
    var curNew = 0, prevNew = 0;
    var c0 = dayKey(daysAgo(6)), p0 = dayKey(daysAgo(13)), p1 = dayKey(daysAgo(7));
    seenCards().forEach(function (x) {
      var f = x.card.firstDay;
      if (!f) return;
      if (f >= c0) curNew++;
      else if (f >= p0 && f <= p1) prevNew++;
    });
    cur.fresh = curNew;
    prev.fresh = prevNew;

    return { cur: cur, prev: prev };
  }

  // ---------------------------------------------------------------- ③ 드릴별 · 레벨별

  function byDrill(drills) {
    var m = {};
    seenCards().forEach(function (x) {
      var d = drills.BY_ID[x.drill];
      if (!d) return;
      if (!m[x.drill]) m[x.drill] = { label: d.label, seen: 0, right: 0, wrong: 0 };
      m[x.drill].seen += x.card.seen;
      m[x.drill].right += x.card.right;
      m[x.drill].wrong += x.card.wrong;
    });
    return Object.keys(m).map(function (k) {
      var v = m[k];
      v.rate = v.seen ? v.right / v.seen : 0;
      return v;
    }).sort(function (a, b) { return a.rate - b.rate; });   // 약한 것부터
  }

  var LEVELS = ['A1', 'A2', 'B1', 'B2'];

  /**
   * 그 단어를 '처음 배우는' 레벨 하나.
   *
   * Goethe 단어장은 누적이라 A1 단어가 A2·B1 목록에도 다시 실린다.
   * 그래서 levels 가 ['A1','A2','B1'] 이면 A1 단어다.
   * 레벨마다 다 세면 A1 단어의 정답률이 B1 성적으로도 잡혀 등급이 뭉개진다.
   * B2 칸에는 B2 에만 있는 단어만 남는다 — 그게 진짜 B2 어휘다.
   */
  function baseLevel(w) {
    var l = w.levels || [];
    for (var i = 0; i < LEVELS.length; i++) {
      if (l.indexOf(LEVELS[i]) >= 0) return LEVELS[i];
    }
    return null;
  }

  function byLevel(words) {
    var index = {};
    words.forEach(function (w) { index[w.id] = w; });

    var m = {}, words_ = {};
    LEVELS.forEach(function (l) { m[l] = { seen: 0, right: 0 }; words_[l] = {}; });

    seenCards().forEach(function (x) {
      var w = index[x.id];
      if (!w) return;
      var l = baseLevel(w);
      if (!l) return;
      m[l].seen += x.card.seen;
      m[l].right += x.card.right;
      words_[l][x.id] = true;
    });

    // 레벨마다 단어가 몇 개인지도 같이 준다 (B2 가 몇 개짜리 표본인지 보이게)
    var pool = {};
    LEVELS.forEach(function (l) { pool[l] = 0; });
    words.forEach(function (w) {
      var l = baseLevel(w);
      if (l) pool[l]++;
    });

    return LEVELS.map(function (l) {
      return { label: l, seen: m[l].seen, right: m[l].right,
               words: Object.keys(words_[l]).length, pool: pool[l],
               rate: m[l].seen ? m[l].right / m[l].seen : 0 };
    });
  }

  // ---------------------------------------------------------------- ④ 약점 · 부하 · 히트맵

  /** 자주 틀린 것부터. 오답 수와 오답률을 함께 본다 */
  function weakest(words, drills, limit) {
    var index = {};
    words.forEach(function (w) { index[w.id] = w; });

    return seenCards()
      .filter(function (x) { return x.card.wrong > 0; })
      .map(function (x) {
        var w = index[x.id], d = drills.BY_ID[x.drill];
        return {
          id: x.id, drill: x.drill,
          word: w ? w.de : x.id,
          gender: w ? w.gender : null,
          pos: w ? w.pos : null,
          drillLabel: d ? d.label : x.drill,
          wrong: x.card.wrong,
          seen: x.card.seen,
          rate: x.card.wrong / x.card.seen
        };
      })
      .sort(function (a, b) {
        if (b.wrong !== a.wrong) return b.wrong - a.wrong;
        return b.rate - a.rate;
      })
      .slice(0, limit || 20);
  }

  /** 앞으로 며칠간 복습이 몇 개씩 밀려오는지 */
  function upcoming(days) {
    var now = Date.now();
    var out = [];
    for (var i = 0; i < (days || 7); i++) {
      out.push({ d: dayKey(daysAgo(-i)), n: 0, overdue: false });
    }
    var late = 0;
    seenCards().forEach(function (x) {
      var due = x.card.due;
      if (!due || !x.card.box) return;
      if (due < now) { late++; return; }
      var idx = Math.floor((due - now) / DAY);
      if (idx >= 0 && idx < out.length) out[idx].n++;
    });
    out[0].n += late;
    out[0].overdue = late > 0;
    return { days: out, late: late };
  }

  /*
   * 성에 좌우되는 드릴 전부.
   *
   * 성만 고르는 문제는 둘뿐이지만, 관사표·관사+명사는 성을 모르면 한 줄도 못 채운다.
   * 앞서 두 개만 세다 보니 표본이 너무 작아 '중성 —' 처럼 빈칸이 남았다.
   */
  var GENDER_DRILLS = ['gender', 'genderSpell', 'fullForm',
                       'artDef', 'artIndef', 'artKein', 'artMein', 'meaningKo'];

  /** 성별 오답률 — der/die/das 중 뭘 자꾸 틀리는지 */
  function byGender(words) {
    var index = {};
    words.forEach(function (w) { index[w.id] = w; });
    var m = { m: { seen: 0, wrong: 0 }, f: { seen: 0, wrong: 0 }, n: { seen: 0, wrong: 0 } };
    seenCards().forEach(function (x) {
      if (GENDER_DRILLS.indexOf(x.drill) < 0) return;
      var w = index[x.id];
      if (!w || w.pos !== 'noun' || !m[w.gender]) return;
      m[w.gender].seen += x.card.seen;
      m[w.gender].wrong += x.card.wrong;
    });
    return ['m', 'f', 'n'].map(function (g) {
      return { g: g, seen: m[g].seen, wrong: m[g].wrong,
               rate: m[g].seen ? m[g].wrong / m[g].seen : 0 };
    });
  }

  /** 복수형 유형별 오답률 — 어떤 유형이 안 붙는지 */
  function byPluralClass(words) {
    var index = {};
    words.forEach(function (w) { index[w.id] = w; });
    var m = {};
    seenCards().forEach(function (x) {
      if (x.drill !== 'plural' && x.drill !== 'datPlural') return;
      var w = index[x.id];
      if (!w || !w.pluralClass) return;
      if (!m[w.pluralClass]) m[w.pluralClass] = { seen: 0, wrong: 0 };
      m[w.pluralClass].seen += x.card.seen;
      m[w.pluralClass].wrong += x.card.wrong;
    });
    return Object.keys(m).map(function (k) {
      return { cls: k, seen: m[k].seen, wrong: m[k].wrong, rate: m[k].wrong / m[k].seen };
    }).sort(function (a, b) { return b.rate - a.rate; });
  }

  // ---------------------------------------------------------------- ⑤ 뜻 채우기

  var MEANING_DRILLS = ['meaningDe', 'meaningKo'];

  function hasMeaning(e) {
    return !!(String(e.ko || '').trim() || String(e.en || '').trim());
  }

  /** 뜻을 적을 대상 — 뜻 채우기 탭과 같은 기준(명사·동사·형용사) */
  function fillable(e) {
    return e.pos === 'noun' || e.pos === 'verb' || e.pos === 'adj';
  }

  /**
   * 뜻을 얼마나 채웠나. 전체·레벨별·품사별로 나눠 본다.
   * 어느 레벨이 비어 있는지 보이면 다음에 뭐를 채울지 정해진다.
   */
  function meaningProgress(words) {
    var LV = ['A1', 'A2', 'B1', 'B2'];
    var POS = [['noun', '명사'], ['verb', '동사'], ['adj', '형용사·부사']];
    var total = 0, filled = 0;
    var lv = {}, ps = {};
    LV.forEach(function (l) { lv[l] = { total: 0, filled: 0 }; });
    POS.forEach(function (x) { ps[x[0]] = { total: 0, filled: 0 }; });

    words.forEach(function (e) {
      if (!fillable(e)) return;
      var has = hasMeaning(e);
      total++; if (has) filled++;
      if (ps[e.pos]) { ps[e.pos].total++; if (has) ps[e.pos].filled++; }
      // 레벨은 '처음 나오는 곳' 하나로만 센다. 누적 태그를 다 세면
      // 합이 전체 단어 수를 넘어가 진척률이 뭉개진다.
      var l = baseLevel(e);
      if (l && lv[l]) { lv[l].total++; if (has) lv[l].filled++; }
    });

    function row(label, v) {
      return { label: label, total: v.total, filled: v.filled,
               pct: v.total ? v.filled / v.total : 0 };
    }
    return {
      total: total, filled: filled, pct: total ? filled / total : 0,
      levels: LV.map(function (l) { return row(l, lv[l]); }),
      pos: POS.map(function (x) { return row(x[1], ps[x[0]]); })
    };
  }

  /**
   * 날짜별로 뜻을 몇 개 적었는지.
   *
   * edits[id]._ts 는 '마지막으로 고친 시각' 이라 나중에 성·복수형을
   * 고치면 그날로 옮겨 잡힌다. 정확한 이력이 아니라 대략의 추이로 본다.
   */
  function meaningFillTrend(days) {
    days = days || 14;
    var edits = S.load().edits || {};
    var byDay = {};
    Object.keys(edits).forEach(function (id) {
      var e = edits[id];
      if (!e || !e._ts) return;
      if (!String(e.ko || '').trim() && !String(e.en || '').trim()) return;
      var k = dayKey(new Date(e._ts));
      byDay[k] = (byDay[k] || 0) + 1;
    });

    var out = [];
    for (var i = days - 1; i >= 0; i--) {
      var k2 = dayKey(daysAgo(i));
      out.push({ d: k2, n: byDay[k2] || 0 });
    }
    function span(from, to) {
      var a = dayKey(from), b = dayKey(to), n = 0;
      Object.keys(byDay).forEach(function (k) { if (k >= a && k <= b) n += byDay[k]; });
      return n;
    }
    return {
      days: out,
      total: Object.keys(byDay).reduce(function (a, k) { return a + byDay[k]; }, 0),
      cur: span(daysAgo(6), daysAgo(0)),
      prev: span(daysAgo(13), daysAgo(7))
    };
  }

  // ---------------------------------------------------------------- ⑥ 뜻 테스트

  /**
   * 뜻 테스트 성적.
   *
   * 가장 쓸모 있는 숫자는 coverage 다 — 뜻을 적어 둔 단어 중
   * 몇 개를 실제로 시험까지 봤는가. 적기만 하고 안 외우는 걸 잡아낸다.
   */
  function meaningTest(words) {
    var DIR = { meaningDe: '뜻 맞히기 (독→뜻)', meaningKo: '단어 맞히기 (뜻→독)' };
    var pool = 0;
    var poolIds = {};
    words.forEach(function (e) {
      if (!hasMeaning(e)) return;
      pool++; poolIds[e.id] = true;
    });

    var dirs = {};
    MEANING_DRILLS.forEach(function (d) {
      dirs[d] = { label: DIR[d], seen: 0, right: 0, wrong: 0, cards: 0, longTerm: 0 };
    });
    var tested = {}, seen = 0, right = 0, longTerm = 0, cards = 0;

    seenCards().forEach(function (x) {
      var d = dirs[x.drill];
      if (!d) return;
      cards++;
      tested[x.id] = true;
      seen += x.card.seen; right += x.card.right;
      d.cards++;
      d.seen += x.card.seen; d.right += x.card.right; d.wrong += x.card.wrong;
      if ((x.card.box || 0) >= 4) { longTerm++; d.longTerm++; }
    });

    var testedN = Object.keys(tested).length;
    var aliases = S.load().aliases || {};
    var aliasWords = Object.keys(aliases).length;
    var aliasN = 0;
    Object.keys(aliases).forEach(function (k) { aliasN += aliases[k].length; });

    return {
      pool: pool,                                   // 지금 출제 가능한 단어
      tested: testedN,                              // 한 번이라도 시험 본 단어
      coverage: pool ? testedN / pool : 0,
      cards: cards, seen: seen, right: right,
      rate: seen ? right / seen : 0,
      longTerm: longTerm,
      dirs: MEANING_DRILLS.map(function (d) {
        var v = dirs[d];
        v.rate = v.seen ? v.right / v.seen : 0;
        return v;
      }),
      aliasWords: aliasWords, aliasCount: aliasN
    };
  }

  /** 뜻 테스트에서 자주 틀리는 단어만 */
  function weakMeanings(words, limit) {
    var index = {};
    words.forEach(function (w) { index[w.id] = w; });
    return seenCards()
      .filter(function (x) {
        return MEANING_DRILLS.indexOf(x.drill) >= 0 && x.card.wrong > 0;
      })
      .map(function (x) {
        var w = index[x.id];
        return {
          id: x.id, drill: x.drill,
          word: w ? w.de : x.id,
          gender: w ? w.gender : null,
          meaning: w ? (w.ko || w.en || '') : '',
          wrong: x.card.wrong, seen: x.card.seen,
          rate: x.card.wrong / x.card.seen
        };
      })
      .sort(function (a, b) {
        if (b.wrong !== a.wrong) return b.wrong - a.wrong;
        return b.rate - a.rate;
      })
      .slice(0, limit || 15);
  }

  // ---------------------------------------------------------------- 접두사 동사

  var PFX_GRAMMAR = ['pfxSeparable', 'pfxPP', 'pfxSplit'];
  var PFX_MEANING = ['pfxMeaning', 'pfxWhich'];
  var PFX_ALL = PFX_GRAMMAR.concat(PFX_MEANING);

  function pfxInfo(e) {
    return global.Prefix ? global.Prefix.info(e) : null;
  }

  /** 접두사별 성적 — 약한 것부터 */
  function byPrefix(words) {
    var index = {};
    (words || []).forEach(function (w) { index[w.id] = w; });

    var m = {};
    seenCards().forEach(function (x) {
      if (PFX_ALL.indexOf(x.drill) < 0) return;
      var w = index[x.id];
      if (!w) return;
      var n = pfxInfo(w);
      if (!n) return;
      var v = m[n.prefix] || (m[n.prefix] = { id: n.prefix, seen: 0, right: 0, wrong: 0 });
      v.seen += x.card.seen;
      v.right += x.card.right;
      v.wrong += x.card.wrong;
    });

    return Object.keys(m).map(function (k) {
      var v = m[k];
      v.rate = v.seen ? v.right / v.seen : 0;
      var p = global.Prefix && global.Prefix.BY_ID[k];
      v.label = p ? p.label : k;
      v.core = p ? p.coreKo : '';
      return v;
    }).sort(function (a, b) { return a.rate - b.rate; });
  }

  /**
   * 의미 투명도별 성적.
   * low 에서만 무너진다면 접두사로 풀려 하지 말고 일반 암기로 돌려야 한다는 뜻이다.
   */
  function byTransparency(words) {
    var index = {};
    (words || []).forEach(function (w) { index[w.id] = w; });

    var KEYS = ['high', 'medium', 'low'];
    var LABEL = { high: '예측 쉬움', medium: '중간', low: '개별 암기' };
    var m = {};
    KEYS.forEach(function (k) { m[k] = { key: k, label: LABEL[k], seen: 0, right: 0 }; });

    seenCards().forEach(function (x) {
      if (PFX_ALL.indexOf(x.drill) < 0) return;
      var w = index[x.id];
      if (!w) return;
      var n = pfxInfo(w);
      if (!n || !n.transparency || !m[n.transparency]) return;
      m[n.transparency].seen += x.card.seen;
      m[n.transparency].right += x.card.right;
    });

    return KEYS.map(function (k) {
      var v = m[k];
      v.rate = v.seen ? v.right / v.seen : 0;
      return v;
    });
  }

  /**
   * 뜻과 활용 중 어느 쪽이 약한가.
   *
   * 카드가 (표제어 × 드릴) 이라 동사 하나에 대해 두 축을 따로 볼 수 있다.
   * 이 기능에서 가장 쓸모 있는 지표다 — 처방이 완전히 달라지기 때문이다.
   *   뜻만 약함  → 의미 추론 · 뜻 채우기
   *   활용만 약함 → 분리 위치 · ge 위치 훈련
   */
  function meaningVsGrammar(words) {
    var index = {};
    (words || []).forEach(function (w) { index[w.id] = w; });

    var per = {};
    seenCards().forEach(function (x) {
      var isM = PFX_MEANING.indexOf(x.drill) >= 0;
      var isG = PFX_GRAMMAR.indexOf(x.drill) >= 0;
      if (!isM && !isG) return;
      var v = per[x.id] || (per[x.id] = { id: x.id, mSeen: 0, mRight: 0, gSeen: 0, gRight: 0 });
      if (isM) { v.mSeen += x.card.seen; v.mRight += x.card.right; }
      else { v.gSeen += x.card.seen; v.gRight += x.card.right; }
    });

    var both = [], meaningWeak = [], grammarWeak = [];
    Object.keys(per).forEach(function (id) {
      var v = per[id];
      if (!v.mSeen || !v.gSeen) return;          // 두 축 다 풀어 본 것만 비교한다
      var w = index[id];
      v.word = w ? global.Prefix.bare(w.de) : id;
      v.mRate = v.mRight / v.mSeen;
      v.gRate = v.gRight / v.gSeen;
      if (v.mRate < 0.6 && v.gRate < 0.6) both.push(v);
      else if (v.mRate < 0.6) meaningWeak.push(v);
      else if (v.gRate < 0.6) grammarWeak.push(v);
    });

    function sortByGap(a, b) {
      return Math.abs(b.mRate - b.gRate) - Math.abs(a.mRate - a.gRate);
    }
    meaningWeak.sort(sortByGap);
    grammarWeak.sort(sortByGap);

    return {
      compared: Object.keys(per).filter(function (k) {
        return per[k].mSeen && per[k].gSeen;
      }).length,
      meaningWeak: meaningWeak,      // 활용은 되는데 뜻을 틀림
      grammarWeak: grammarWeak,      // 뜻은 아는데 활용을 틀림
      both: both
    };
  }

  /** 접두사 학습에서 지금 무엇을 해야 하는지 한 줄 */
  function prefixAdvice(words) {
    var pfx = byPrefix(words);
    var tr = byTransparency(words);
    var mg = meaningVsGrammar(words);

    var seen = pfx.reduce(function (a, x) { return a + x.seen; }, 0);
    if (!seen) {
      return { key: 'start', text: '아직 접두사 문제를 풀지 않았습니다. ' +
               '분리·비분리 판별부터 시작해 보세요.', drills: PFX_GRAMMAR };
    }
    if (mg.grammarWeak.length >= 3) {
      return { key: 'grammar',
               text: '뜻은 아는데 활용을 틀리는 동사가 ' + mg.grammarWeak.length +
                     '개입니다. 분리 위치와 ge 위치를 집중해서 연습하세요.',
               drills: PFX_GRAMMAR };
    }
    if (mg.meaningWeak.length >= 3) {
      return { key: 'meaning',
               text: '활용은 되는데 뜻을 틀리는 동사가 ' + mg.meaningWeak.length +
                     '개입니다. 의미 추론 쪽을 더 보세요.',
               drills: PFX_MEANING };
    }
    var low = tr.filter(function (x) { return x.key === 'low'; })[0];
    if (low && low.seen >= 5 && low.rate < 0.5) {
      return { key: 'low',
               text: '"개별 암기" 등급에서만 정답률이 낮습니다 (' + pctOf(low) + '). ' +
                     '이런 동사는 접두사로 풀려 하지 말고 일반 단어처럼 반복하세요.',
               drills: PFX_MEANING };
    }
    var weak = pfx.filter(function (x) { return x.seen >= 4; })[0];
    if (weak && weak.rate < 0.7) {
      return { key: 'prefix',
               text: weak.label + ' 가 가장 약합니다 (정답률 ' + pctOf(weak) + '). ' +
                     '이 접두사를 모아서 복습하세요.',
               prefix: weak.id, drills: PFX_ALL };
    }
    return { key: 'ok', text: '접두사 쪽은 고르게 올라오고 있습니다.', drills: PFX_ALL };
  }

  function pctOf(x) { return Math.round((x.rate || 0) * 100) + '%'; }

  /** 잔디 히트맵 — 최근 12주 */
  function heatmap(weeks) {
    weeks = weeks || 12;
    var log = {}, max = 0;
    (S.load().log || []).forEach(function (d) { log[d.d] = d.n; });

    // 이번 주 일요일 기준으로 뒤로 채운다
    var end = new Date(); end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + (6 - end.getDay()));

    var cells = [];
    for (var i = weeks * 7 - 1; i >= 0; i--) {
      var d = new Date(end);
      d.setDate(d.getDate() - i);
      var k = dayKey(d);
      var n = log[k] || 0;
      if (n > max) max = n;
      cells.push({ d: k, n: n, future: d.getTime() > Date.now() });
    }
    return { cells: cells, max: max, weeks: weeks };
  }

  global.Stats = {
    boxDistribution: boxDistribution,
    weekCompare: weekCompare,
    byDrill: byDrill,
    byLevel: byLevel,
    weakest: weakest,
    upcoming: upcoming,
    byGender: byGender,
    byPrefix: byPrefix,
    byTransparency: byTransparency,
    meaningVsGrammar: meaningVsGrammar,
    prefixAdvice: prefixAdvice,
    PFX_GRAMMAR: PFX_GRAMMAR,
    PFX_MEANING: PFX_MEANING,
    baseLevel: baseLevel,
    GENDER_DRILLS: GENDER_DRILLS,
    byPluralClass: byPluralClass,
    heatmap: heatmap,
    meaningProgress: meaningProgress,
    meaningFillTrend: meaningFillTrend,
    meaningTest: meaningTest,
    weakMeanings: weakMeanings,
    MEANING_DRILLS: MEANING_DRILLS,
    seenCards: seenCards,
    dayKey: dayKey
  };
})(window);
