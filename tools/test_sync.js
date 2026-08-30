/*
 * 동기화 병합 검증
 *
 *   node tools/test_sync.js
 *
 * 병합이 틀리면 진도가 조용히 사라진다. 되돌릴 방법도 없다.
 * 그래서 "어느 쪽 진도도 없어지지 않는다"를 여러 각도로 확인한다.
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
  navigator: { onLine: true },
  fetch: function () { return Promise.reject(new Error('네트워크 없음')); },
  addEventListener: function () {},
  document: { visibilityState: 'visible' }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

['js/store.js', 'js/srs.js', 'js/sync.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
});

var Sync = sandbox.window.Sync;
var fails = 0;
function bad(m) { fails++; console.log('  X ' + m); }
function eq(label, got, want) {
  if (got !== want) bad(label + ' — 기대 ' + JSON.stringify(want) + ', 실제 ' + JSON.stringify(got));
}

var T = 1700000000000;   // 기준 시각

function card(box, seen, ts) {
  return { box: box, seen: seen, right: seen, wrong: 0, due: ts + 1000, ts: ts };
}

// ---------------------------------------------------------------- 카드 병합

console.log('카드 병합 — 최신본 채택');
var pc = {                                    // PC: 아침에 공부
  'apfel|gender': card(3, 3, T),
  'buch|plural': card(1, 1, T)
};
var phone = {                                 // 폰: 점심에 더 공부
  'apfel|gender': card(4, 4, T + 60000),      // 같은 카드를 더 진행
  'haus|gender': card(2, 2, T + 60000)        // 폰에만 있는 새 카드
};

var m = Sync.mergeCards(pc, phone);
eq('더 최신인 폰 카드 채택', m['apfel|gender'].box, 4);
eq('PC 에만 있던 카드 보존', m['buch|plural'].box, 1);
eq('폰에만 있던 카드 보존', m['haus|gender'].box, 2);
eq('카드 총수', Object.keys(m).length, 3);

console.log('카드 병합 — 반대 방향도 같은 결과 (교환법칙)');
var m2 = Sync.mergeCards(phone, pc);
eq('apfel', m2['apfel|gender'].box, 4);
eq('buch', m2['buch|plural'].box, 1);
eq('haus', m2['haus|gender'].box, 2);

console.log('오래된 쪽이 최신을 덮어쓰지 않는가');
var stale = { 'apfel|gender': card(1, 1, T - 999999) };
var fresh = { 'apfel|gender': card(6, 9, T) };
eq('오래된 것을 나중에 병합해도', Sync.mergeCards(fresh, stale)['apfel|gender'].box, 6);
eq('순서를 바꿔도',              Sync.mergeCards(stale, fresh)['apfel|gender'].box, 6);

console.log('ts 가 없던 예전 기록은 seen 이 많은 쪽');
var old1 = { 'x|gender': { box: 2, seen: 2 } };
var old2 = { 'x|gender': { box: 5, seen: 7 } };
eq('seen 많은 쪽 채택', Sync.mergeCards(old1, old2)['x|gender'].box, 5);

// ---------------------------------------------------------------- 로그 병합

console.log('학습 로그 병합');
var lg = Sync.mergeLog(
  [{ d: '2026-08-27', n: 10, right: 8 }, { d: '2026-08-28', n: 20, right: 15 }],
  [{ d: '2026-08-28', n: 35, right: 30 }, { d: '2026-08-29', n: 5, right: 5 }]
);
eq('날짜 수', lg.length, 3);
eq('겹친 날은 많은 쪽', lg[1].n, 35);
eq('정렬', lg[0].d, '2026-08-27');
eq('마지막 날', lg[2].d, '2026-08-29');

// ---------------------------------------------------------------- 뜻 병합

console.log('뜻(edits) 병합');
var e1 = { apfel: { ko: '사과', _ts: T }, buch: { ko: '책', _ts: T } };
var e2 = { apfel: { ko: '능금', _ts: T + 5000 }, haus: { ko: '집', _ts: T } };
var me = Sync.mergeEdits(e1, e2);
eq('나중에 고친 뜻', me.apfel.ko, '능금');
eq('한쪽에만 있던 뜻 보존', me.buch.ko, '책');
eq('다른 쪽에만 있던 뜻 보존', me.haus.ko, '집');

// ---------------------------------------------------------------- 전체 병합

console.log('전체 상태 병합');
var local = {
  version: 1, settings: { newPerDay: 15 }, cards: pc, edits: e1, added: [],
  log: [{ d: '2026-08-28', n: 20, right: 15 }], streak: 3, lastDay: '2026-08-28', _ts: T
};
var remote = {
  version: 1, settings: { newPerDay: 30 }, cards: phone, edits: e2,
  added: [{ id: 'zzz', pos: 'noun', de: 'Zzz' }],
  log: [{ d: '2026-08-29', n: 5, right: 5 }], streak: 5, lastDay: '2026-08-29', _ts: T + 5000
};
var full = Sync.merge(local, remote);
eq('카드 3개', Object.keys(full.cards).length, 3);
eq('연속일은 큰 쪽', full.streak, 5);
eq('마지막 학습일은 늦은 쪽', full.lastDay, '2026-08-29');
eq('설정은 나중 것', full.settings.newPerDay, 30);
eq('추가 단어 보존', full.added.length, 1);
eq('로그 2일', full.log.length, 2);

console.log('원격이 없으면 로컬 그대로');
eq('remote null', Sync.merge(local, null), local);

// ---------------------------------------------------------------- 실제 시나리오

console.log('시나리오 — 폰에서 풀고 PC 가 오래된 상태를 올릴 때');
var SRS = sandbox.window.SRS;
var Store = sandbox.window.Store;

// 폰: 카드 하나를 세 번 맞혀 상자 3까지
var phoneCard = null;
for (var i = 0; i < 3; i++) phoneCard = SRS.review(phoneCard, 'right');
var phoneState = { version: 1, settings: {}, cards: { 'k|gender': phoneCard },
                   edits: {}, added: [], log: [], streak: 1, lastDay: null, _ts: Date.now() };

// PC: 같은 카드를 한 번만 맞힌 오래된 기록
var pcCard = SRS.review(null, 'right');
pcCard.ts = phoneCard.ts - 100000;
var pcState = { version: 1, settings: {}, cards: { 'k|gender': pcCard },
                edits: {}, added: [], log: [], streak: 1, lastDay: null,
                _ts: Date.now() - 100000 };

var afterPc = Sync.merge(pcState, phoneState);
eq('PC 에서 병합해도 폰 진도 유지', afterPc.cards['k|gender'].box, 3);
var afterPhone = Sync.merge(phoneState, pcState);
eq('폰에서 병합해도 폰 진도 유지', afterPhone.cards['k|gender'].box, 3);

console.log('시나리오 — 양쪽에서 서로 다른 단어를 공부');
var aOnly = {}, bOnly = {};
for (var j = 0; j < 50; j++) aOnly['a' + j + '|gender'] = card(2, 2, T + j);
for (var k2 = 0; k2 < 50; k2++) bOnly['b' + k2 + '|gender'] = card(2, 2, T + k2);
var both = Sync.mergeCards(aOnly, bOnly);
eq('100개 전부 살아남음', Object.keys(both).length, 100);

console.log("시나리오 — 뜻 테스트에서 '이것도 정답' 을 양쪽에서 누름");
// 답지는 더하기만 하는 값이라 어느 쪽도 밀려나면 안 된다
var pcAli    = { 'n:zug': ['기차역'],            'w:gehen': ['걸어가다'] };
var phoneAli = { 'n:zug': ['기차역', '열차편'],  'n:haus': ['가옥'] };
var mAli = Sync.mergeAliases(pcAli, phoneAli);
eq('PC 것 유지',            mAli['w:gehen'][0], '걸어가다');
eq('폰 것 유지',            mAli['n:haus'][0], '가옥');
eq('같은 단어 답이 합쳐짐',  mAli['n:zug'].length, 2);
eq('중복은 하나로',          mAli['n:zug'].filter(function (x) { return x === '기차역'; }).length, 1);
var rev = Sync.mergeAliases(phoneAli, pcAli);
eq('순서를 바꿔도 결과 같음', Object.keys(rev).sort().join(), Object.keys(mAli).sort().join());
eq('한쪽이 비어도 안 잃음',   Sync.mergeAliases(pcAli, {})['n:zug'][0], '기차역');
eq('없던 필드여도 안 터짐',   Object.keys(Sync.mergeAliases(undefined, undefined)).length, 0);
// 원본을 건드리면 안 된다 (병합 뒤 로컬이 오염되면 다음 병합이 틀어진다)
mAli['n:zug'].push('오염');
eq('원본 불변', pcAli['n:zug'].length, 1);

// ---------------------------------------------------------------- 설정 없이 동작

console.log('동기화 설정이 없을 때');
eq('configured() false', Sync.configured(), false);
Sync.setCode(null);
eq('enabled false', Sync.state.enabled, false);
eq('status off', Sync.state.status, 'off');
Sync.schedulePush();          // 아무 일도 없어야 한다
eq('pending 안 켜짐', Sync.state.pending, false);

console.log('동기화 코드 생성');
var c1 = Sync.newCode(), c2 = Sync.newCode();
if (c1 === c2) bad('코드가 매번 같다');
if (c1.replace(/-/g, '').length !== 24) bad('코드 길이 ' + c1.length);
console.log('  예: ' + c1);

console.log('\n' + (fails ? 'X 실패 ' + fails + '건' : 'OK 전부 통과'));
process.exit(fails ? 1 : 0);
