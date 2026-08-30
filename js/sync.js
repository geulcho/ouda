/*
 * sync.js — 개인 학습기록 동기화
 *
 * 핵심은 병합이다. 통째로 덮어쓰면(last-write-wins) 폰에서 공부한 뒤
 * PC가 오래된 상태를 밀어 넣는 순간 진도가 사라진다.
 * 그래서 카드 하나하나를 마지막 복습 시각으로 비교해 최신본을 고른다.
 *
 * 예전에는 24자 코드를 아는 기기끼리 한 행을 같이 썼는데, 계정이 생기면서
 * 로그인한 사용자별로 progress 한 행을 쓴다. 남의 기록은 RLS 가 막는다.
 * (코드 방식은 anon 키만 있으면 아무 행이나 읽혔다)
 *
 * 여기서 다루는 것은 개인 기록뿐이다 — 공용 뜻 사전은 js/dict.js 가 따로 맡는다.
 *
 * 로그인하지 않았거나 설정이 없으면 아무것도 하지 않고 로컬 전용으로 동작한다.
 * file:// 로 더블클릭해 여는 경우가 그렇다.
 */
(function (global) {
  'use strict';

  var S = global.Store;
  var PUSH_DELAY = 5000;

  var state = {
    enabled: false,
    lastPull: 0,
    lastPush: 0,
    status: 'off',      // off | idle | syncing | error | offline
    message: '',
    pending: false
  };

  var timer = null;
  var listeners = [];

  function on(fn) { listeners.push(fn); }
  function emit() { listeners.forEach(function (f) { try { f(state); } catch (e) {} }); }

  function setStatus(s, msg) {
    state.status = s;
    state.message = msg || '';
    emit();
  }

  // ---------------------------------------------------------------- 설정

  function config() {
    return global.SYNC_CONFIG || null;   // data/config.js 가 정의한다
  }

  /** 로그인해야 동기화가 켜진다. 어느 행을 쓸지는 계정이 정한다. */
  function refresh() {
    var on = !!(config() && global.Auth && global.Auth.loggedIn());
    if (on !== state.enabled) {
      state.enabled = on;
      setStatus(on ? 'idle' : 'off');
    }
    return state.enabled;
  }

  // ---------------------------------------------------------------- 병합

  /**
   * 항목 단위 병합. 어느 쪽 진도도 사라지지 않는 게 유일한 요구사항이다.
   *
   *   cards    카드별로 ts(마지막 복습 시각)가 큰 쪽. ts 가 없던 예전 기록은
   *            seen 이 많은 쪽을 최신으로 본다.
   *   log      날짜별로 푼 개수가 많은 쪽 (같은 날 두 기기에서 풀면 합쳐지진 않지만
   *            학습 기록은 통계용이라 이 정도면 충분하다)
   *   edits    뜻 같은 수정. 항목별 _ts 비교.
   *   added    사용자가 추가한 단어. id 기준 합집합.
   *   settings 통째로 나중 것 — 기기별로 달라도 문제 없는 값들이다.
   */
  function mergeCards(a, b) {
    var out = {}, k;
    for (k in a) if (a.hasOwnProperty(k)) out[k] = a[k];
    for (k in b) {
      if (!b.hasOwnProperty(k)) continue;
      var mine = out[k], theirs = b[k];
      if (!mine) { out[k] = theirs; continue; }
      var tm = mine.ts || 0, tt = theirs.ts || 0;
      if (tt > tm) out[k] = theirs;
      else if (tt === tm && (theirs.seen || 0) > (mine.seen || 0)) out[k] = theirs;
    }
    return out;
  }

  function mergeLog(a, b) {
    var m = {};
    (a || []).forEach(function (d) { m[d.d] = d; });
    (b || []).forEach(function (d) {
      var cur = m[d.d];
      if (!cur || (d.n || 0) > (cur.n || 0)) m[d.d] = d;
    });
    return Object.keys(m).sort().map(function (k) { return m[k]; }).slice(-400);
  }

  function mergeEdits(a, b) {
    var out = {}, k;
    for (k in a) if (a.hasOwnProperty(k)) out[k] = a[k];
    for (k in b) {
      if (!b.hasOwnProperty(k)) continue;
      var mine = out[k], theirs = b[k];
      if (!mine) { out[k] = theirs; continue; }
      out[k] = (theirs._ts || 0) >= (mine._ts || 0) ? theirs : mine;
    }
    return out;
  }

  function mergeAdded(a, b) {
    var seen = {}, out = [];
    (a || []).concat(b || []).forEach(function (w) {
      if (!w || !w.id || seen[w.pos + ':' + w.id]) return;
      seen[w.pos + ':' + w.id] = true;
      out.push(w);
    });
    return out;
  }

  /*
   * 뜻 테스트의 '인정한 답' 은 더하기만 하는 값이라 합집합이 맞다.
   * 어느 기기에서 넣었든 둘 다 살아남아야 한다.
   */
  function mergeAliases(a, b) {
    var out = {}, k;
    for (k in (a || {})) if (a.hasOwnProperty(k)) out[k] = (a[k] || []).slice();
    for (k in (b || {})) {
      if (!b.hasOwnProperty(k)) continue;
      if (!out[k]) { out[k] = (b[k] || []).slice(); continue; }
      b[k].forEach(function (x) { if (out[k].indexOf(x) < 0) out[k].push(x); });
    }
    return out;
  }

  /*
   * 지운 항목은 시각이 큰 쪽을 쓴다.
   * 한쪽에서 지우고 다른 쪽에서 되돌렸다면 나중 행동을 따라야 하는데,
   * 되돌린 기록은 남지 않으므로 '지운 것'끼리 합집합을 잡되 시각을 살려 둔다.
   */
  function mergeDeleted(a, b) {
    var out = {}, k;
    for (k in (a || {})) if (a.hasOwnProperty(k)) out[k] = a[k];
    for (k in (b || {})) {
      if (!b.hasOwnProperty(k)) continue;
      if (!out[k] || b[k] > out[k]) out[k] = b[k];
    }
    return out;
  }

  function merge(local, remote) {
    if (!remote) return local;
    return {
      version: local.version,
      settings: (remote._ts || 0) > (local._ts || 0) ? remote.settings : local.settings,
      cards: mergeCards(local.cards || {}, remote.cards || {}),
      edits: mergeEdits(local.edits || {}, remote.edits || {}),
      added: mergeAdded(local.added, remote.added),
      aliases: mergeAliases(local.aliases, remote.aliases),
      deleted: mergeDeleted(local.deleted, remote.deleted),
      log: mergeLog(local.log, remote.log),
      streak: Math.max(local.streak || 0, remote.streak || 0),
      lastDay: (local.lastDay || '') > (remote.lastDay || '') ? local.lastDay : remote.lastDay,
      _ts: Math.max(local._ts || 0, remote._ts || 0)
    };
  }

  // ---------------------------------------------------------------- 통신 (Supabase)

  function endpoint() {
    var c = config();
    return c.url.replace(/\/$/, '') + '/rest/v1/progress';
  }

  function headers() {
    return global.Auth.headers({
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    });
  }

  function pull() {
    if (!refresh()) return Promise.resolve(null);
    var uid = global.Auth.userId();
    return headers().then(function (h) {
      return fetch(endpoint() + '?user_id=eq.' + encodeURIComponent(uid) + '&select=data',
                   { headers: h });
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (rows) { return (rows && rows[0]) ? rows[0].data : null; });
  }

  function push(payload) {
    if (!refresh()) return Promise.resolve();
    var uid = global.Auth.userId();
    return headers().then(function (h) {
      return fetch(endpoint(), {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ user_id: uid, data: payload })
      });
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
    });
  }

  // ---------------------------------------------------------------- 동작

  /** 앱 시작 시 한 번: 받아서 병합하고 되돌려 준다 */
  function start() {
    if (!refresh()) { setStatus('off'); return Promise.resolve(false); }

    setStatus('syncing', '받는 중…');
    return pull().then(function (remote) {
      var local = S.load();
      var merged = merge(local, remote);
      S.replaceAll(merged);
      /*
       * 병합이 끝나면 사전에 이미 있는 수정은 걷어낸다.
       * 서버의 개인기록에는 발행 전에 올려 둔 뜻이 남아 있어서, 그냥 두면
       * 발행이 끝났는데도 '안 올린 수정' 으로 되살아난다.
       */
      if (global.Dict && global.Dict.prune) global.Dict.prune();
      state.lastPull = Date.now();
      setStatus('idle', '동기화됨');
      // 병합 결과를 서버에도 올려 둔다 (다른 기기가 내 진도를 받도록)
      return push(merged).then(function () {
        state.lastPush = Date.now();
        return true;
      });
    })['catch'](function (e) {
      setStatus(navigator.onLine === false ? 'offline' : 'error', e.message);
      return false;
    });
  }

  /** 변경이 생길 때마다 부른다. 5초 디바운스로 묶어서 올린다. */
  function schedulePush() {
    if (!refresh()) return;
    state.pending = true;
    if (timer) return;
    timer = global.setTimeout(function () {
      timer = null;
      flush();
    }, PUSH_DELAY);
  }

  function flush() {
    if (!refresh() || !state.pending) return Promise.resolve();
    state.pending = false;
    setStatus('syncing', '올리는 중…');
    var local = S.load();
    local._ts = Date.now();
    return push(local).then(function () {
      state.lastPush = Date.now();
      setStatus('idle', '동기화됨');
    })['catch'](function (e) {
      state.pending = true;      // 다음 기회에 다시
      setStatus(navigator.onLine === false ? 'offline' : 'error', e.message);
    });
  }

  /** 수동 동기화 — 받아서 병합하고 올린다 */
  function syncNow() {
    if (!refresh()) return Promise.resolve(false);
    state.pending = true;
    return start();
  }

  if (global.addEventListener) {
    global.addEventListener('online', function () { if (state.pending) flush(); });
    // 탭을 닫기 전에 밀린 것을 올린다
    global.addEventListener('visibilitychange', function () {
      if (global.document && global.document.visibilityState === 'hidden') flush();
    });
  }

  global.Sync = {
    state: state,
    on: on,
    start: start,
    flush: flush,
    syncNow: syncNow,
    schedulePush: schedulePush,
    refresh: refresh,
    merge: merge,
    mergeCards: mergeCards,
    mergeLog: mergeLog,
    mergeEdits: mergeEdits,
    mergeAliases: mergeAliases,
    mergeDeleted: mergeDeleted,
    configured: function () { return !!config(); }
  };
})(window);
