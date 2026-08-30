/*
 * test_meaning.js — 뜻 테스트
 *
 * 확인할 것 세 가지.
 *   1. 쉼표로 여러 뜻을 적어 두면 그중 하나만 맞아도 정답
 *   2. 띄어쓰기·표기 차이는 자동으로 흡수
 *   3. 그래도 안 걸리는 답은 '이것도 정답' 으로 답지에 들어가고, 다음부터 자동 정답
 */
var fs = require('fs'), path = require('path'), vm = require('vm');
var ROOT = path.join(__dirname, '..');

// 아주 작은 localStorage 흉내
var mem = {};
var sandbox = {
  console: console, Math: Math, Date: Date, JSON: JSON,
  setTimeout: function () {}, clearTimeout: function () {},
  localStorage: {
    getItem: function (k) { return k in mem ? mem[k] : null; },
    setItem: function (k, v) { mem[k] = String(v); },
    removeItem: function (k) { delete mem[k]; }
  },
  navigator: { onLine: true }
};
sandbox.window = sandbox;
vm.createContext(sandbox);

['js/store.js', 'js/srs.js', 'js/declension.js', 'js/conjugation.js',
 'js/grader.js', 'js/drills.js', 'js/meaning-drills.js',
 'js/stats.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
});

var M = sandbox.MeaningDrills;
var Store = sandbox.Store;
var deToKo = sandbox.Drills.BY_ID.meaningDe;
var koToDe = sandbox.Drills.BY_ID.meaningKo;

var fail = 0, n = 0;
function check(name, cond) {
  n++;
  if (!cond) { fail++; console.log('  FAIL  ' + name); }
}

// ---------------------------------------------------------------- 출제 범위

var withKo  = { id: 'n:zug', pos: 'noun', de: 'Zug', gender: 'm', plural: 'Züge',
                ko: '기차, 열차, 행렬', levels: ['A1'] };
var withEn  = { id: 'w:x', pos: 'verb', de: 'testen', en: 'to test', levels: ['B1'] };
var blank   = { id: 'n:leer', pos: 'noun', de: 'Leere', gender: 'f', ko: '', levels: ['A1'] };
var spaces  = { id: 'n:sp', pos: 'noun', de: 'Sp', gender: 'f', ko: '   ', levels: ['A1'] };

check('뜻이 있으면 출제', deToKo.applies(withKo) && deToKo.applies(withEn));
check('뜻이 없으면 제외', !deToKo.applies(blank));
check('공백뿐이면 제외', !deToKo.applies(spaces));
check('뜻→독일어도 같은 범위', koToDe.applies(withKo) && !koToDe.applies(blank));

// ---------------------------------------------------------------- 쉼표로 나눈 뜻

var q = deToKo.make(withKo);
check('정답이 3개로 나뉜다', q.allAnswers.length === 3);
check('문제는 관사와 함께', q.prompt === 'der Zug');
check('빈칸에 정답이 새지 않는다', !q.placeholder);

['기차', '열차', '행렬'].forEach(function (a) {
  check('"' + a + '" 하나만 적어도 정답', deToKo.grade(q, a).grade === 'right');
});
check('엉뚱한 답은 오답', deToKo.grade(q, '버스').grade === 'wrong');
check('빈 답은 오답', deToKo.grade(q, '').grade === 'wrong');
check('빈 답에는 인정 버튼을 안 준다', !deToKo.grade(q, '').canAlias);

// ---------------------------------------------------------------- 자동 흡수

check('띄어쓰기 차이 흡수', deToKo.grade(q, '열 차').grade === 'right');
check('앞뒤 공백 흡수',   deToKo.grade(q, '  기차 ').grade === 'right');
check('마침표 흡수',      deToKo.grade(q, '기차.').grade === 'right');
check('괄호 설명 흡수',   deToKo.grade(q, '기차(교통)').grade === 'right');

// ---------------------------------------------------------------- 직접 인정

