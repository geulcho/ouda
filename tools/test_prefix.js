/*
 * test_prefix.js — 접두사 동사
 *
 *   node tools/test_prefix.js
 *
 * 여기서 가장 중요한 건 분리/비분리 판정이다. 틀리면 정반대를 가르치게 된다.
 * verbs.js 의 separable 필드는 원문에 활용형이 없던 동사에서 null 이라
 * 그대로 믿으면 안 되고, 근거를 보고 정해야 한다.
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
  navigator: { onLine: true }
};
sandbox.window = sandbox;
vm.createContext(sandbox);

['data/verbs.js', 'data/prefixes.js', 'data/prefixverbs.js',
 'js/store.js', 'js/srs.js', 'js/declension.js', 'js/conjugation.js',
 'js/grader.js', 'js/drills.js', 'js/prefix.js', 'js/prefix-drills.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
});

var P = sandbox.Prefix;
var C = sandbox.Conjugation;
var W = sandbox.VERBS;
var BY = {};
W.forEach(function (v) { BY[v.de] = v; });
P.prime(W);

var fail = 0, n = 0;
function check(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log('  FAIL  ' + name + (extra ? '  — ' + extra : '')); }
}
function info(w) { return BY[w] ? P.info(BY[w], W) : null; }

// ---------------------------------------------------------------- 분해

console.log('분해');

check('aufstehen = auf + stehen', (function () {
  var x = info('aufstehen');
  return x && x.prefix === 'auf' && x.base === 'stehen';
})());
check('zurückgeben 이 zu- 로 잘리지 않음', info('zurückgeben').prefix === 'zurück');
check('기본 동사가 데이터에 없으면 분해 안 함', info('vergessen') === null);

// 파싱 찌꺼기 — 동사가 아닌데 verbs.js 에 들어와 있다
check('gekommen 은 분해 안 됨 (kommen 의 과거분사)', info('gekommen') === null);
check('vollkommen 은 분해 안 됨 (형용사)', info('vollkommen') === null);

// ge- 는 생산적이지 않아 자동 분해하지 않는다. 시드에 적은 것만 다룬다.
check('gefallen 은 시드 선언으로 분해됨', (function () {
  var x = info('gefallen');
  return x && x.prefix === 'ge' && x.base === 'fallen';
})());
check('gehören 도 시드 선언으로', info('gehören').prefix === 'ge');

check('여러 낱말 표제어는 제외', (function () {
  var multi = W.filter(function (e) { return /\s/.test(P.bare(e.de)); });
  return multi.every(function (e) { return P.info(e, W) === null; });
})());

// ---------------------------------------------------------------- 분리 여부

console.log('분리 / 비분리 판정');

var SEP_CASES = {
  // 근거(pp·pres3)가 있는 것
  aufstehen: true, aufmachen: true, umziehen: true, durchhalten: true,
  verstehen: false, bestehen: false, beantworten: false, bekommen: false,
  // 가변 접두사 — 데이터를 따라야 한다
  wiederholen: false, übersetzen: false, unterschreiben: false, übernehmen: false,
  // 근거가 전혀 없는 것 — 접두사 종류로 추정해야 맞는다
  anfangen: true, ankommen: true, anrufen: true,
  mitkommen: true, mitnehmen: true, abfahren: true, abholen: true
};
Object.keys(SEP_CASES).forEach(function (w) {
  var x = info(w);
  check(w + ' 은 ' + (SEP_CASES[w] ? '분리' : '비분리'),
        x && x.separable === SEP_CASES[w],
        x ? '실제: ' + x.separable : '분해 안 됨');
});

check('가변 접두사는 근거 없으면 아예 안 다룸', (function () {
  return P.decomposable(W).every(function (e) {
    var x = P.info(e, W);
    return x.prefixData.type !== 'variable' || x.separable !== null;
  });
})());

check('분해된 것에 판정 미상이 없음', P.decomposable(W).every(function (e) {
  return P.info(e, W).separable !== null;
}));

// ---------------------------------------------------------------- 활용형 보정

console.log('활용형 보정 (기본 동사에서 끌어오기)');

var CONJ = {
  anfangen:   { main: 'er fängt an',  pp: 'angefangen',  zu: 'anzufangen' },
  abfahren:   { main: 'er fährt ab',  pp: 'abgefahren',  zu: 'abzufahren' },
  anrufen:    { main: 'er ruft an',   pp: 'angerufen',   zu: 'anzurufen' },
  mitkommen:  { main: 'er kommt mit', pp: 'mitgekommen', zu: 'mitzukommen' },
  aufstehen:  { main: 'er steht auf', pp: 'aufgestanden', zu: 'aufzustehen' },
  verstehen:  { main: 'er versteht',  pp: 'verstanden',  zu: 'zu verstehen' },
  bekommen:   { main: 'er bekommt',   pp: 'bekommen',    zu: 'zu bekommen' }
};
Object.keys(CONJ).forEach(function (w) {
  var c = P.forConjugation(BY[w], W), want = CONJ[w];
  check(w + ' 주문장', C.mainClause(c, 'er') === want.main, C.mainClause(c, 'er'));
  check(w + ' 과거분사', P.clean(c.pp) === want.pp, String(c.pp));
  check(w + ' zu 부정사', C.zuInfinitive(c) === want.zu, C.zuInfinitive(c));
});

check('원래 데이터가 있으면 덮어쓰지 않음', (function () {
  var c = P.forConjugation(BY['aufmachen'], W);
  return c.pp === BY['aufmachen'].pp;
})());

check('구두점이 붙은 pp 를 털어냄', P.clean('übernommen.') === 'übernommen');

// ---------------------------------------------------------------- ge 위치

console.log('과거분사 ge 위치');

function pp(w) { return P.ppForms(P.forConjugation(BY[w], W), info(w)); }

check('분리형은 접두사 뒤에 ge', pp('aufmachen').right === 'aufgemacht');
check('비분리형은 ge 없음', pp('besuchen').right === 'besucht');
check('오답에 정답이 섞이지 않음', (function () {
  return P.decomposable(W).every(function (e) {
    var f = P.ppForms(P.forConjugation(e, W), P.info(e, W));
    return !f || f.wrong.indexOf(f.right) < 0;
  });
})());
check('오답끼리도 안 겹침', (function () {
  return P.decomposable(W).every(function (e) {
    var f = P.ppForms(P.forConjugation(e, W), P.info(e, W));
    return !f || f.wrong[0] !== f.wrong[1];
  });
})());
check('분리형 규칙 설명', P.ppRule(info('aufmachen')).indexOf('사이에') >= 0);
check('비분리형 규칙 설명', P.ppRule(info('besuchen')).indexOf('붙지 않습니다') >= 0);

// ---------------------------------------------------------------- 직역

console.log('직역 조립');

check('시드 직역을 그대로 씀', info('aufstehen').literalKo === '위로 + 서다');
check('시드가 null 이면 직역을 만들지 않음', info('aufhören').literalKo === null);
check('기본 동사 뜻이 있으면 조립', (function () {
  var x = info('einsteigen');
  return typeof x.literalKo === 'string' && x.literalKo.indexOf('오르다') >= 0;
})());
check('기본 동사 뜻이 없으면 직역 없음', (function () {
  // 시드에 없고 BASEVERBS 에도 없는 기본 동사
  var e = P.decomposable(W).filter(function (x) {
    var i = P.info(x, W);
    return !i.seed && !i.baseKo;
  })[0];
  return !e || P.info(e, W).literalKo === null;
})());

// ---------------------------------------------------------------- 시드 검증

console.log('시드 데이터');

var seeds = sandbox.PREFIXVERBS;
check('시드가 비어 있지 않음', seeds.length >= 50);
check('모든 lemma 가 verbs.js 에 있음',
      seeds.every(function (s) { return !!BY[s.lemma]; }),
      seeds.filter(function (s) { return !BY[s.lemma]; }).map(function (s) { return s.lemma; }).join(' '));
check('lemma 중복 없음', (function () {
  var seen = {};
  return seeds.every(function (s) {
    if (seen[s.lemma]) return false;
    seen[s.lemma] = 1; return true;
  });
})());
check('모든 시드에 뜻이 있음',
      seeds.every(function (s) { return s.meanings && s.meanings.length && s.meanings[0].ko; }));
check('투명도 값이 정해진 셋 중 하나',
      seeds.every(function (s) { return ['high', 'medium', 'low'].indexOf(s.transparency) >= 0; }));
check('빈도 값이 정해진 셋 중 하나',
      seeds.every(function (s) {
        return s.meanings.every(function (m) {
          return ['high', 'mid', 'low'].indexOf(m.freq) >= 0;
        });
      }));
check('confusions 가 실재하는 단어',
      seeds.every(function (s) {
        return (s.confusions || []).every(function (c) { return !!BY[c]; });
      }),
      seeds.map(function (s) {
        return (s.confusions || []).filter(function (c) { return !BY[c]; }).join(' ');
      }).filter(Boolean).join(' '));
check('모든 시드가 분해됨',
      seeds.every(function (s) { return !!info(s.lemma); }),
      seeds.filter(function (s) { return !info(s.lemma); }).map(function (s) { return s.lemma; }).join(' '));
check('투명도 세 등급이 고루 있음', (function () {
  var t = {};
  seeds.forEach(function (s) { t[s.transparency] = (t[s.transparency] || 0) + 1; });
  return t.high >= 10 && t.medium >= 10 && t.low >= 10;
})());
check('예문에 한국어 번역이 붙어 있음',
      seeds.every(function (s) {
        return !s.ex || s.ex.every(function (x) { return x.de && x.ko; });
      }));

// ---------------------------------------------------------------- 접두사 데이터

console.log('접두사 데이터');

var pfx = sandbox.PREFIXES;
check('접두사 26개 이상', pfx.length >= 26);
check('type 값이 정해진 셋 중 하나',
      pfx.every(function (p) {
        return ['separable', 'inseparable', 'variable'].indexOf(p.type) >= 0;
      }));
check('id 중복 없음', (function () {
  var seen = {};
  return pfx.every(function (p) {
    if (seen[p.id]) return false;
    seen[p.id] = 1; return true;
  });
})());
check('대표 의미가 2~5개', pfx.every(function (p) {
  return p.meaningsKo.length >= 1 && p.meaningsKo.length <= 5;
}));
check('가변 접두사에는 전부 경고가 있음',
      pfx.filter(function (p) { return p.type === 'variable'; })
         .every(function (p) { return !!p.warning || !!p.noteKo; }));
check('요청한 분리 접두사가 다 있음', (function () {
  var want = 'ab an auf aus bei ein fest her hin los mit nach vor weg weiter zu zurück zusammen'.split(' ');
  return want.every(function (id) {
    return P.BY_ID[id] && P.BY_ID[id].type === 'separable';
  });
})());
check('요청한 비분리 접두사가 다 있음', (function () {
  var want = 'be emp ent er ge miss ver zer'.split(' ');
  return want.every(function (id) {
    return P.BY_ID[id] && P.BY_ID[id].type === 'inseparable';
  });
})());
// A1 의 순위가 0 이라 `|| 9` 같은 falsy 처리를 쓰면 A1 이 맨 뒤로 밀린다
check('학습 순서가 A1 부터', (function () {
  var sorted = P.sortPrefixes(sandbox.PREFIXES);
  var order = sorted.map(function (x) { return x.level; });
  var rank = { A1: 0, A2: 1, B1: 2, B2: 3 };
  for (var i = 1; i < order.length; i++) {
    if (rank[order[i]] < rank[order[i - 1]]) return false;
  }
  return order[0] === 'A1';
})());

check('um- 에 umfahren 경고가 있음',
      (P.BY_ID['um'].warning || '').indexOf('fahren') >= 0);
check('wieder- 에 wiederholen 예외가 적혀 있음',
      (P.BY_ID['wieder'].warning || '').indexOf('wiederholen') >= 0);

// ---------------------------------------------------------------- 드릴

console.log('드릴');

var D = sandbox.Drills.BY_ID;
function pool(id) {
  return W.filter(function (e) {
    try { return D[id].applies(e); } catch (x) { return false; }
  });
}

check('문법 드릴은 뜻 없이도 낼 수 있음', pool('pfxSeparable').length > 200);
check('ge 위치 드릴도 넉넉함', pool('pfxPP').length > 200);
check('분리 위치 드릴은 분리형만', pool('pfxSplit').every(function (e) {
  return P.info(e, W).separable === true;
}));
check('의미 드릴은 뜻이 있는 것만', pool('pfxMeaning').every(function (e) {
  return P.meanings(e, P.info(e, W)).length > 0 && P.info(e, W).baseKo;
}));

// 모든 드릴이 모든 대상에서 문제를 만들고 스스로 채점되는가
['pfxSeparable', 'pfxPP', 'pfxSplit', 'pfxMeaning', 'pfxWhich'].forEach(function (id) {
  var list = pool(id), bad = null, wrongGrade = null, dupe = null;
  list.forEach(function (e) {
    var q;
    try { q = D[id].make(e); } catch (err) { if (!bad) bad = e.de + ': ' + err.message; return; }
    if (!q || !q.prompt) { if (!bad) bad = e.de + ': prompt 없음'; return; }
    if (q.choices) {
      if (q.choices.indexOf(q.answer) < 0) { if (!bad) bad = e.de + ': 보기에 정답이 없음'; return; }
      // 보기가 겹치면 정답이 둘이 된다
      var seen = {};
      q.choices.forEach(function (c) { if (seen[c] && !dupe) dupe = e.de + ': ' + c; seen[c] = 1; });
    }
    var r = D[id].grade(q, q.choices ? q.answer : q.answer);
    if (r.grade !== 'right' && !wrongGrade) wrongGrade = e.de + ' -> ' + r.grade;
  });
  check(id + ' 문제 생성', !bad, bad);
  check(id + ' 보기 중복 없음', !dupe, dupe);
  check(id + ' 정답이 정답으로 채점됨', !wrongGrade, wrongGrade);
});

// 오답은 오답으로
check('pfxSeparable 오답 처리', (function () {
  var q = D.pfxSeparable.make(BY['aufstehen']);
  var wrong = q.choices.filter(function (c) { return c !== q.answer; })[0];
  return D.pfxSeparable.grade(q, wrong).grade === 'wrong';
})());
check('pfxPP 오답 처리', (function () {
  var q = D.pfxPP.make(BY['aufmachen']);
  var wrong = q.choices.filter(function (c) { return c !== q.answer; })[0];
  return D.pfxPP.grade(q, wrong).grade === 'wrong';
})());
check('pfxSplit 두 칸 다 맞아야 정답', (function () {
  var e = pool('pfxSplit')[0];
  var q = D.pfxSplit.make(e);
  return D.pfxSplit.grade(q, { v: q.answer.v, p: 'xxx' }).grade !== 'right';
})());

// 같은 항목이면 늘 같은 문제가 나와야 한다 (문제가 매번 바뀌면 학습이 안 된다)
check('문제가 항목마다 고정', (function () {
  var e = BY['aufstehen'];
  var a = D.pfxSeparable.make(e), b = D.pfxSeparable.make(e);
  return a.choices.join() === b.choices.join();
})());

// ---------------------------------------------------------------- 통계

console.log('통계');

var St = sandbox.Stats;
if (St) {
  sandbox.Store.putCard('aufstehen', 'pfxMeaning',
    { box: 1, due: 0, seen: 4, right: 1, wrong: 3, lastWrong: null, firstDay: '2026-08-01' });
  sandbox.Store.putCard('aufstehen', 'pfxPP',
    { box: 4, due: 0, seen: 4, right: 4, wrong: 0, lastWrong: null, firstDay: '2026-08-01' });

  var mg = St.meaningVsGrammar(W);
  check('뜻만 약한 동사를 잡아냄',
        mg.meaningWeak.some(function (x) { return x.word === 'aufstehen'; }));
  check('활용은 된다고 봄', mg.grammarWeak.every(function (x) { return x.word !== 'aufstehen'; }));

  var bp = St.byPrefix(W);
  check('접두사별 집계에 auf 가 잡힘', bp.some(function (x) { return x.id === 'auf'; }));
  check('접두사별 집계에 레이블이 붙음', bp.every(function (x) { return !!x.label; }));

  var adv = St.prefixAdvice(W);
  check('추천이 나옴', !!(adv && adv.text && adv.drills));
}

console.log(fail ? '\nX 실패 ' + fail + ' / ' + n : '\nOK 전부 통과 (' + n + ')');
process.exit(fail ? 1 : 0);
