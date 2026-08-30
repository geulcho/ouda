/*
 * dict.js — 공용 뜻 사전
 *
 * 뜻은 운영자만 쓴다. 사용자는 읽기만 한다.
 *
 * 전달은 두 겹이다.
 *
 *   1. 빌드에 구운 것   data/dict.js  (window.DICT)
 *      배포 시점의 사전 전체. 첫 화면이 서버를 기다리지 않고, 비행기 모드에서도 뜬다.
 *   2. 그 뒤의 델타     Supabase dictionary 테이블
 *      builtAt 이후에 바뀐 행만 받아 위에 덮는다. 뜻 하나 고치자고 재배포하지 않아도 된다.
 *
 * 받은 델타는 localStorage 에 쌓아 둔다. 다음에 오프라인으로 열어도 남아 있고,
 * 다음 pull 은 '마지막으로 받은 시각 이후' 만 가져오므로 갈수록 가벼워진다.
 *
 * 적용 순서는 store.js 의 applyEdits 에서:  정적 데이터 → 공용 사전 → 운영자의 로컬 수정
 */
(function (global) {
  'use strict';

  var CACHE_KEY = 'ouda-dict-delta';
  var TABLE = '/rest/v1/dictionary';

  // 단어 객체에 섞이면 안 되는 내부 키
  var META = { _ts: 1, _deleted: 1, id: 1 };

  var state = {
    status: 'off',        // off | idle | syncing | error
    message: '',
    baked: 0,             // 빌드에 구워진 행 수
    delta: 0,             // 델타로 받은 행 수
    since: null           // 마지막으로 받은 updated_at
  };

  var rows = null;        // id -> {p, a, d, e, t}   구운 것 + 델타를 합친 결과
  var listeners = [];

  /*
   * 파생 뷰(patches/deleted/aliases/added)는 rows 를 통째로 훑어 만든다.
   * isDeleted() 는 목록을 그릴 때마다 행 수만큼 불리므로 매번 다시 만들면
   * 5,482개 × 화면마다가 되어 버린다. 그래서 캐시해 두고 rows 가 바뀔 때만 버린다.
   */
  var derived = null;
  function invalidate() { derived = null; }
  function views() {
    if (!derived) derived = build();
    return derived;
  }

  function on(fn) { listeners.push(fn); return fn; }
  function emit() { listeners.forEach(function (f) { try { f(state); } catch (e) {} }); }

  function config() { return global.SYNC_CONFIG || null; }
  function configured() { return !!(config() && config().url && config().key); }
  function base() { return config().url.replace(/\/$/, ''); }

  // ---------------------------------------------------------------- 적재

  function readCache() {
    try {
      var raw = global.localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeCache(obj) {
    try { global.localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch (e) {}
  }

  /** 서버 행 하나를 내부 모양으로 */
  function normalize(r) {
    return {
      p: r.patch || {},
      a: r.aliases || [],
      d: !!r.deleted,
      e: r.entry || null,
      t: r.updated_at || null
    };
  }

  function load() {
    if (rows) return rows;
    rows = {};

    // 1. 빌드에 구운 것
    var baked = global.DICT && global.DICT.rows;
    if (baked) {
      Object.keys(baked).forEach(function (id) { rows[id] = baked[id]; });
      state.baked = Object.keys(baked).length;
    }

    // 2. 지난번에 받아 둔 델타를 그 위에
    var cached = readCache();
    if (cached && cached.rows) {
      Object.keys(cached.rows).forEach(function (id) { rows[id] = cached.rows[id]; });
      state.delta = Object.keys(cached.rows).length;
      state.since = cached.since || null;
    }
    return rows;
  }

  /** 델타를 받기 시작할 기준 시각 — 캐시가 있으면 그 뒤부터, 없으면 빌드 시각부터 */
  function watermark() {
    load();
    return state.since || (global.DICT && global.DICT.builtAt) || '1970-01-01T00:00:00Z';
  }

  // ---------------------------------------------------------------- 읽기

  function clean(patch) {
    var out = {}, k;
    for (k in patch) {
      if (patch.hasOwnProperty(k) && !META[k]) out[k] = patch[k];
    }
    return out;
  }

  /** rows 를 한 번만 훑어 파생 뷰 네 가지를 한꺼번에 만든다 */
  function build() {
    var r = load();
    var v = { patches: {}, deleted: {}, aliases: {}, added: [], meanings: 0 };

    Object.keys(r).forEach(function (id) {
      var row = r[id];
      if (row.d) {                       // 운영자가 지운 항목
        v.deleted[id] = row.t || 1;
        return;
      }
      var p = clean(row.p);
      if (Object.keys(p).length) {
        v.patches[id] = p;
        if (p.ko) v.meanings++;
      }
      if (row.a && row.a.length) v.aliases[id] = row.a.slice();
      if (row.e) v.added.push(row.e);
    });
    return v;
  }

  /** id -> 단어에 덮어쓸 값 (지워진 항목과 메타 키는 뺀다) */
  function patches() { return views().patches; }

  /** 운영자가 지운 항목  id -> 지운 시각 */
  function deleted() { return views().deleted; }

  /** 운영자가 인정한 답  id -> ['답', ...] */
  function aliases() { return views().aliases; }

  /** 운영자가 새로 추가한 단어 */
  function added() { return views().added; }

  function get(id) { return load()[id] || null; }

  /** 뜻이 채워진 표제어 수 — 진척도 표시에 쓴다 */
  function meaningCount() { return views().meanings; }

  // ---------------------------------------------------------------- 델타 받기

  /**
   * builtAt(또는 마지막 pull) 이후에 바뀐 행만 받는다.
   * 로그인하지 않아도 된다 — dictionary 는 전원 읽기 허용이다.
   */
  function pull() {
    if (!configured()) { state.status = 'off'; emit(); return Promise.resolve(0); }

    var since = watermark();
    state.status = 'syncing';
    state.message = '사전을 확인하는 중…';
    emit();

    var url = base() + TABLE +
              '?select=id,patch,aliases,deleted,entry,updated_at' +
              '&updated_at=gt.' + encodeURIComponent(since) +
              '&order=updated_at.asc';

    var head = global.Auth ? global.Auth.headers() : Promise.resolve({
      'apikey': config().key, 'Authorization': 'Bearer ' + config().key
    });

    return head.then(function (h) {
      return fetch(url, { headers: h });
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (list) {
      list = list || [];
      if (!list.length) {
        state.status = 'idle';
        state.message = '최신입니다';
        emit();
        return 0;
      }

      var cached = readCache() || { rows: {}, since: null };
      list.forEach(function (r) {
        cached.rows[r.id] = normalize(r);
        if (!cached.since || r.updated_at > cached.since) cached.since = r.updated_at;
      });
      writeCache(cached);

      // 메모리에도 반영 (다시 load 하지 않고 그 자리에서)
      load();
      list.forEach(function (r) { rows[r.id] = normalize(r); });
      invalidate();
      state.delta = Object.keys(cached.rows).length;
      state.since = cached.since;
      state.status = 'idle';
      state.message = list.length + '개 갱신됨';
      emit();
      return list.length;
    })['catch'](function (e) {
      state.status = global.navigator && global.navigator.onLine === false ? 'off' : 'error';
      state.message = e.message;
      emit();
      return 0;
    });
  }

  // ---------------------------------------------------------------- 쓰기 (운영자 전용)

  /*
   * 여기서 막는 것은 편의일 뿐이다. 실제 차단은 서버의 RLS 가 한다 —
   * is_admin() 이 아니면 INSERT/UPDATE 가 거부된다.
   */
  function canWrite() {
    return !!(configured() && global.Auth && global.Auth.isAdmin());
  }

  function fail(msg) {
    var e = new Error(msg);
    return Promise.reject(e);
  }

  /**
   * 행 하나를 통째로 올린다 (upsert). 부분 갱신이 아니라 합쳐서 보낸다 —
   * patch 를 병합해야 뜻만 고칠 때 성·복수형이 날아가지 않는다.
   */
  function put(id, changes) {
    if (!canWrite()) return fail('운영자 계정만 사전을 고칠 수 있습니다.');

    var cur = get(id) || { p: {}, a: [], d: false, e: null };
    // updated_at 은 보내지 않는다. 서버 트리거가 now() 로 찍는다 —
    // 그 값이 델타 pull 의 기준이라 기기 시계를 섞으면 안 된다.
    var row = {
      id: id,
      patch: Object.assign({}, clean(cur.p), clean(changes.patch || {})),
      aliases: changes.aliases || cur.a || [],
      deleted: changes.deleted === undefined ? cur.d : !!changes.deleted,
      entry: changes.entry === undefined ? cur.e : changes.entry
    };

    return global.Auth.headers({
      // 서버가 찍은 updated_at 을 돌려받아야 since 를 정확히 올릴 수 있다
      'Prefer': 'resolution=merge-duplicates,return=representation'
    }).then(function (h) {
      return fetch(base() + TABLE, { method: 'POST', headers: h, body: JSON.stringify(row) });
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) {
          throw new Error(r.status === 401 || r.status === 403
            ? '권한이 없습니다. 운영자 계정으로 로그인했는지 확인해 주세요.'
            : ('사전 저장 실패 (HTTP ' + r.status + ') ' + t.slice(0, 120)));
        });
      }
      return r.json();
    }).then(function (back) {
      // 서버가 돌려준 행을 쓴다 (updated_at 이 서버 시각이라야 since 가 어긋나지 않는다)
      var saved = (back && back[0]) || row;

      // 방금 올린 것을 로컬에도 즉시 반영 — 다음 pull 을 기다리지 않는다
      load();
      rows[id] = normalize(saved);
      invalidate();
      var cached = readCache() || { rows: {}, since: null };
      cached.rows[id] = rows[id];
      if (saved.updated_at && (!cached.since || saved.updated_at > cached.since)) {
        cached.since = saved.updated_at;
      }
      writeCache(cached);
      state.delta = Object.keys(cached.rows).length;
      state.since = cached.since;
      emit();
      return true;
    });
  }

  /**
   * 운영자가 로컬에서 고친 것을 사전으로 올린다.
   *
   * 운영자는 지금까지처럼 localStorage 에 대고 편집한다 (뜻 채우기 탭·단어장·
   * 채점 화면 전부 그대로다). 그 결과를 여기서 한 번에 사전으로 밀어 올린다 —
   * 편집 화면마다 서버 호출을 심지 않아도 되고, 오프라인에서 채운 뜻도
   * 다음에 온라인이 되면 그대로 올라간다.
   *
   * 올린 뒤에는 로컬 사본을 지운다. 남겨 두면 '아직 안 올린 수정' 층에 계속
   * 얹혀서, 다른 기기에서 고친 값을 낡은 값으로 덮어 버린다.
   */
  function publishLocal() {
    if (!canWrite()) return fail('운영자 계정만 사전을 고칠 수 있습니다.');
    var S = global.Store;
    if (!S) return Promise.resolve(0);

    var s = S.load();
    var batch = {};          // id -> 올릴 행

    function slot(id) {
      if (!batch[id]) {
        var cur = get(id) || { p: {}, a: [], d: false, e: null };
        batch[id] = {
          id: id,
          patch: clean(cur.p),
          aliases: (cur.a || []).slice(),
          deleted: cur.d,
          entry: cur.e
        };
      }
      return batch[id];
    }

    Object.keys(s.edits || {}).forEach(function (id) {
      var p = clean(s.edits[id]);
      if (!Object.keys(p).length) return;
      Object.assign(slot(id).patch, p);
    });

    Object.keys(s.deleted || {}).forEach(function (id) { slot(id).deleted = true; });

    Object.keys(s.aliases || {}).forEach(function (id) {
      var row = slot(id);
      (s.aliases[id] || []).forEach(function (x) {
        if (row.aliases.indexOf(x) < 0) row.aliases.push(x);
      });
    });

    (s.added || []).forEach(function (w) {
      if (!w || !w.id) return;
      slot(w.id).entry = w;
    });

    var list = Object.keys(batch).map(function (id) { return batch[id]; });
    if (!list.length) {
      state.message = '올릴 것이 없습니다';
      emit();
      return Promise.resolve(0);
    }

    state.status = 'syncing';
    state.message = list.length + '개 올리는 중…';
    emit();

    return global.Auth.headers({
      'Prefer': 'resolution=merge-duplicates,return=representation'
    }).then(function (h) {
      return fetch(base() + TABLE, { method: 'POST', headers: h, body: JSON.stringify(list) });
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) {
          throw new Error(r.status === 401 || r.status === 403
            ? '권한이 없습니다. 운영자 계정으로 로그인했는지 확인해 주세요.'
            : ('사전 발행 실패 (HTTP ' + r.status + ') ' + t.slice(0, 160)));
        });
      }
      return r.json();
    }).then(function (back) {
      var saved = back && back.length ? back : list;
      load();
      var cached = readCache() || { rows: {}, since: null };
      saved.forEach(function (row) {
        rows[row.id] = normalize(row);
        cached.rows[row.id] = rows[row.id];
        if (row.updated_at && (!cached.since || row.updated_at > cached.since)) {
          cached.since = row.updated_at;
        }
      });
      invalidate();
      writeCache(cached);
      state.delta = Object.keys(cached.rows).length;
      state.since = cached.since;

      // 사전에 들어갔으므로 로컬 사본은 버린다
      s.edits = {};
      s.deleted = {};
      s.aliases = {};
      s.added = [];
      S.saveNow();

      state.status = 'idle';
      state.message = saved.length + '개 발행됨';
      emit();
      return saved.length;
    })['catch'](function (e) {
      state.status = 'error';
      state.message = e.message;
      emit();
      throw e;
    });
  }

  /** 아직 사전에 안 올린 로컬 변경 수 — 발행 버튼에 띄운다 */
  function pendingCount() {
    var S = global.Store;
    if (!S) return 0;
    var s = S.load(), seen = {}, n = 0;
    function mark(id) { if (!seen[id]) { seen[id] = 1; n++; } }
    Object.keys(s.edits || {}).forEach(mark);
    Object.keys(s.deleted || {}).forEach(mark);
    Object.keys(s.aliases || {}).forEach(mark);
    (s.added || []).forEach(function (w) { if (w && w.id) mark(w.id); });
    return n;
  }

  function setMeaning(id, ko)      { return put(id, { patch: { ko: ko } }); }
  function setPatch(id, patch)     { return put(id, { patch: patch }); }
  function setDeleted(id, on)      { return put(id, { deleted: !!on }); }
  function addEntry(id, entry)     { return put(id, { entry: entry }); }

  function addAlias(id, text) {
    var cur = get(id);
    var list = (cur && cur.a) ? cur.a.slice() : [];
    var t = String(text || '').trim();
    if (!t || list.indexOf(t) >= 0) return Promise.resolve(false);
    list.push(t);
    return put(id, { aliases: list });
  }

  global.Dict = {
    state: state,
    on: on,
    configured: configured,
    canWrite: canWrite,
    pull: pull,
    publishLocal: publishLocal,
    pendingCount: pendingCount,
    patches: patches,
    deleted: deleted,
    aliases: aliases,
    added: added,
    get: get,
    meaningCount: meaningCount,
    setMeaning: setMeaning,
    setPatch: setPatch,
    setDeleted: setDeleted,
    addEntry: addEntry,
    addAlias: addAlias,
    // 테스트용
    _load: load,
    _reset: function () {
      rows = null; invalidate();
      state.baked = 0; state.delta = 0; state.since = null;
    }
  };
})(window);
