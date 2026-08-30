/*
 * test_delete.js — 항목 삭제 · 되돌리기
 *
 *   node tools/test_delete.js
 *
 * 원문 PDF 에서 잘못 딸려 온 줄이 낱말로 읽힌 것이 151개 있다.
 * 지우되 원본은 건드리지 않아야 하고, 언제든 되돌릴 수 있어야 한다.
 */
var fs = require('fs'), path = require('path'), vm = require('vm');
var ROOT = path.join(__dirname, '..');

var mem = {};
var sandbox = {
  console: console, Math: Math, Date: Date, JSON: JSON,
  setTimeout: function () {}, clearTimeout: function () {},
  localStorage: {
    getItem: function (k) { return k in mem ? mem[k] : null; },
    setItem: function (k, v) { mem[k] = String(v); },
    removeItem: function (k) { delete mem[k]; }
  },
  navigator: { onLine: true }, fetch: function () {}
};
sandbox.window = sandbox;
vm.createContext(sandbox);

['data/nouns.js', 'data/verbs.js', 'data/adjectives.js', 'data/functionwords.js',
 'js/store.js', 'js/sync.js', 'js/declension.js', 'js/conjugation.js',
 'js/grader.js', 'js/editor.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
});

var S = sandbox.Store;
var E = sandbox.Editor;
var Sync = sandbox.Sync;

var ALL = []
  .concat(sandbox.NOUNS).concat(sandbox.VERBS)
  .concat(sandbox.ADJECTIVES).concat(sandbox.FUNCTIONWORDS);

var fail = 0, n = 0;
function check(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log('  FAIL  ' + name + (extra ? '  — ' + extra : '')); }
}

// ---------------------------------------------------------------- 깨진 항목 판정

console.log('깨진 항목 판정');

var BROKEN = ['(Pl.)', '→D, A: Friseur', 'A: Dose', 'ALTE Handbuch. Europäische',
              '/ die Serviceangestellte, -', 'jdn. erschrecken', 'Dachauer Straße 122'];
BROKEN.forEach(function (de) {
  check('"' + de + '" 은 깨진 것', E.looksBroken({ de: de, pos: 'adj' }));
});

// 멀쩡한 낱말을 지우자고 하면 안 된다
var FINE = ['Geschwindigkeitsbeschränkung', 'Pommes frites', 'Abitur', 'aufstehen',
            'Haus', 'sich umziehen', 'dafür/dagegen sein', 'schön'];
FINE.forEach(function (de) {
  check('"' + de + '" 은 멀쩡함', !E.looksBroken({ de: de, pos: 'adj' }));
});

check('빈 표제어는 깨진 것', E.looksBroken({ de: '', pos: 'noun' }));

// 손으로 쓴 문법·어순 항목은 문장이라 마침표가 정상이다. 쓸려 나가면 안 된다.
check('문장형 문법 항목은 안 걸림',
      !E.looksBroken({ de: 'Ich gehe morgen ins Kino.', pos: 'satz' }));
check('어순 항목도 안 걸림',
      !E.looksBroken({ de: 'Der Zug fährt in zehn Minuten ab.', pos: 'nominal' }));
check('전치사 항목도 안 걸림', !E.looksBroken({ de: 'aus', pos: 'prep' }));

var broken = ALL.filter(E.looksBroken);
console.log('  실제 데이터에서 ' + broken.length + '개 (전체 ' + ALL.length + ')');
check('실제로 잡히는 게 있음', broken.length > 50);
check('전체의 5% 를 넘지 않음', broken.length < ALL.length * 0.05,
      broken.length + '/' + ALL.length);

// ---------------------------------------------------------------- 삭제 · 되돌리기

console.log('삭제 · 되돌리기');

var victim = broken[0];
check('처음엔 안 지워진 상태', !S.isDeleted(victim.id));
check('지우면 true 를 돌려줌', S.deleteWord(victim.id) === true);
check('지운 것으로 표시됨', S.isDeleted(victim.id));
check('같은 것을 또 지우면 false', S.deleteWord(victim.id) === false);
check('개수가 1', S.deletedCount() === 1);

var kept = S.dropDeleted(ALL);
check('목록에서 빠짐', kept.length === ALL.length - 1);
check('빠진 게 그 항목', !kept.some(function (e) { return e.id === victim.id; }));

check('되돌리면 true', S.restoreWord(victim.id) === true);
check('되돌린 뒤엔 안 지워진 상태', !S.isDeleted(victim.id));
check('목록에 돌아옴', S.dropDeleted(ALL).length === ALL.length);
check('없는 것을 되돌리면 false', S.restoreWord('없는id') === false);
check('개수가 0', S.deletedCount() === 0);

// 원본 배열은 그대로여야 한다 (자동 생성물을 건드리지 않는다)
check('원본 데이터는 그대로', ALL.filter(function (e) {
  return e.id === victim.id;
}).length === 1);

// 여러 개 한꺼번에
broken.slice(0, 20).forEach(function (e) { S.deleteWord(e.id); });
check('20개 일괄 삭제', S.deletedCount() === 20);
check('목록에서 20개 빠짐', S.dropDeleted(ALL).length === ALL.length - 20);

// ---------------------------------------------------------------- 저장 · 학습 기록

console.log('저장 · 학습 기록');

S.saveNow();
var disk = JSON.parse(mem['deutsch-trainer']);
check('저장본에 남음', disk.deleted && Object.keys(disk.deleted).length === 20);
check('지운 시각이 숫자', typeof disk.deleted[broken[0].id] === 'number');

// 지워도 카드는 남는다 — 되돌리면 진도도 같이 돌아온다
S.putCard(broken[0].id, 'gender',
  { box: 3, due: 0, seen: 5, right: 4, wrong: 1, lastWrong: null, firstDay: '2026-08-01' });
S.deleteWord(broken[0].id);
check('지워도 학습 카드는 남음', S.getCard(broken[0].id, 'gender').box === 3);
S.restoreWord(broken[0].id);
check('되돌리면 진도도 그대로', S.getCard(broken[0].id, 'gender').seen === 5);

// ---------------------------------------------------------------- 동기화 병합

console.log('동기화 병합');

var pc = { 'a': 1000, 'b': 2000 };
var phone = { 'b': 3000, 'c': 4000 };
var m = Sync.mergeDeleted(pc, phone);
check('양쪽 것이 다 남음', Object.keys(m).length === 3);
check('겹치는 것은 나중 시각', m['b'] === 3000);
check('순서를 바꿔도 같음',
      JSON.stringify(Sync.mergeDeleted(phone, pc)) === JSON.stringify(m) ||
      Object.keys(Sync.mergeDeleted(phone, pc)).sort().join() === Object.keys(m).sort().join());
check('한쪽이 비어도 안 잃음', Sync.mergeDeleted(pc, {})['a'] === 1000);
check('없는 필드여도 안 터짐', Object.keys(Sync.mergeDeleted(undefined, undefined)).length === 0);
check('원본 불변', pc['b'] === 2000);

var merged = Sync.merge(
  { version: 1, cards: {}, edits: {}, added: [], aliases: {}, deleted: pc, log: [] },
  { version: 1, cards: {}, edits: {}, added: [], aliases: {}, deleted: phone, log: [] });
check('전체 병합에 deleted 가 실림', Object.keys(merged.deleted).length === 3);

console.log(fail ? '\nX 실패 ' + fail + ' / ' + n : '\nOK 전부 통과 (' + n + ')');
process.exit(fail ? 1 : 0);
