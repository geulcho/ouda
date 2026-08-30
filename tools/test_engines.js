/*
 * 격변화 · 동사활용 엔진 기준 케이스 검증
 *
 *   node tools/test_engines.js
 *
 * 여기 있는 정답은 전부 손으로 확인한 값이다.
 * 엔진이 틀리면 틀린 표로 외우게 되므로 이 테스트가 통과해야 앱을 붙인다.
 */
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.dirname(__dirname);
var sandbox = { window: {}, console: console };
sandbox.global = sandbox;
vm.createContext(sandbox);

['js/declension.js', 'js/conjugation.js'].forEach(function (f) {
  var p = path.join(ROOT, f);
  if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: f });
});

var D = sandbox.window.Declension;
var C = sandbox.window.Conjugation;

var pass = 0, fail = 0;
function eq(label, actual, expected) {
  if (actual === expected) { pass++; return; }
  fail++;
  console.log('  X ' + label + '\n      기대: ' + JSON.stringify(expected) +
              '\n      실제: ' + JSON.stringify(actual));
}

// ---------------------------------------------------------------- 명사

var Apfel  = { de: 'Apfel', gender: 'm', plural: 'Äpfel', genSg: 's', nDekl: false };
var Kind   = { de: 'Kind', gender: 'n', plural: 'Kinder', genSg: 'es', nDekl: false };
var Frau   = { de: 'Frau', gender: 'f', plural: 'Frauen', genSg: '', nDekl: false };
var Auto   = { de: 'Auto', gender: 'n', plural: 'Autos', genSg: 's', nDekl: false };
var Student= { de: 'Student', gender: 'm', plural: 'Studenten', genSg: 'en', nDekl: true };
var Junge  = { de: 'Junge', gender: 'm', plural: 'Jungen', genSg: 'n', nDekl: true };
var Erw    = { de: 'Erwachsene', gender: 'm', plural: 'Erwachsenen', genSg: 's', adjNoun: true };
var Eltern = { de: 'Eltern', gender: 'pl', plural: 'Eltern', pluralOnly: true };

console.log('명사 — 정관사 단수');
eq('der Apfel Nom', D.table(Apfel, 'definite').sg.nom.full, 'der Apfel');
eq('der Apfel Gen', D.table(Apfel, 'definite').sg.gen.full, 'des Apfels');
eq('der Apfel Dat', D.table(Apfel, 'definite').sg.dat.full, 'dem Apfel');
eq('der Apfel Akk', D.table(Apfel, 'definite').sg.akk.full, 'den Apfel');
eq('das Kind Gen',  D.table(Kind, 'definite').sg.gen.full,  'des Kindes');
eq('die Frau Gen',  D.table(Frau, 'definite').sg.gen.full,  'der Frau');   // 여성은 명사 무변화
eq('die Frau Dat',  D.table(Frau, 'definite').sg.dat.full,  'der Frau');

console.log('명사 — 정관사 복수 (3격 -n)');
eq('Äpfel Dat pl',  D.table(Apfel, 'definite').pl.dat.full, 'den Äpfeln');
eq('Kinder Dat pl', D.table(Kind, 'definite').pl.dat.full,  'den Kindern');
eq('Autos Dat pl',  D.table(Auto, 'definite').pl.dat.full,  'den Autos');  // -s 복수는 n 안 붙음
eq('Frauen Dat pl', D.table(Frau, 'definite').pl.dat.full,  'den Frauen'); // -n 복수도 그대로
eq('Äpfel Gen pl',  D.table(Apfel, 'definite').pl.gen.full, 'der Äpfel');

console.log('명사 — n-변화 (목차 17-4)');
eq('Student Nom', D.table(Student, 'definite').sg.nom.full, 'der Student');
eq('Student Gen', D.table(Student, 'definite').sg.gen.full, 'des Studenten');
eq('Student Dat', D.table(Student, 'definite').sg.dat.full, 'dem Studenten');
eq('Student Akk', D.table(Student, 'definite').sg.akk.full, 'den Studenten');
eq('Junge Akk',   D.table(Junge, 'definite').sg.akk.full,   'den Jungen');

