/*
 * auth.js — 계정 (Supabase Auth)
 *
 * 이메일 + 비밀번호로 로그인한다. Supabase JS SDK 를 쓰지 않고 REST 를 직접 부른다 —
 * SDK 는 ES 모듈이라 이 앱의 "클래식 <script src> 만 쓴다" 규칙을 깨기 때문이다.
 * (그 규칙이 있어야 index.html 을 file:// 로 더블클릭해 열 수 있다)
 *
 * 설정(data/config.js)이 없으면 아무것도 하지 않는다. 로그인 화면도 뜨지 않고
 * 지금까지처럼 로컬 전용으로 동작한다. file:// 로 여는 경우가 그렇다.
 *
 * 역할은 profiles.role 에 있다. 'admin' 이면 뜻을 공용 사전에 쓸 수 있다.
 * 화면에서 버튼을 숨기는 것은 편의일 뿐이고, 실제 차단은 서버의 RLS 가 한다 —
 * 브라우저에서 role 을 고쳐 봐야 INSERT 가 거부된다.
 */
(function (global) {
  'use strict';

  var KEY = 'ouda-session';
  var SKEW = 60000;          // 만료 1분 전에 미리 갱신한다

  var state = {
    status: 'off',           // off | anon | loading | in | error
    email: null,
    userId: null,
    role: null,              // 'user' | 'admin'
    message: ''
  };

  var session = null;        // {access_token, refresh_token, expires_at}
  var refreshing = null;     // 갱신 요청이 겹치지 않게 잡아 두는 Promise
  var listeners = [];

  function on(fn) { listeners.push(fn); return fn; }
  function emit() { listeners.forEach(function (f) { try { f(state); } catch (e) {} }); }

  function set(status, msg) {
    state.status = status;
    state.message = msg || '';
    emit();
  }

  // ---------------------------------------------------------------- 설정

  function config() { return global.SYNC_CONFIG || null; }
  function configured() { return !!(config() && config().url && config().key); }
  function base() { return config().url.replace(/\/$/, ''); }

  // ---------------------------------------------------------------- 세션 보관

  function loadSession() {
    try {
      var raw = global.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveSession(s) {
    session = s;
    try {
      if (s) global.localStorage.setItem(KEY, JSON.stringify(s));
      else global.localStorage.removeItem(KEY);
    } catch (e) {}
  }

  function adopt(json) {
    if (!json || !json.access_token) throw new Error('세션을 받지 못했습니다.');
    saveSession({
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      // expires_in 은 초 단위다
      expires_at: Date.now() + (json.expires_in || 3600) * 1000,
      email: (json.user && json.user.email) || state.email,
      userId: (json.user && json.user.id) || state.userId
    });
    state.email = session.email;
    state.userId = session.userId;
    return session;
  }

  // ---------------------------------------------------------------- 통신

  function req(path, opts) {
    opts = opts || {};
    var h = { 'apikey': config().key, 'Content-Type': 'application/json' };
    if (opts.token) h['Authorization'] = 'Bearer ' + opts.token;
    if (opts.headers) Object.keys(opts.headers).forEach(function (k) { h[k] = opts.headers[k]; });

    return fetch(base() + path, {
      method: opts.method || 'GET',
      headers: h,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = null;
        try { j = t ? JSON.parse(t) : null; } catch (e) {}
        if (!r.ok) {
          var msg = (j && (j.msg || j.message || j.error_description || j.error)) || ('HTTP ' + r.status);
          var err = new Error(translate(msg, r.status));
          err.status = r.status;
          throw err;
        }
        return j;
      });
    });
  }

  /** Supabase 오류 문구가 영어라 자주 보는 것만 한국어로 바꾼다 */
  function translate(msg, status) {
    var m = String(msg || '');
    if (/Invalid login credentials/i.test(m)) return '이메일이나 비밀번호가 맞지 않습니다.';
    if (/Email not confirmed/i.test(m)) return '이메일 인증이 아직 안 됐습니다. 받은 메일의 링크를 눌러 주세요.';
    if (/User already registered/i.test(m)) return '이미 가입된 이메일입니다. 로그인해 주세요.';
    if (/Password should be at least (\d+)/i.test(m)) {
      return '비밀번호는 ' + m.match(/at least (\d+)/i)[1] + '자 이상이어야 합니다.';
    }
    if (/Unable to validate email address|invalid format/i.test(m)) return '이메일 형식이 올바르지 않습니다.';
    if (/rate limit|too many/i.test(m)) return '요청이 너무 잦습니다. 잠시 뒤에 다시 해 주세요.';
    if (status === 0 || /Failed to fetch|NetworkError/i.test(m)) return '서버에 연결하지 못했습니다.';
    return m;
  }

  // ---------------------------------------------------------------- 토큰

  /**
   * 유효한 access token 을 준다. 만료가 가까우면 refresh_token 으로 갱신한다.
   * 갱신에 실패하면(refresh token 도 만료·폐기) 세션을 버리고 로그아웃 상태가 된다.
   */
  function token() {
    if (!session) return Promise.resolve(null);
    if (Date.now() < session.expires_at - SKEW) return Promise.resolve(session.access_token);
    if (refreshing) return refreshing;

    refreshing = req('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: { refresh_token: session.refresh_token }
    }).then(function (j) {
      adopt(j);
      refreshing = null;
      return session.access_token;
    })['catch'](function (e) {
      refreshing = null;
      saveSession(null);
      state.role = null;
      set('anon', '세션이 만료됐습니다. 다시 로그인해 주세요.');
      throw e;
    });
    return refreshing;
  }

  /** PostgREST 를 부를 때 쓰는 헤더. 로그인 안 했으면 anon 키만 실린다. */
  function headers(extra) {
    return token().then(function (t) {
      var h = {
        'apikey': config().key,
        'Authorization': 'Bearer ' + (t || config().key),
        'Content-Type': 'application/json'
      };
      if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
      return h;
    });
  }

  // ---------------------------------------------------------------- 역할

  /*
   * profiles 에서 내 역할을 읽는다. 행이 없으면(트리거가 아직 안 돌았거나
   * 예전에 만든 계정) 그냥 일반 사용자로 본다.
   */
  function loadRole() {
    return headers().then(function (h) {
      return fetch(base() + '/rest/v1/profiles?id=eq.' + encodeURIComponent(state.userId) + '&select=role',
                   { headers: h });
    }).then(function (r) {
      if (!r.ok) return null;
      return r.json();
    }).then(function (rows) {
      state.role = (rows && rows[0] && rows[0].role) || 'user';
      return state.role;
    })['catch'](function () {
      state.role = 'user';
      return 'user';
    });
  }

  function isAdmin() { return state.role === 'admin'; }

  // ---------------------------------------------------------------- 동작

  function signUp(email, password) {
    if (!configured()) return Promise.reject(new Error('서버가 설정되지 않았습니다.'));
    set('loading', '가입하는 중…');
    state.email = email;
    return req('/auth/v1/signup', { method: 'POST', body: { email: email, password: password } })
      .then(function (j) {
        // 이메일 인증이 켜져 있으면 세션 없이 사용자 정보만 돌아온다
        if (!j || !j.access_token) {
          set('anon', '가입했습니다. 받은 메일의 링크를 눌러 인증한 뒤 로그인해 주세요.');
          return { confirmNeeded: true };
        }
        adopt(j);
        return loadRole().then(function () {
          set('in');
          return { confirmNeeded: false };
        });
      })['catch'](function (e) { set('error', e.message); throw e; });
  }

  function signIn(email, password) {
    if (!configured()) return Promise.reject(new Error('서버가 설정되지 않았습니다.'));
    set('loading', '로그인하는 중…');
    state.email = email;
    return req('/auth/v1/token?grant_type=password',
               { method: 'POST', body: { email: email, password: password } })
      .then(function (j) {
        adopt(j);
        return loadRole();
      }).then(function () {
        set('in');
        return true;
      })['catch'](function (e) { set('error', e.message); throw e; });
  }

  function resetPassword(email) {
    if (!configured()) return Promise.reject(new Error('서버가 설정되지 않았습니다.'));
    return req('/auth/v1/recover', { method: 'POST', body: { email: email } })
      .then(function () { return true; });
  }

  /*
   * 로그아웃은 세션만 버린다. 학습 기록(localStorage)은 지우지 않는다 —
   * 지우면 마지막 동기화 뒤에 푼 문제가 사라진다. 다른 사람이 쓸 기기라면
   * 설정에서 '이 기기 기록 지우기' 를 따로 누르게 한다.
   */
  function signOut() {
    var t = session && session.access_token;
    saveSession(null);
    state.email = null;
    state.userId = null;
    state.role = null;
    set('anon');
    if (!t) return Promise.resolve();
    return req('/auth/v1/logout', { method: 'POST', token: t })['catch'](function () {});
  }

  /** 앱 시작 시 한 번. 저장된 세션이 살아 있으면 로그인 상태로 복원한다. */
  function restore() {
    if (!configured()) { set('off'); return Promise.resolve(false); }
    session = loadSession();
    if (!session) { set('anon'); return Promise.resolve(false); }

    state.email = session.email;
    state.userId = session.userId;
    set('loading', '세션을 확인하는 중…');

    return token().then(function (t) {
      if (!t) { set('anon'); return false; }
      return loadRole().then(function () { set('in'); return true; });
    })['catch'](function () { return false; });
  }

  global.Auth = {
    state: state,
    on: on,
    configured: configured,
    restore: restore,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    resetPassword: resetPassword,
    token: token,
    headers: headers,
    isAdmin: isAdmin,
    loggedIn: function () { return state.status === 'in'; },
    userId: function () { return state.userId; }
  };
})(window);
