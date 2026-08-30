/*
 * 공용 뜻 사전 검증
 *
 *   node tools/test_dict.js
 *
 * 확인하는 것은 층이 쌓이는 순서다.
 *
 *   정적 데이터 → 공용 사전(운영자) → 로컬 수정(아직 안 올린 것)
 *
 * 이 순서가 틀어지면 조용히 잘못된 뜻을 가르친다. 사람은 눈치채지 못한다.
 * 권한도 같이 본다 — 일반 사용자가 사전을 못 쓰는지.
 */
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.dirname(__dirname);
var storage = {};
var sandbox = {
  console: console,
  localStorage: {
    getItem: function (k) { return k in storage ? storage[k] : null; },
    setItem: function (k, v) { storage[k] = String(v); },
    removeItem: function (k) { delete storage[k]; }
  },
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  Date: Date, Math: Math, JSON: JSON, Object: Object, Array: Array,
  RegExp: RegExp, String: String, Number: Number, parseInt: parseInt,
  Promise: Promise, navigator: { onLine: true },
  fetch: function () { return Promise.reject(new Error('네트워크 없음')); },
  addEventListener: function () {},
  document: { visibilityState: 'visible' }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

['js/store.js', 'js/dict.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
});

var Store = sandbox.window.Store;
var Dict = sandbox.window.Dict;

var fails = 0;
function bad(m) { fails++; console.log('  X ' + m); }
function eq(label, got, want) {
  if (got !== want) bad(label + ' — 기대 ' + JSON.stringify(want) + ', 실제 ' + JSON.stringify(got));
}

/** 사전을 원하는 상태로 갈아끼운다 */
function setDict(rows, builtAt) {
  sandbox.window.DICT = { builtAt: builtAt || '2026-01-01T00:00:00Z', rows: rows || {} };
  delete storage['ouda-dict-delta'];
  Dict._reset();
}

/** 학습 기록을 비우고 다시 읽게 한다 */
function resetStore() {
  delete storage['deutsch-trainer'];
  Store.reset();
}

var WORDS = [
  { id: 'n:Zug',   de: 'der Zug',   pos: 'noun' },
  { id: 'n:Apfel', de: 'der Apfel', pos: 'noun', ko: '사과' },
  { id: 'v:gehen', de: 'gehen',     pos: 'verb' }
];

function byId(list, id) {
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}

// ---------------------------------------------------------------- 층 쌓기

console.log('공용 사전이 정적 데이터 위에 얹힌다');
resetStore();
setDict({
  'n:Zug': { p: { ko: '기차, 열차' }, a: [], d: false, e: null, t: '2026-02-01T00:00:00Z' }
});
var out = Store.applyEdits(WORDS);
eq('없던 뜻이 채워짐', byId(out, 'n:Zug').ko, '기차, 열차');
eq('사전에 없는 단어는 그대로', byId(out, 'v:gehen').ko, undefined);
eq('원본 배열은 안 건드림', WORDS[0].ko, undefined);

console.log('사전이 정적 데이터의 값을 덮어쓴다');
setDict({
  'n:Apfel': { p: { ko: '사과 (과일)' }, a: [], d: false, e: null, t: 'x' }
});
eq('덮어씀', byId(Store.applyEdits(WORDS), 'n:Apfel').ko, '사과 (과일)');

console.log('로컬 수정이 사전보다 위에 온다');
resetStore();
setDict({
  'n:Zug': { p: { ko: '사전이 쓴 뜻' }, a: [], d: false, e: null, t: 'x' }
});
Store.editWord('n:Zug', { ko: '내가 방금 고친 뜻' });
eq('로컬이 이김', byId(Store.applyEdits(WORDS), 'n:Zug').ko, '내가 방금 고친 뜻');

console.log('메타 키가 단어 객체로 새지 않는다');
resetStore();
setDict({
  'n:Zug': { p: { ko: '기차', _ts: 12345, id: '오염' }, a: [], d: false, e: null, t: 'x' }
});
var z = byId(Store.applyEdits(WORDS), 'n:Zug');
eq('_ts 안 섞임', z._ts, undefined);
eq('id 안 덮임', z.id, 'n:Zug');

// ---------------------------------------------------------------- 삭제

console.log('운영자가 지운 항목은 전원에게서 사라진다');
resetStore();
setDict({
  'v:gehen': { p: {}, a: [], d: true, e: null, t: '2026-02-01T00:00:00Z' }
});
eq('걸러짐', Store.dropDeleted(WORDS).length, 2);
eq('isDeleted true', Store.isDeleted('v:gehen'), true);
eq('멀쩡한 것은 false', Store.isDeleted('n:Zug'), false);
eq('deletedCount', Store.deletedCount(), 1);