console.log('명사 — 부정관사');
eq('ein Apfel Nom',  D.table(Apfel, 'indefinite').sg.nom.full, 'ein Apfel');
eq('ein Apfel Gen',  D.table(Apfel, 'indefinite').sg.gen.full, 'eines Apfels');
eq('ein Apfel Dat',  D.table(Apfel, 'indefinite').sg.dat.full, 'einem Apfel');
eq('ein Apfel Akk',  D.table(Apfel, 'indefinite').sg.akk.full, 'einen Apfel');
eq('eine Frau Akk',  D.table(Frau, 'indefinite').sg.akk.full,  'eine Frau');
eq('ein Kind Nom',   D.table(Kind, 'indefinite').sg.nom.full,  'ein Kind');
eq('ein Kind Akk',   D.table(Kind, 'indefinite').sg.akk.full,  'ein Kind');
eq('ein 복수 없음',   D.table(Apfel, 'indefinite').pl.nom,      null);

console.log('명사 — kein / mein');
eq('kein Apfel Akk', D.table(Apfel, 'kein').sg.akk.full,  'keinen Apfel');
eq('keine Äpfel Dat',D.table(Apfel, 'kein').pl.dat.full,  'keinen Äpfeln');
eq('mein Kind Dat',  D.table(Kind, 'mein').sg.dat.full,   'meinem Kind');
eq('meine Frau Gen', D.table(Frau, 'mein').sg.gen.full,   'meiner Frau');
eq('unser Apfel Dat',D.table(Apfel, 'unser').sg.dat.full, 'unserem Apfel');
eq('euer Apfel Nom', D.table(Apfel, 'euer').sg.nom.full,  'euer Apfel');
eq('euer Apfel Akk', D.table(Apfel, 'euer').sg.akk.full,  'euren Apfel');

console.log('명사 — 형용사변화 명사 (목차 8-3)');
eq('der Erwachsene',   D.table(Erw, 'definite').sg.nom.full,   'der Erwachsene');
eq('den Erwachsenen',  D.table(Erw, 'definite').sg.akk.full,   'den Erwachsenen');
eq('des Erwachsenen',  D.table(Erw, 'definite').sg.gen.full,   'des Erwachsenen');
eq('ein Erwachsener',  D.table(Erw, 'indefinite').sg.nom.full, 'ein Erwachsener');
eq('einen Erwachsenen',D.table(Erw, 'indefinite').sg.akk.full, 'einen Erwachsenen');

console.log('명사 — 복수전용');
eq('die Eltern 단수없음', D.table(Eltern, 'definite').sg.nom, null);
eq('die Eltern Dat pl',   D.table(Eltern, 'definite').pl.dat.full, 'den Eltern');

// ---------------------------------------------------------------- 형용사 어미

console.log('형용사 어미 — 약변화 (정관사 뒤)');
eq('der große Hund',       D.phrase(Apfel, 'groß', 'nom', false, 'definite').replace('Apfel','Hund'), 'der große Hund');
eq('den großen Apfel',     D.phrase(Apfel, 'groß', 'akk', false, 'definite'), 'den großen Apfel');
eq('dem großen Apfel',     D.phrase(Apfel, 'groß', 'dat', false, 'definite'), 'dem großen Apfel');
eq('die große Frau',       D.phrase(Frau, 'groß', 'nom', false, 'definite'),  'die große Frau');
eq('das kleine Kind',      D.phrase(Kind, 'klein', 'nom', false, 'definite'), 'das kleine Kind');
eq('den großen Äpfeln',    D.phrase(Apfel, 'groß', 'dat', true, 'definite'),  'den großen Äpfeln');

console.log('형용사 어미 — 혼합변화 (부정관사 뒤)');
eq('ein großer Apfel',     D.phrase(Apfel, 'groß', 'nom', false, 'indefinite'), 'ein großer Apfel');
eq('einen großen Apfel',   D.phrase(Apfel, 'groß', 'akk', false, 'indefinite'), 'einen großen Apfel');
eq('ein kleines Kind',     D.phrase(Kind, 'klein', 'nom', false, 'indefinite'), 'ein kleines Kind');
eq('eine große Frau',      D.phrase(Frau, 'groß', 'nom', false, 'indefinite'),  'eine große Frau');
eq('meinem großen Apfel',  D.phrase(Apfel, 'groß', 'dat', false, 'mein'),       'meinem großen Apfel');

