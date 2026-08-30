/*
 * 앱 로직 통합 점검 (브라우저 없이)
 *
 *   node tools/test_app.js
 *
 * 실제 data/*.js 를 그대로 읽어서
 *   - 모든 드릴이 문제를 만들 수 있는지
 *   - 만든 문제의 정답을 그대로 넣으면 '정답' 이 나오는지 (엔진↔채점 일관성)
 *   - 일부러 틀리면 '오답' 이 나오는지
 * 를 확인한다. 여기서 터지면 브라우저에서도 터진다.
 */
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.dirname(__dirname);

// --- 최소한의 브라우저 흉내 ---------------------------------------------
var storage = {};
var sandbox = {
  console: console,
  localStorage: {
    getItem: function (k) { return k in storage ? storage[k] : null; },
    setItem: function (k, v) { storage[k] = String(v); },
    removeItem: function (k) { delete storage[k]; }
  },
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  // 받아쓰기 드릴은 브라우저 TTS 가 있어야 출제된다. 여기선 있다고 치고 검사한다.
  speechSynthesis: { speak: function () {}, cancel: function () {} },
  Date: Date, Math: Math, JSON: JSON, Object: Object, Array: Array,
  RegExp: RegExp, String: String, Number: Number, parseInt: parseInt,
  document: { readyState: 'loading', addEventListener: function () {},
              getElementById: function () { return null; },
              querySelectorAll: function () { return []; } }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

[
  'data/nouns.js', 'data/verbs.js', 'data/adjectives.js', 'data/functionwords.js',
  'data/grammar.js', 'data/pronouns.js', 'data/sentences.js',
  'data/prefixes.js', 'data/prefixverbs.js',
  'js/declension.js', 'js/conjugation.js', 'js/store.js', 'js/srs.js',
  'js/grader.js', 'js/drills.js', 'js/grammar-drills.js', 'js/order-drills.js',
  'js/wordorder.js', 'js/wordorder-drills.js', 'js/meaning-drills.js',
  'js/prefix.js', 'js/prefix-drills.js',
  'js/editor.js'
].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
});

var W = sandbox.window;
var Drills = W.Drills, Store = W.Store, SRS = W.SRS;

var ALL = [].concat(W.NOUNS, W.VERBS, W.ADJECTIVES, W.FUNCTIONWORDS,
                    W.GrammarDrills.makeItems(), W.OrderDrills.makeItems(),
                    W.WordOrderDrills.makeItems());
W.__PREP_NOUNS = W.NOUNS.filter(function (n) {
  return n.gender && n.gender !== 'pl' && !n.nDekl && !n.adjNoun && !n.pluralOnly;
}).slice(0, 300);
console.log('단어 ' + ALL.length.toLocaleString() + '개 로드');

var fails = 0;
function bad(msg) { fails++; console.log('  X ' + msg); }

// --- 드릴별 점검 ---------------------------------------------------------