console.log('지운 항목에는 뜻을 얹지 않는다');
setDict({
  'v:gehen': { p: { ko: '가다' }, a: [], d: true, e: null, t: 'x' }
});
eq('patches 에서 빠짐', Dict.patches()['v:gehen'], undefined);

console.log('로컬 삭제와 사전 삭제가 겹쳐도 두 번 세지 않는다');
resetStore();
setDict({
  'v:gehen': { p: {}, a: [], d: true, e: null, t: 'x' }
});
Store.deleteWord('v:gehen');
eq('한 번만', Store.deletedCount(), 1);
Store.deleteWord('n:Zug');
eq('서로 다른 둘', Store.deletedCount(), 2);

// ---------------------------------------------------------------- 답지

console.log('답지는 사전과 내 것의 합집합');
resetStore();
setDict({
  'n:Zug': { p: { ko: '기차' }, a: ['열차', '행렬'], d: false, e: null, t: 'x' }
});
Store.addAlias('n:Zug', '기차역');
var al = Store.getAliases('n:Zug');
eq('개수', al.length, 3);
eq('사전 것 살아 있음', al.indexOf('열차') >= 0, true);
eq('내 것도 살아 있음', al.indexOf('기차역') >= 0, true);

console.log('같은 답을 양쪽에서 넣어도 하나');
resetStore();
setDict({
  'n:Zug': { p: {}, a: ['열차'], d: false, e: null, t: 'x' }
});
Store.addAlias('n:Zug', '열차');
eq('중복 안 생김', Store.getAliases('n:Zug').length, 1);

console.log('사전에 없으면 내 것만');
resetStore();
setDict({});
Store.addAlias('n:Zug', '기차역');
eq('내 것 하나', Store.getAliases('n:Zug').length, 1);
eq('아무것도 없으면 빈 배열', Store.getAliases('n:없음').length, 0);

// ---------------------------------------------------------------- 델타

console.log('델타 캐시가 구운 것을 덮는다');
resetStore();
sandbox.window.DICT = {
  builtAt: '2026-01-01T00:00:00Z',
  rows: { 'n:Zug': { p: { ko: '빌드에 구운 뜻' }, a: [], d: false, e: null, t: '2026-01-01T00:00:00Z' } }
};
storage['ouda-dict-delta'] = JSON.stringify({
  since: '2026-03-01T00:00:00Z',
  rows: { 'n:Zug': { p: { ko: '나중에 받은 뜻' }, a: [], d: false, e: null, t: '2026-03-01T00:00:00Z' } }
});
Dict._reset();
eq('델타가 이김', byId(Store.applyEdits(WORDS), 'n:Zug').ko, '나중에 받은 뜻');
eq('구운 것 수', Dict.state.baked, 1);
eq('델타 수', Dict.state.delta, 1);

console.log('델타에만 있는 단어도 읽힌다');
resetStore();
sandbox.window.DICT = { builtAt: '2026-01-01T00:00:00Z', rows: {} };
storage['ouda-dict-delta'] = JSON.stringify({
  since: '2026-03-01T00:00:00Z',
  rows: { 'v:gehen': { p: { ko: '가다' }, a: [], d: false, e: null, t: '2026-03-01T00:00:00Z' } }
});
Dict._reset();
eq('델타만으로도', byId(Store.applyEdits(WORDS), 'v:gehen').ko, '가다');

// ---------------------------------------------------------------- 권한

console.log('일반 사용자는 사전을 못 쓴다');
resetStore();
setDict({});
sandbox.window.SYNC_CONFIG = { url: 'https://x.supabase.co', key: 'anon' };
sandbox.window.Auth = { isAdmin: function () { return false; }, headers: function () { return Promise.resolve({}); } };
eq('canWrite false', Dict.canWrite(), false);

// ---------------------------------------------------------------- 발행
//
// 621개를 이관하는 것이 실제 시나리오다. 한 요청에 다 담으면 그것이 실패 지점이
// 되므로 나눠 보내고, 중간에 끊겨도 올라간 것만 로컬에서 지워야 한다.

/** 성공하는 가짜 서버. 받은 덩이를 기록한다. */
function fakeServer(failAfter) {
  var batches = [];
  sandbox.fetch = function (url, opts) {
    var body = JSON.parse(opts.body);
    if (failAfter !== undefined && batches.length >= failAfter) {
      return Promise.resolve({
        ok: false, status: 500,
        text: function () { return Promise.resolve('서버 터짐'); }
      });
    }
    batches.push(body);
    var back = body.map(function (r) {
      var c = JSON.parse(JSON.stringify(r));
      c.updated_at = '2026-04-0' + batches.length + 'T00:00:00Z';
      return c;
    });
    return Promise.resolve({
      ok: true, status: 200,
      json: function () { return Promise.resolve(back); },
      text: function () { return Promise.resolve(''); }
    });
  };
  return batches;
}

