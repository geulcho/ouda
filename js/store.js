/*
 * store.js — localStorage 영속화
 *
 * 앱은 file:// 로 열리므로 디스크에 쓸 수 없다.
 * 학습 기록·설정·사용자가 고친 단어는 전부 브라우저 localStorage 에 산다.
 * 백업은 JSON 파일로 내려받아 보관한다.
 */
(function (global) {
  'use strict';

  // 저장소 키는 앱 이름이 Öuda 로 바뀐 뒤에도 그대로 둔다.
  // 바꾸면 지금까지 쌓인 학습 기록을 못 읽는다. 이름과 무관한 내부 식별자다.
  var KEY = 'deutsch-trainer';
  var VERSION = 1;

  var DEFAULT_SETTINGS = {
    germanOrder: false,      // 격 순서: false = 주격·소유격·여격·목적격 (요청 형식)
    strictCase: false,       // 명사 대문자를 틀리면 오답 처리할지
    newPerDay: 15,
    levels: ['A1', 'A2', 'B1', 'B2'],
    // 뒤쪽 다섯은 data/grammar.js 의 문법 항목 (전치사 격지배·접속사 어순 등)
    pos: ['noun', 'verb', 'adj', 'function',
          'prep', 'conn', 'comp', 'vcase', 'vprep',
          'nicht', 'nominal', 'satz'],
    drills: null,            // null = 전체
    tts: true,
    genderColors: true
  };

  var state = null;

  function fresh() {
    return {
      version: VERSION,
      settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
      cards: {},             // "id|drill" -> {box, due, seen, right, wrong, lastWrong}
      edits: {},             // 사용자가 고친 단어  id -> patch
      added: [],             // 사용자가 추가한 단어
      aliases: {},           // 뜻 테스트에서 직접 인정한 답  id -> ['답', ...]
      deleted: {},           // 지운 항목  id -> 지운 시각 (되돌릴 수 있게 남긴다)
      log: [],               // 날짜별 학습량 [{d:'2026-08-25', n:12, right:9}]
      streak: 0,
      lastDay: null
    };
  }

  function load() {
    if (state) return state;
    try {
      var raw = global.localStorage.getItem(KEY);
      state = raw ? JSON.parse(raw) : fresh();
      if (state.version !== VERSION) state = migrate(state);
      if (!state.aliases) state.aliases = {};   // 예전 저장본 보정
      if (!state.deleted) state.deleted = {};
      // 새 설정 항목이 늘어났을 때 기존 저장본을 메운다
      Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
        if (!(k in state.settings)) state.settings[k] = DEFAULT_SETTINGS[k];
      });
    } catch (e) {
      console.warn('저장본을 읽지 못했습니다. 새로 시작합니다.', e);
      state = fresh();
    }
    return state;
  }

  function migrate(old) {
    var s = fresh();
    if (old && old.cards) s.cards = old.cards;
    if (old && old.settings) s.settings = Object.assign(s.settings, old.settings);
    return s;
  }

  var saveTimer = null;
  function save() {
    if (saveTimer) return;                 // 연타 시 한 번만 쓴다
    saveTimer = global.setTimeout(function () {
      saveTimer = null;
      try {
        global.localStorage.setItem(KEY, JSON.stringify(state));
        if (global.Sync) global.Sync.schedulePush();
      } catch (e) {
        console.error('저장 실패 (용량 초과일 수 있습니다)', e);
      }
    }, 200);
  }

  function saveNow() {
    if (saveTimer) { global.clearTimeout(saveTimer); saveTimer = null; }
    try { global.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ---------------------------------------------------------------- 카드

  function cardKey(id, drill) { return id + '|' + drill; }

  function getCard(id, drill) {
    var s = load();
    return s.cards[cardKey(id, drill)] || null;
  }

  function putCard(id, drill, card) {
    var s = load();
    s.cards[cardKey(id, drill)] = card;
    save();
  }

  // ---------------------------------------------------------------- 설정

  function settings() { return load().settings; }

  function setSetting(k, v) {
    load().settings[k] = v;
    save();
    // 설정이 바뀌면 출제 후보를 다시 만들어야 한다.
    // (레벨·품사·드릴 종류가 바뀌면 후보 자체가 달라진다)
    if (typeof global.onSettingsChanged === 'function') global.onSettingsChanged(k, v);
  }

  // ---------------------------------------------------------------- 학습 기록

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  function recordAnswer(correct) {
    var s = load();
    var d = today();
    var entry = s.log[s.log.length - 1];
    if (!entry || entry.d !== d) {
      // 어제 공부했으면 연속일 유지, 아니면 초기화
      if (s.lastDay) {
        var y = new Date();
        y.setDate(y.getDate() - 1);
        var yd = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') +
                 '-' + String(y.getDate()).padStart(2, '0');
        s.streak = (s.lastDay === yd) ? s.streak + 1 : 1;
      } else {
        s.streak = 1;
      }
      s.lastDay = d;
      entry = { d: d, n: 0, right: 0 };
      s.log.push(entry);
      if (s.log.length > 400) s.log.shift();
    }
    entry.n++;
    if (correct) entry.right++;
    save();
  }

  function todayCount() {
    var s = load();
    var e = s.log[s.log.length - 1];
    return (e && e.d === today()) ? e.n : 0;
  }

  function newTodayCount() {
    // 오늘 처음 본 카드 수 — 하루 신규 상한을 지키기 위해
    var s = load(), n = 0, t = today();
    Object.keys(s.cards).forEach(function (k) {
      if (s.cards[k].firstDay === t) n++;
    });
    return n;
  }

  // ---------------------------------------------------------------- 단어 수정 / 추가

  function editWord(id, patch) {
    var s = load();
    s.edits[id] = Object.assign(s.edits[id] || {}, patch);
    s.edits[id]._ts = Date.now();      // 기기 간 병합 기준
    save();
  }

  function addWord(entry) {
    var s = load();
    s.added.push(entry);
    save();
  }

  /*
   * 뜻 테스트에서 '이것도 정답' 으로 인정한 답.
   * 띄어쓰기 정규화로도 안 걸리는 표현을 직접 답지에 넣는 통로다.
   * 한 번 넣으면 다음부터 자동으로 정답 처리된다.
   *
   * 답지는 합집합이다. 운영자가 사전에 넣어 둔 것과, 이 사람이 자기 채점에서
   * 인정한 것이 둘 다 살아남아야 한다. (인정은 뜻을 쓰는 게 아니라 자기 채점을
   * 넓히는 것이라 일반 사용자에게도 열어 둔다 — 자기 기록에만 남는다)
   */
  function getAliases(id) {
    var s = load();
    var mine = (s.aliases && s.aliases[id]) || [];
    var shared = global.Dict ? (global.Dict.aliases()[id] || []) : [];
    if (!shared.length) return mine;
    if (!mine.length) return shared.slice();
    var out = shared.slice();
    mine.forEach(function (x) { if (out.indexOf(x) < 0) out.push(x); });
    return out;
  }

  function addAlias(id, text) {
    var s = load();
    if (!s.aliases) s.aliases = {};
    var t = String(text || '').trim();
    if (!t) return false;
    var list = s.aliases[id] || (s.aliases[id] = []);
    if (list.indexOf(t) >= 0) return false;
    list.push(t);
    save();
    return true;
  }

  function removeAlias(id, text) {
    var s = load();
    if (!s.aliases || !s.aliases[id]) return;
    s.aliases[id] = s.aliases[id].filter(function (x) { return x !== text; });
    if (!s.aliases[id].length) delete s.aliases[id];
    save();
  }

  /*
   * 항목 지우기.
   *
   * 원본 데이터를 건드리지 않고 id 만 표시해 둔다. 자동 생성물인 nouns.js 등을
   * 다시 만들어도 지운 상태가 유지되고, 언제든 되돌릴 수 있다.
   * 학습 카드는 남겨 둔다 — 되돌리면 진도도 같이 돌아온다.
   */
  function deleteWord(id) {
    var s = load();
    if (!s.deleted) s.deleted = {};
    if (s.deleted[id]) return false;
    s.deleted[id] = Date.now();
    save();
    return true;
  }

  function restoreWord(id) {
    var s = load();
    if (!s.deleted || !s.deleted[id]) return false;
    delete s.deleted[id];
    save();
    return true;
  }

  /*
   * 지운 것은 두 군데에 있다.
   *   공용 사전  운영자가 지운 것 — 모든 사용자에게 적용된다
   *   로컬       운영자가 방금 지워 아직 안 올린 것 (일반 사용자는 비어 있다)
   */
  function dictDeleted() {
    return global.Dict ? global.Dict.deleted() : null;
  }

  function isDeleted(id) {
    var s = load();
    if (s.deleted && s.deleted[id]) return true;
    var d = dictDeleted();
    return !!(d && d[id]);
  }

  function deletedCount() {
    var s = load();
    var seen = {}, n = 0, k;
    for (k in (s.deleted || {})) { if (!seen[k]) { seen[k] = 1; n++; } }
    var d = dictDeleted() || {};
    for (k in d) { if (!seen[k]) { seen[k] = 1; n++; } }
    return n;
  }

  /** 지운 것을 걸러 낸다 */
  function dropDeleted(list) {
    var s = load();
    var local = s.deleted || {};
    var d = dictDeleted() || {};
    if (!Object.keys(local).length && !Object.keys(d).length) return list;
    return list.filter(function (e) { return !local[e.id] && !d[e.id]; });
  }

  /*
   * 단어에 덮어쓸 것을 순서대로 얹는다.
   *
   *   정적 데이터 (data/nouns.js …)
   *     → 공용 사전 (운영자가 쓴 뜻. 모든 사용자가 같은 것을 본다)
   *       → 로컬 수정 (운영자 자신이 방금 고쳐 아직 안 올린 것)
   *
   * 일반 사용자는 edits 가 비어 있으므로 사실상 공용 사전만 얹힌다.
   */
  function applyEdits(list) {
    var s = load();
    var dict = global.Dict ? global.Dict.patches() : null;
    var hasDict = !!(dict && Object.keys(dict).length);
    var hasEdits = !!Object.keys(s.edits).length;
    if (!hasDict && !hasEdits) return list;

    return list.map(function (e) {
      var d = hasDict ? dict[e.id] : null;
      var l = hasEdits ? s.edits[e.id] : null;
      if (!d && !l) return e;
      return Object.assign({}, e, d || {}, l || {});
    });
  }

  // ---------------------------------------------------------------- 백업

  function exportBackup() {
    return JSON.stringify(load(), null, 1);
  }

  function importBackup(text) {
    var parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || !parsed.cards) {
      throw new Error('백업 파일 형식이 아닙니다.');
    }
    state = parsed.version === VERSION ? parsed : migrate(parsed);
    saveNow();
  }

  function reset() {
    state = fresh();
    saveNow();
  }

  /** 동기화가 병합한 결과로 통째로 갈아끼운다 */
  function replaceAll(next) {
    state = next;
    saveNow();
  }

  global.Store = {
    load: load, save: save, saveNow: saveNow,
    settings: settings, setSetting: setSetting,
    cardKey: cardKey, getCard: getCard, putCard: putCard,
    recordAnswer: recordAnswer, todayCount: todayCount, newTodayCount: newTodayCount,
    today: today,
    editWord: editWord, addWord: addWord, applyEdits: applyEdits,
    getAliases: getAliases, addAlias: addAlias, removeAlias: removeAlias,
    deleteWord: deleteWord, restoreWord: restoreWord, isDeleted: isDeleted,
    deletedCount: deletedCount, dropDeleted: dropDeleted,
    exportBackup: exportBackup, importBackup: importBackup, reset: reset,
    replaceAll: replaceAll,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS
  };
})(window);