console.log('\n드릴별 문제 생성 · 자기채점');
Drills.ALL.forEach(function (d) {
  var pool = ALL.filter(function (e) {
    if (d.pos !== '*' && d.pos !== e.pos) return false;
    try { return d.applies(e); } catch (err) { bad(d.id + '.applies 예외: ' + err.message); return false; }
  });

  if (!pool.length) { bad(d.id + ' — 적용되는 단어가 하나도 없음'); return; }

  // 무작위 표본 40개
  var sample = [];
  for (var i = 0; i < Math.min(40, pool.length); i++) {
    sample.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  var madeFail = 0, selfFail = 0, wrongFail = 0, examples = [];
  sample.forEach(function (e) {
    var q;
    try { q = d.make(e); } catch (err) { madeFail++; if (madeFail === 1) bad(d.id + '.make 예외 (' + e.de + '): ' + err.message); return; }
    if (!q || !q.prompt) { madeFail++; return; }
    if (examples.length < 1) examples.push({ e: e, q: q });

    // 정답을 그대로 넣으면 '정답' 이어야 한다.
    // 어순 드릴은 문자열이 아니라 '성분 배열'을 받는다.
    var input = q.answerChunks ? q.answerChunks : q.answer;
    var r;
    try { r = d.grade(q, input); } catch (err) { selfFail++; bad(d.id + '.grade 예외: ' + err.message); return; }
    if (!r || r.grade !== 'right') {
      selfFail++;
      if (selfFail === 1) {
        bad(d.id + ' — 정답을 넣었는데 "' + (r && r.grade) + '" (' + e.de + ')\n' +
            '      문제: ' + q.prompt + '\n      정답: ' + JSON.stringify(q.answer));
      }
    }

    // 엉뚱한 답은 '오답' 이어야 한다
    var junk = (d.input === 'table' || d.input === 'multi')
      ? mapVals(q.answer, function () { return 'zzz'; })
      : q.answerChunks ? breakOrder(q.answerChunks, q.sentType)
      : 'zzzqqq';
    var r2 = d.grade(q, junk);
    if (r2 && r2.grade === 'right') {
      wrongFail++;
      if (wrongFail === 1) bad(d.id + ' — 엉뚱한 답인데 정답 처리됨 (' + e.de + ')');
    }
  });

  var ex = examples[0];
  var status = (madeFail || selfFail || wrongFail)
    ? ('생성실패 ' + madeFail + ' 자기채점실패 ' + selfFail + ' 오탐 ' + wrongFail)
    : 'OK';
  console.log('  ' + pad(d.id, 16) + pad(String(pool.length), 7) + '개  ' + status);
  if (ex && !madeFail && !selfFail) {
    console.log('      예) ' + String(ex.q.prompt).replace(/\n/g, ' ') +
                '   →  ' + fmt(ex.q.answer));
  }
});

/*
 * 어순 드릴용 '확실히 틀린 배열'.
 * 그냥 뒤집으면 우연히 맞는 문장이 되기도 한다 —
 * 'Fast leer ist meine Einzimmerwohnung' 은 실제로 올바른 독일어다.
 * 그래서 정동사를 규칙상 절대 못 오는 자리로 옮긴다.
 */
function breakOrder(chunks, type) {
  var v = null, rest = [];
  chunks.forEach(function (c) { if (c.role === 'V' && !v) v = c; else rest.push(c); });
  if (!v) return chunks.slice().reverse();
  // 주문장·의문문은 동사를 맨 끝으로, 종속절은 맨 앞으로 보내면 반드시 틀린다
  return type === 'sub' ? [v].concat(rest) : rest.concat([v]);
}

function mapVals(o, f) {
  var out = {}; Object.keys(o).forEach(function (k) { out[k] = f(o[k]); }); return out;
}
function fmt(a) {
  if (a && typeof a === 'object') {
    return Object.keys(a).map(function (k) { return k + '=' + a[k]; }).join(' / ');
  }
  return String(a);
}
function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }

// --- SRS 동작 -------------------------------------------------------------

console.log('\nSRS 스케줄러');
var c = SRS.newCard();
c = SRS.review(c, 'right');
if (c.box !== 1) bad('첫 정답 후 상자가 1이어야 함, 실제 ' + c.box);
c = SRS.review(c, 'right'); c = SRS.review(c, 'right');
if (c.box !== 3) bad('세 번 정답 후 상자 3이어야 함, 실제 ' + c.box);
var beforeWrong = c.box;
c = SRS.review(c, 'wrong');
if (c.box !== 1) bad('오답 후 상자 1로 떨어져야 함, 실제 ' + c.box + ' (이전 ' + beforeWrong + ')');
if (!c.lastWrong) bad('오답 시각이 기록되지 않음');
if (SRS.isDue(c, Date.now())) bad('방금 푼 카드가 바로 복습 예정이 되면 안 됨');
if (!SRS.isDue(c, Date.now() + 11 * 60 * 1000)) bad('10분 뒤에는 복습 예정이어야 함');
console.log('  OK 상자 이동 · 복습 시점');

// --- 채점기 세부 ----------------------------------------------------------

console.log('\n채점기');
var G = W.Grader;
function chk(label, got, want) {
  if (got !== want) bad(label + ' — 기대 ' + want + ', 실제 ' + got);
}
chk('정확한 답',      G.gradeArticleNoun('der Apfel', 'm', 'Apfel').grade, 'right');
chk('소문자 명사',    G.gradeArticleNoun('der apfel', 'm', 'Apfel').grade, 'partial');
chk('성 오답',        G.gradeArticleNoun('die Apfel', 'm', 'Apfel').grade, 'wrong');
chk('성 오답-철자OK', G.gradeArticleNoun('die Apfel', 'm', 'Apfel').spellingOk, true);
chk('성 오답-성X',    G.gradeArticleNoun('die Apfel', 'm', 'Apfel').genderOk, false);
chk('관사 누락',      G.gradeArticleNoun('Apfel', 'm', 'Apfel').grade, 'wrong');
chk('오타 1글자',     G.gradeArticleNoun('der Aplfel', 'm', 'Apfel').grade, 'partial');
chk('움라우트 ae',    G.gradeText('Aepfel', 'Äpfel', { noun: true }).grade, 'partial');
chk('완전 오답',      G.gradeText('Banane', 'Apfel', { noun: true }).grade, 'wrong');
chk('빈 답',          G.gradeText('', 'Apfel', {}).grade, 'wrong');
chk('엄격 대소문자',  G.gradeArticleNoun('der apfel', 'm', 'Apfel', { strictCase: true }).grade, 'wrong');
console.log('  OK 성/철자 분리 채점 · 움라우트 · 오타 허용');

