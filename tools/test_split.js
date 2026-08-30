/*
 * 동음이의어 id 분리 검증
 *
 *   node tools/test_split.js
 *
 * v1 까지 der Laden(가게) 과 laden(싣다) 이 같은 id 'laden' 을 썼다.
 * 한쪽에 적은 뜻이 다른 쪽에도 그대로 붙었고, 사람은 눈치채기 어려웠다.
 *
 * 여기서 보는 것은 두 가지다.
 *   1. 데이터에 겹치는 id 가 없는가
 *   2. v1 저장본을 올릴 때 아무것도 잃지 않는가  ← 이게 더 위험하다
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
  RegExp: RegExp, String: String, Number: Number, parseInt: parseInt
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

['data/nouns.js', 'data/verbs.js', 'data/adjectives.js', 'data/functionwords.js',
 'js/store.js', 'js/editor.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
});

var W = sandbox.window;
var Store = W.Store;
var Editor = W.Editor;

var fails = 0;
function bad(m) { fails++; console.log('  X ' + m); }
function eq(label, got, want) {
  if (got !== want) bad(label + ' — 기대 ' + JSON.stringify(want) + ', 실제 ' + JSON.stringify(got));
}

var ALL = [].concat(W.NOUNS, W.VERBS, W.ADJECTIVES, W.FUNCTIONWORDS);

/** v1 저장본을 넣고 올린 결과를 돌려준다 */
function upgrade(v1) {
  delete storage['deutsch-trainer'];
  Store.reset();
  Store.importBackup(JSON.stringify(v1));
  return Store.load();
}

// ---------------------------------------------------------------- 데이터

console.log('데이터에 겹치는 id 가 없다');
var by = {};
ALL.forEach(function (e) { (by[e.id] = by[e.id] || []).push(e); });
var dup = Object.keys(by).filter(function (k) { return by[k].length > 1; });
eq('표제어 수', ALL.length, 5482);
eq('고유 id 수', Object.keys(by).length, ALL.length);
if (dup.length) {
  bad('겹치는 id ' + dup.length + '개: ' + dup.slice(0, 5).join(', '));
}

console.log('명사와 비명사가 갈라져 있다');
function find(id) { for (var i = 0; i < ALL.length; i++) if (ALL[i].id === id) return ALL[i]; return null; }
[['n:laden', 'Laden', 'noun'], ['w:laden', 'laden', 'verb'],
 ['n:essen', 'Essen', 'noun'], ['w:essen', 'essen', 'verb'],
 ['n:arm', 'Arm', 'noun'],     ['w:arm', 'arm', 'adj']].forEach(function (t) {
  var e = find(t[0]);
  if (!e) { bad(t[0] + ' 가 없다'); return; }
  eq(t[0] + ' 의 표제어', e.de, t[1]);
  eq(t[0] + ' 의 품사', e.pos, t[2]);
});

console.log('안 겹치는 id 는 접두어가 없다');
eq('zug 은 그대로', !!find('zug'), true);
eq('n:zug 은 없다', !!find('n:zug'), false);

var prefixed = ALL.filter(function (e) {
  var c = e.id.charAt(0);
  return e.id.charAt(1) === ':' && (c === 'n' || c === 'w');
});
eq('나뉜 표제어 수', prefixed.length, 152);

// ---------------------------------------------------------------- 올리기

console.log('v1 을 올려도 아무것도 안 잃는다');
var v1 = {
  version: 1,
  settings: { newPerDay: 40, levels: ['B1'], strictCase: true },
  cards: { 'zug|gender': { box: 5, ts: 111, seen: 9 } },
  edits: { 'zug': { ko: '기차', _ts: 111 } },
  aliases: { 'zug': ['열차'] },
  deleted: { 'adj:쓰레기': 222 },
  added: [{ id: 'n:내단어', pos: 'noun', de: '내단어' }],
  log: [{ d: '2026-08-01', n: 30, right: 25 }],
  streak: 7,
  lastDay: '2026-08-01'
};
var up = upgrade(v1);
eq('버전이 올라감', up.version, 2);
eq('뜻 유지',      up.edits['zug'].ko, '기차');
eq('카드 유지',    up.cards['zug|gender'].box, 5);
eq('답지 유지',    up.aliases['zug'][0], '열차');
eq('삭제 유지',    up.deleted['adj:쓰레기'], 222);
eq('추가 유지',    up.added.length, 1);
eq('로그 유지',    up.log.length, 1);
eq('연속일 유지',  up.streak, 7);
eq('설정 유지',    up.settings.newPerDay, 40);
eq('설정 유지2',   up.settings.strictCase, true);
eq('새 설정 채워짐', Array.isArray(up.settings.pos), true);