var r = deToKo.grade(q, '기차역');
check('답지에 없으면 오답', r.grade === 'wrong');
check('인정 버튼을 준다', r.canAlias === true);
check('어느 단어인지 실어 보낸다', r.aliasWord === 'n:zug');
check('사용자가 쓴 답을 그대로 싣는다', r.aliasText === '기차역');

Store.addAlias(r.aliasWord, r.aliasText);
check('답지에 들어갔다', Store.getAliases('n:zug').indexOf('기차역') >= 0);

var q2 = deToKo.make(withKo);            // 다음 출제
check('답지가 4개로 늘었다', q2.allAnswers.length === 4);
check('인정한 답이 이제 정답', deToKo.grade(q2, '기차역').grade === 'right');
check('원래 뜻도 그대로 정답', deToKo.grade(q2, '기차').grade === 'right');
check('여전히 엉뚱한 답은 오답', deToKo.grade(q2, '버스').grade === 'wrong');

Store.addAlias('n:zug', '기차역');
check('같은 답을 두 번 넣어도 하나', Store.getAliases('n:zug').length === 1);
check('빈 답은 안 들어간다', Store.addAlias('n:zug', '   ') === false);

Store.removeAlias('n:zug', '기차역');
check('지우면 다시 오답', deToKo.grade(deToKo.make(withKo), '기차역').grade === 'wrong');

// ---------------------------------------------------------------- 뜻 → 독일어

var k = koToDe.make(withKo);
check('문제가 뜻 전부', k.prompt.indexOf('기차') >= 0 && k.prompt.indexOf('행렬') >= 0);
check('관사까지 정답', k.answer === 'der Zug');
check('관사+철자 맞으면 정답', koToDe.grade(k, 'der Zug').grade === 'right');
check('성이 틀리면 정답 아님', koToDe.grade(k, 'die Zug').grade !== 'right');
check('명사 아닌 것은 관사 없이', koToDe.make(withEn).answer === 'testen');
check('동사도 채점된다', koToDe.grade(koToDe.make(withEn), 'testen').grade === 'right');

// ---------------------------------------------------------------- 저장·복원

Store.addAlias('n:zug', '기차편');
Store.saveNow();
var disk = JSON.parse(mem['deutsch-trainer']);
check('저장본에 남는다', disk.aliases && disk.aliases['n:zug'][0] === '기차편');

// ---------------------------------------------------------------- 통계

var St = sandbox.Stats;
var WORDS = [
  { id: 'n:a', pos: 'noun', de: 'A', gender: 'm', ko: '가', levels: ['A1'] },
  { id: 'n:b', pos: 'noun', de: 'B', gender: 'f', ko: '',   levels: ['A1', 'A2'] },
  { id: 'v:c', pos: 'verb', de: 'c', ko: '다',              levels: ['B1'] },
  { id: 'v:d', pos: 'verb', de: 'd', ko: '',                levels: ['B2'] },
  { id: 'a:e', pos: 'adj',  de: 'e', en: 'eee',             levels: ['A2'] },
  { id: 'p:f', pos: 'prep', de: 'f', ko: '~에서',           levels: ['A1'] }   // 채우기 대상 아님
];

var mp = St.meaningProgress(WORDS);
check('채우기 대상은 명사·동사·형용사만', mp.total === 5);
check('뜻 있는 것만 셈', mp.filled === 3);
check('비율', Math.abs(mp.pct - 3 / 5) < 1e-9);
check('레벨 4개', mp.levels.length === 4);
check('A1 은 2개 중 1개', mp.levels[0].total === 2 && mp.levels[0].filled === 1);   // n:a, n:b
// 누적 태그(A1+A2)는 A1 한 칸에만 — 합이 전체를 넘으면 진척률이 뭉개진다
check('누적 태그는 첫 레벨에만', mp.levels[1].total === 1 && mp.levels[1].filled === 1);
check('레벨 합 = 전체', mp.levels.reduce(function (a, x) { return a + x.total; }, 0) === mp.total);
check('품사별 명사 2개 중 1개', mp.pos[0].total === 2 && mp.pos[0].filled === 1);
check('영어 뜻도 채운 것으로 봄', mp.pos[2].filled === 1);