// --- 임포터 ---------------------------------------------------------------

console.log('\n임포터');
var E = W.Editor;
var imported = E.parseImport([
  'der Apfel, -¨',
  'die Ansage, -n',
  'das Buch, ¨-er\tBücher sind teuer.',
  'das Haus, ¨-er',
  'die Eltern (pl.)',
  'der Wagen, -',
  'fahren, fährt, fuhr, ist gefahren',
  'aufstehen, steht auf, stand auf, ist aufgestanden',
  'schnell',
  '@@@ 알아볼 수 없는 줄'
].join('\n'));

function imp(de) {
  for (var i = 0; i < imported.rows.length; i++) if (imported.rows[i].de === de) return imported.rows[i];
  return null;
}
if (imported.rows.length !== 9) bad('9개를 인식해야 함, 실제 ' + imported.rows.length);
if (imported.errors.length !== 1) bad('알아볼 수 없는 줄 1개를 잡아야 함, 실제 ' + imported.errors.length);
chk('Apfel 복수',   imp('Apfel') && imp('Apfel').plural, 'Äpfel');
chk('Apfel 성',     imp('Apfel') && imp('Apfel').gender, 'm');
chk('Ansage 복수',  imp('Ansage') && imp('Ansage').plural, 'Ansagen');
chk('Buch 복수',    imp('Buch') && imp('Buch').plural, 'Bücher');
chk('Buch 예문',    imp('Buch') && imp('Buch').ex[0].de, 'Bücher sind teuer.');
chk('Haus 복수',    imp('Haus') && imp('Haus').plural, 'Häuser');
chk('Eltern 복수전용', imp('Eltern') && imp('Eltern').pluralOnly, true);
chk('Wagen 무변화', imp('Wagen') && imp('Wagen').plural, 'Wagen');
chk('Buch 2격어미', imp('Buch') && imp('Buch').genSg, 's');
chk('Haus 2격어미', imp('Haus') && imp('Haus').genSg, 'es');
chk('fahren 과거',  imp('fahren') && imp('fahren').praet, 'fuhr');
chk('fahren 조동사',imp('fahren') && imp('fahren').aux, 'sein');
chk('aufstehen 분리', imp('aufstehen') && imp('aufstehen').separable, true);
chk('aufstehen 접두어', imp('aufstehen') && imp('aufstehen').prefix, 'auf');
chk('schnell 품사', imp('schnell') && imp('schnell').pos, 'adj');
console.log('  OK 명사·동사·형용사 파싱 · 복수형 계산 · 오류 검출');

// 임포트한 항목이 실제로 드릴에 쓰이는지
var apfel = imp('Apfel');
var t = W.Declension.table(apfel, 'definite', {});
chk('임포트 결과로 표 생성', t.sg.gen.full, 'des Apfels');
chk('임포트 결과 3격 복수', t.pl.dat.full, 'den Äpfeln');

console.log('\n검수 대상 판정');
var review = W.NOUNS.filter(E.needsReview);
console.log('  검수 필요 명사 ' + review.length + '개' +
            (review.length ? ' (예: ' + review.slice(0, 5).map(function (x) { return x.de; }).join(', ') + ')' : ''));

// --- 데이터 품질 ----------------------------------------------------------

console.log('\n데이터 품질');
var noPlural = W.NOUNS.filter(function (n) { return !n.plural && !n.noPlural && !n.pluralOnly; });
var noGender = W.NOUNS.filter(function (n) { return !n.gender; });
var badEx = ALL.filter(function (e) { return e.ex && e.ex.some(function (x) { return !x.de; }); });
if (noGender.length) bad('성이 없는 명사 ' + noGender.length + '개');
if (badEx.length) bad('빈 예문 ' + badEx.length + '개');
console.log('  명사 ' + W.NOUNS.length + ' / 동사 ' + W.VERBS.length +
            ' / 형용사·부사 ' + W.ADJECTIVES.length + ' / 기능어 ' + W.FUNCTIONWORDS.length);
console.log('  복수형 미상 ' + noPlural.length + '개 (표기가 원문에 없던 것)');

console.log('\n' + (fails ? 'X 실패 ' + fails + '건' : 'OK 전부 통과'));
process.exit(fails ? 1 : 0);