function seed(n) {
  resetStore();
  setDict({});
  for (var i = 0; i < n; i++) Store.editWord('w' + i, { ko: '뜻' + i });
}

var publishTests = function () {
  console.log('많은 뜻을 발행하면 나눠 보낸다');
  seed(950);
  var batches = fakeServer();
  eq('대기 950개', Dict.pendingCount(), 950);

  return Dict.publishLocal().then(function (n) {
    eq('950개 발행됨', n, 950);
    eq('덩이 3개로 나뉨', batches.length, 3);
    eq('첫 덩이 400개', batches[0].length, 400);
    eq('마지막 덩이 150개', batches[2].length, 150);
    eq('로컬 대기 비워짐', Dict.pendingCount(), 0);
    eq('사전에 들어감', Object.keys(Dict.patches()).length, 950);
    eq('뜻이 맞음', Dict.patches()['w0'].ko, '뜻0');
    eq('_ts 가 안 올라감', batches[0][0].patch._ts, undefined);
  })

  .then(function () {
    console.log('중간에 끊기면 올라간 것만 지운다');
    seed(950);
    var b2 = fakeServer(2);          // 2덩이만 성공하고 3번째에서 실패
    return Dict.publishLocal().then(function () {
      bad('실패해야 하는데 성공했다');
    })['catch'](function (e) {
      eq('두 덩이만 갔음', b2.length, 2);
      eq('올라간 800개는 로컬에서 빠짐', Dict.pendingCount(), 150);
      eq('사전에는 800개', Object.keys(Dict.patches()).length, 800);
      if (!/800개까지/.test(Dict.state.message)) bad('어디까지 갔는지 안 알려줌: ' + Dict.state.message);
    });
  })

  .then(function () {
    console.log('다시 누르면 남은 것이 이어서 올라간다');
    var b3 = fakeServer();
    return Dict.publishLocal().then(function (n) {
      eq('남은 150개 발행', n, 150);
      eq('한 덩이면 충분', b3.length, 1);
      eq('이제 대기 0', Dict.pendingCount(), 0);
      eq('사전에 950개 전부', Object.keys(Dict.patches()).length, 950);
    });
  })

  .then(function () {
    console.log('지운 항목·답지도 함께 올라간다');
    resetStore();
    setDict({});
    fakeServer();
    Store.editWord('n:Zug', { ko: '기차' });
    Store.addAlias('n:Zug', '열차');
    Store.deleteWord('adj:깨진것');
    eq('대기 2개 (같은 id 는 하나)', Dict.pendingCount(), 2);
    return Dict.publishLocal().then(function () {
      eq('뜻 올라감', Dict.patches()['n:Zug'].ko, '기차');
      eq('답지 올라감', Dict.aliases()['n:Zug'][0], '열차');
      eq('삭제 올라감', !!Dict.deleted()['adj:깨진것'], true);
      eq('로컬 비워짐', Dict.pendingCount(), 0);
    });
  });
};

var done = 0;
function finish() {
  console.log('\n' + (fails ? 'X 실패 ' + fails + '건' : 'OK 전부 통과'));
  process.exit(fails ? 1 : 0);
}

Dict.setMeaning('n:Zug', '몰래 쓴 뜻').then(function () {
  bad('일반 사용자가 사전에 썼다');
})['catch'](function (e) {
  if (!/운영자/.test(e.message)) bad('거부 사유가 이상함: ' + e.message);
})
.then(function () {
  return Dict.publishLocal().then(function () { bad('일반 사용자가 발행했다'); })
    ['catch'](function (e) {
      if (!/운영자/.test(e.message)) bad('발행 거부 사유가 이상함: ' + e.message);
    });
})
.then(function () {
  console.log('운영자면 쓸 수 있다고 판단한다');
  sandbox.window.Auth.isAdmin = function () { return true; };
  eq('canWrite true', Dict.canWrite(), true);

  console.log('발행 대기 수를 센다');
  resetStore();
  Store.editWord('n:Zug', { ko: '가' });
  Store.editWord('n:Apfel', { ko: '나' });
  Store.deleteWord('v:gehen');
  Store.addAlias('n:Zug', '다');          // 이미 센 id 라 늘지 않아야 한다
  eq('세 개', Dict.pendingCount(), 3);

  resetStore();
  eq('비우면 0', Dict.pendingCount(), 0);
})
.then(publishTests)
.then(finish, function (e) { bad('예외: ' + (e && e.stack || e)); finish(); });