var empty = St.meaningProgress([]);
check('빈 목록도 0으로 안 나눔', empty.total === 0 && empty.pct === 0);

// ── 채운 추이 (edits._ts 기준)
var DAY = 24 * 60 * 60 * 1000;
var st = Store.load();
st.edits['n:a'] = { ko: '가', _ts: Date.now() };
st.edits['v:c'] = { ko: '다', _ts: Date.now() - 2 * DAY };
st.edits['n:z'] = { gender: 'm', _ts: Date.now() };      // 뜻이 아닌 수정
st.edits['n:y'] = { ko: '', _ts: Date.now() };           // 빈 뜻
st.edits['n:x'] = { ko: '옛날', _ts: Date.now() - 40 * DAY };
var tr = St.meaningFillTrend(14);
check('뜻이 아닌 수정은 안 셈', tr.total === 3);
check('14일치 나옴', tr.days.length === 14);
check('마지막 칸이 오늘', tr.days[13].n === 1);
check('이번 주 2개', tr.cur === 2);
check('40일 전 것은 지난 주에 안 들어감', tr.prev === 0);

// ── 뜻 테스트 성적
var mt0 = St.meaningTest(WORDS);
check('출제 가능 = 뜻 있는 전부 (전치사 포함)', mt0.pool === 4);
check('아직 시험 안 봄', mt0.tested === 0 && mt0.coverage === 0);
check('시험 안 봤으면 정답률 0', mt0.rate === 0);

function card(box, seen, right, wrong) {
  return { box: box, due: 0, seen: seen, right: right, wrong: wrong,
           lastWrong: null, firstDay: '2026-08-01' };
}
Store.putCard('n:a', 'meaningDe', card(5, 4, 3, 1));
Store.putCard('n:a', 'meaningKo', card(1, 2, 1, 1));
Store.putCard('v:c', 'meaningDe', card(2, 2, 2, 0));
Store.putCard('n:a', 'gender',    card(7, 9, 9, 0));   // 다른 드릴 — 섞이면 안 된다

var mt = St.meaningTest(WORDS);
check('시험 본 단어 2개 (카드 3장)', mt.tested === 2 && mt.cards === 3);
check('시험 진도 = 2/4', Math.abs(mt.coverage - 0.5) < 1e-9);
check('다른 드릴은 안 섞임', mt.seen === 8 && mt.right === 6);
check('정답률 6/8', Math.abs(mt.rate - 0.75) < 1e-9);
check('장기기억은 상자 4 이상 하나', mt.longTerm === 1);
check('방향별로 나뉨', mt.dirs.length === 2 && mt.dirs[0].seen === 6 && mt.dirs[1].seen === 2);

var base = St.meaningTest(WORDS);          // 앞 시험에서 넣어 둔 것이 이미 있다
Store.addAlias('n:a', '가나');
Store.addAlias('n:a', '가다');
Store.addAlias('v:c', '다다');
var mt2 = St.meaningTest(WORDS);
check('인정한 답 3개 늘어남', mt2.aliasCount - base.aliasCount === 3);
check('인정한 단어 2개 늘어남', mt2.aliasWords - base.aliasWords === 2);

var wm = St.weakMeanings(WORDS, 15);
check('틀린 뜻 카드만 나옴', wm.length === 2);
check('많이 틀린 것부터', wm[0].wrong >= wm[1].wrong);
check('단어와 뜻이 실림', wm[0].word === 'A' && wm[0].meaning === '가');
check('뜻 드릴만', wm.every(function (x) { return x.drill.indexOf('meaning') === 0; }));

// ---------------------------------------------------------------- 레벨 · 성별 집계