console.log('겹쳤던 id 는 양쪽으로 복사된다');
var v1b = {
  version: 1,
  settings: {},
  cards: { 'laden|meaningDe': { box: 3, ts: 555, seen: 4 } },
  edits: { 'laden': { ko: '가게, 일', _ts: 555 } },
  aliases: { 'laden': ['상점'] },
  deleted: {}, added: [], log: [], streak: 0, lastDay: null
};
var up2 = upgrade(v1b);
eq('옛 id 는 사라짐',   'laden' in up2.edits, false);
eq('명사 쪽에 복사',    up2.edits['n:laden'].ko, '가게, 일');
eq('동사 쪽에도 복사',  up2.edits['w:laden'].ko, '가게, 일');
eq('답지도 양쪽',       up2.aliases['n:laden'][0], '상점');
eq('답지도 양쪽2',      up2.aliases['w:laden'][0], '상점');
eq('카드도 양쪽',       up2.cards['n:laden|meaningDe'].box, 3);
eq('카드도 양쪽2',      up2.cards['w:laden|meaningDe'].box, 3);
eq('옛 카드는 사라짐',  'laden|meaningDe' in up2.cards, false);

console.log('무엇을 봐야 하는지 남긴다');
var rev = Store.splitReview();
eq('확인 목록 1건', Object.keys(rev || {}).length, 1);
eq('대상이 맞음',   (rev['laden'] || []).length, 2);
Store.clearSplitReview();
eq('지우면 없어짐', Store.splitReview(), null);

console.log('복사된 뜻이 실제 단어와 이어진다');
var valid = {};
ALL.forEach(function (e) { valid[e.id] = 1; });
var dangling = Object.keys(up2.edits).filter(function (id) { return !valid[id]; });
eq('끊긴 뜻 없음', dangling.length, 0);

console.log('이미 v2 면 다시 건드리지 않는다');
var v2 = JSON.parse(JSON.stringify(up2));
v2.version = 2;
var again = upgrade(v2);
eq('뜻 개수 그대로', Object.keys(again.edits).length, Object.keys(up2.edits).length);
eq('카드 개수 그대로', Object.keys(again.cards).length, Object.keys(up2.cards).length);
eq('확인 목록 안 생김', again.splitReview, undefined);

console.log('양쪽에 이미 값이 있으면 덮지 않는다');
var v1c = {
  version: 1, settings: {},
  cards: {}, aliases: {}, deleted: {}, added: [], log: [], streak: 0, lastDay: null,
  edits: { 'laden': { ko: '옛것' }, 'n:laden': { ko: '이미 있던 것' } }
};
var up3 = upgrade(v1c);
eq('있던 것을 지킴', up3.edits['n:laden'].ko, '이미 있던 것');
eq('빈 쪽만 채움',   up3.edits['w:laden'].ko, '옛것');

// ---------------------------------------------------------------- 새 단어

console.log('사용자가 추가하는 단어도 겹치지 않는다');
eq('겹치면 나눔 (명사)', Editor.makeId('Laden', 'noun'), 'n:laden');
eq('겹치면 나눔 (동사)', Editor.makeId('laden', 'verb'), 'w:laden');
eq('안 겹치면 그대로',   Editor.makeId('Xyzzyword', 'noun'), 'xyzzyword');
eq('ß 는 ss 로',         Editor.makeId('Straße', 'noun').indexOf('ss') >= 0, true);

console.log('이미 있는 철자를 다른 품사로 추가해도 안 겹친다');
var made = Editor.makeId('Zug', 'verb');
eq('기존 zug 를 안 건드림', made !== 'zug', true);
eq('접두어가 붙음', made, 'w:zug');

console.log('\n' + (fails ? 'X 실패 ' + fails + '건' : 'OK 전부 통과'));
process.exit(fails ? 1 : 0);