console.log('형용사 어미 — 강변화 (무관사)');
eq('großer Apfel Nom',  D.phrase(Apfel, 'groß', 'nom', false, 'none'), 'großer Apfel');
eq('großen Apfel Akk',  D.phrase(Apfel, 'groß', 'akk', false, 'none'), 'großen Apfel');
eq('großem Apfel Dat',  D.phrase(Apfel, 'groß', 'dat', false, 'none'), 'großem Apfel');
eq('kaltes Wasser Nom', D.phrase(Kind, 'kalt', 'nom', false, 'none').replace('Kind','Wasser'), 'kaltes Wasser');
eq('große Äpfel Nom',   D.phrase(Apfel, 'groß', 'nom', true, 'none'),  'große Äpfel');
eq('großen Äpfeln Dat', D.phrase(Apfel, 'groß', 'dat', true, 'none'),  'großen Äpfeln');

console.log('성 추론 규칙');
eq('Zeitung -> f',   D.guessGender('Zeitung').gender, 'f');
eq('Möglichkeit->f', D.guessGender('Möglichkeit').gender, 'f');
eq('Mädchen -> n',   D.guessGender('Mädchen').gender, 'n');
eq('Lehrer -> m',    D.guessGender('Lehrer').gender, 'm');
eq('Tourismus -> m', D.guessGender('Tourismus').gender, 'm');

// ---------------------------------------------------------------- 동사

if (C) {
  var fahren = { de:'fahren', pres3:'fährt', praet:'fuhr', pp:'gefahren', aux:'sein',
                 separable:false, irregular:true };
  var machen = { de:'machen', pres3:'macht', praet:'machte', pp:'gemacht', aux:'haben',
                 separable:false, irregular:false };
  var arbeiten={ de:'arbeiten', pres3:'arbeitet', praet:'arbeitete', pp:'gearbeitet', aux:'haben',
                 separable:false, irregular:false };
  var einsteigen={de:'einsteigen', pres3:'steigt ein', praet:'stieg ein', pp:'eingestiegen',
                 aux:'sein', separable:true, prefix:'ein', irregular:true };
  var sein   = { de:'sein', pres3:'ist', praet:'war', pp:'gewesen', aux:'sein', irregular:true };

  console.log('동사 — 현재 인칭변화');
  eq('ich mache',   C.present(machen, 'ich'),  'mache');
  eq('du machst',   C.present(machen, 'du'),   'machst');
  eq('er macht',    C.present(machen, 'er'),   'macht');
  eq('wir machen',  C.present(machen, 'wir'),  'machen');
  eq('ihr macht',   C.present(machen, 'ihr'),  'macht');
  eq('du arbeitest',C.present(arbeiten, 'du'), 'arbeitest');   // -t 어간은 e 삽입
  eq('ihr arbeitet',C.present(arbeiten, 'ihr'),'arbeitet');
  eq('du fährst',   C.present(fahren, 'du'),   'fährst');      // 모음변화는 du/er 에만
  eq('er fährt',    C.present(fahren, 'er'),   'fährt');
  eq('wir fahren',  C.present(fahren, 'wir'),  'fahren');
  eq('ich bin',     C.present(sein, 'ich'),    'bin');
  eq('du bist',     C.present(sein, 'du'),     'bist');

  console.log('동사 — 완료 / 과거');
  eq('완료 ich',    C.perfect(fahren, 'ich'),  'bin gefahren');
  eq('완료 er',     C.perfect(machen, 'er'),   'hat gemacht');
  eq('과거완료 ich',C.pluperfect(fahren,'ich'),'war gefahren');
  eq('과거 er',     C.preterite(fahren, 'er'), 'fuhr');
  eq('과거 wir',    C.preterite(machen, 'wir'),'machten');
  eq('미래 ich',    C.future(machen, 'ich'),   'werde machen');

  console.log('동사 — 분리동사 어순 (목차 4-2)');
  eq('주문장',      C.mainClause(einsteigen, 'ich', 'schnell'), 'ich steige schnell ein');
  eq('zu 부정사',   C.zuInfinitive(einsteigen),                 'einzusteigen');
  eq('zu 부정사(비분리)', C.zuInfinitive(machen),               'zu machen');
  eq('종속절',      C.subClause(einsteigen, 'ich'),             'ich einsteige');

  console.log('동사 — 수동태 (목차 13)');
  eq('현재 수동',   C.passive(machen, 'es', 'present'), 'es wird gemacht');
  eq('과거 수동',   C.passive(machen, 'es', 'preterite'), 'es wurde gemacht');
} else {
  console.log('(conjugation.js 없음 — 동사 테스트 건너뜀)');
}

console.log('\n' + (fail ? 'X 실패 ' + fail + ' / 통과 ' + pass
                         : 'OK 전부 통과 (' + pass + ')'));
process.exit(fail ? 1 : 0);