// Goethe 단어장은 누적이라 A1 단어가 B1 목록에도 실린다.
// 그걸 레벨마다 다 세면 A1 단어의 성적이 B1 성적으로도 잡혀 등급이 뭉개진다.
var LW = [
  { id: 'l:a', pos: 'noun', de: 'Aa', gender: 'm', levels: ['A1', 'A2', 'B1'] },  // A1 단어
  { id: 'l:b', pos: 'noun', de: 'Bb', gender: 'f', levels: ['B1', 'B2'] },        // B1 단어
  { id: 'l:c', pos: 'noun', de: 'Cc', gender: 'n', levels: ['B2'] },              // 진짜 B2
  { id: 'l:d', pos: 'noun', de: 'Dd', gender: 'n', levels: ['B2'] }
];

check('누적 태그는 첫 레벨로', St.baseLevel(LW[0]) === 'A1');
check('B1 부터 나오면 B1', St.baseLevel(LW[1]) === 'B1');
check('B2 에만 있으면 B2', St.baseLevel(LW[2]) === 'B2');
check('레벨이 없으면 null', St.baseLevel({ levels: [] }) === null);

Store.putCard('l:a', 'gender', card(3, 10, 10, 0));   // A1 단어를 다 맞힘
Store.putCard('l:b', 'gender', card(1, 10, 5, 5));    // B1 단어는 반타작
Store.putCard('l:c', 'gender', card(1, 4, 1, 3));     // B2 단어는 많이 틀림

var lv = St.byLevel(LW);
function lvl(l) {
  return lv.filter(function (x) { return x.label === l; })[0];
}
check('A1 만 A1 칸에', lvl('A1').seen === 10 && lvl('A1').rate === 1);
check('A1 단어가 A2 로 새지 않음', lvl('A2').seen === 0);
check('A1 단어가 B1 로 새지 않음', lvl('B1').seen === 10 && lvl('B1').right === 5);
check('B1 단어가 B2 로 새지 않음', lvl('B2').seen === 4 && lvl('B2').right === 1);
check('B2 정답률이 따로 나옴', Math.abs(lvl('B2').rate - 0.25) < 1e-9);
check('레벨별 단어 수', lvl('B2').pool === 2 && lvl('B2').words === 1);
check('푼 단어 수는 카드가 아니라 단어 기준', lvl('A1').words === 1);

// ── 성별: 성에 좌우되는 드릴을 전부 세는가
Store.putCard('l:c', 'artKein',     card(1, 4, 1, 3));    // 중성 — 표 드릴
Store.putCard('l:d', 'genderSpell', card(1, 2, 2, 0));
Store.putCard('l:b', 'plural',      card(1, 9, 0, 9));    // 성과 무관 — 섞이면 안 된다

var g = St.byGender(LW);
function gen(x) { return g.filter(function (y) { return y.g === x; })[0]; }
check('중성은 표 드릴까지 셈', gen('n').seen === 4 + 4 + 2);
check('여성은 복수형이 안 섞임', gen('f').seen === 10 && gen('f').wrong === 5);
check('남성 오답 없음', gen('m').seen === 10 && gen('m').rate === 0);
check('성 드릴 목록에 관사표가 있음', St.GENDER_DRILLS.indexOf('artKein') >= 0);
check('성 드릴 목록에 복수형은 없음', St.GENDER_DRILLS.indexOf('plural') < 0);

// 명사가 아닌 항목(전치사 등)은 성 통계에 안 들어간다
function genderTotal() {
  return St.byGender(LW.concat(WORDS)).reduce(function (a, x) { return a + x.seen; }, 0);
}
var beforeG = genderTotal();
Store.putCard('p:f', 'meaningKo', card(1, 3, 0, 3));   // 전치사 — 성이 없다
check('명사 아닌 것은 제외', genderTotal() === beforeG);
// 반대로 명사의 뜻→독일어는 관사까지 묻는 문제라 세야 한다
check('명사의 meaningKo 는 셈', beforeG > 10 + 10 + 10);

console.log(fail ? '\n뜻 테스트: ' + fail + ' / ' + n + ' 실패'
                 : '\n뜻 테스트: ' + n + '개 전부 통과');
process.exit(fail ? 1 : 0);
