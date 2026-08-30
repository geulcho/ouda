/*
 * 어순 검증기 시험
 *
 *   node tools/test_wordorder.js
 *
 * 여기가 어순 학습 전체의 기반이다.
 * 제일 중요한 것은 "맞는 배열은 전부 정답이어야 한다" — 정답을 하나만 인정하면
 * 독일어 어순을 정반대로 가르치게 된다.
 */
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.dirname(__dirname);
var sandbox = { console: console };
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/wordorder.js'), 'utf8'),
                sandbox, { filename: 'wordorder.js' });

var W = sandbox.window.WordOrder;
var fails = 0;

function bad(m) { fails++; console.log('  X ' + m); }

/** 'Ich:S | gehe:V | morgen:Te' 형태로 간단히 적는다 */
function parse(spec) {
  return spec.trim().split(/\s+\|\s+/).map(function (p) {
    var i = p.lastIndexOf(':');
    return { t: p.slice(0, i), role: p.slice(i + 1) };
  });
}

function ok(type, spec, label) {
  var r = W.validate(type, parse(spec));
  if (!r.ok) {
    bad('정답이어야 함 — ' + (label || spec) + '\n      ' +
        r.violations.map(function (v) { return '[' + v.rule + '] ' + v.msg; }).join('\n      '));
  }
}

function no(type, spec, expectRule, label) {
  var r = W.validate(type, parse(spec));
  if (r.ok) {
    bad('오답이어야 함 — ' + (label || spec));
  } else if (expectRule && !r.violations.some(function (v) { return v.rule === expectRule; })) {
    bad('위반 규칙이 ' + expectRule + ' 이어야 함 — ' + (label || spec) +
        '  (실제: ' + r.violations.map(function (v) { return v.rule; }).join(',') + ')');
  }
}

// ---------------------------------------------------------------- V2

console.log('V2 — 정동사는 두 번째 성분');
ok('main', 'Ich:S | gehe:V | morgen:Te | ins Kino:Lo', 'Ich gehe morgen ins Kino.');
ok('main', 'morgen:Te | gehe:V | ich:S | ins Kino:Lo', 'Morgen gehe ich ins Kino.');
ok('main', 'ins Kino:Lo | gehe:V | ich:S | morgen:Te', 'Ins Kino gehe ich morgen.');
no('main', 'Ich:S | morgen:Te | gehe:V | ins Kino:Lo', 'V2', 'Ich morgen gehe ins Kino.');
no('main', 'Ich:S | morgen:Te | ins Kino:Lo | gehe:V', 'V2', '동사가 맨 끝');

console.log('V2 — Vorfeld 가 여러 낱말이어도 성분 하나면 된다');
ok('main', 'In der heutigen Gesellschaft:Lo | wird:V | leider:Mo | konsumiert:Vend',
   'In der heutigen Gesellschaft wird leider konsumiert.');
ok('main', 'Vor der Abfahrt:Te | rufe:V | ich:S | an:Vend', 'Vor der Abfahrt rufe ich an.');

console.log('Vorfeld 에 올 수 없는 것');
no('main', 'nicht:Neg | gehe:V | ich:S | ins Kino:Lo', 'Vorfeld', 'nicht 가 앞자리');
no('main', 'es:AkkP | gebe:V | ich:S | ihm:DatP', 'Vorfeld', '대명사 목적어가 앞자리');

// ---------------------------------------------------------------- Satzklammer

console.log('Satzklammer — 문장 끝 동사부는 맨 끝');
ok('main', 'Ich:S | habe:V | gestern:Te | gearbeitet:Vend', 'Ich habe gestern gearbeitet.');
no('main', 'Ich:S | habe:V | gearbeitet:Vend | gestern:Te', 'Satzklammer',
   'Ich habe gearbeitet gestern.');
ok('main', 'Ich:S | rufe:V | dich:AkkP | an:Vend', 'Ich rufe dich an.');
no('main', 'Ich:S | rufe:V | an:Vend | dich:AkkP', 'Satzklammer', 'Ich rufe an dich.');
ok('main', 'Ich:S | kann:V | heute:Te | kommen:Vend', 'Ich kann heute kommen.');

// ---------------------------------------------------------------- TeKaMoLo

console.log('TeKaMoLo — 시간 → 이유 → 방법 → 장소');
ok('main', 'Ich:S | fahre:V | morgen:Te | mit dem Zug:Mo | nach Berlin:Lo',
   'morgen · mit dem Zug · nach Berlin');
ok('main', 'Ich:S | fahre:V | morgen:Te | wegen der Arbeit:Ka | mit dem Zug:Mo | nach Berlin:Lo',
   '네 가지 전부');
no('main', 'Ich:S | fahre:V | nach Berlin:Lo | morgen:Te', 'TeKaMoLo', '장소가 시간보다 앞');
no('main', 'Ich:S | fahre:V | mit dem Zug:Mo | wegen der Arbeit:Ka', 'TeKaMoLo',
   '방법이 이유보다 앞');
ok('main', 'morgen:Te | fahre:V | ich:S | mit dem Zug:Mo | nach Berlin:Lo',
   '시간을 Vorfeld 로 빼도 나머지 순서는 유지');

// ---------------------------------------------------------------- 목적어 순서

console.log('목적어 순서');
ok('main', 'Ich:S | gebe:V | dem Mann:Dat | das Buch:Akk', '명사 둘: 3격 → 4격');
no('main', 'Ich:S | gebe:V | das Buch:Akk | dem Mann:Dat', 'ObjektOrder', '명사 둘: 4격 먼저');
ok('main', 'Ich:S | gebe:V | es:AkkP | dem Mann:Dat', '4격 대명사 먼저');
no('main', 'Ich:S | gebe:V | dem Mann:Dat | es:AkkP', null, '명사가 대명사보다 앞');
ok('main', 'Ich:S | gebe:V | es:AkkP | ihm:DatP', '대명사 둘: 4격 → 3격');
no('main', 'Ich:S | gebe:V | ihm:DatP | es:AkkP', 'ObjektOrder', '대명사 둘: 3격 먼저');

console.log('대명사는 앞쪽으로');
ok('main', 'Ich:S | habe:V | es:AkkP | gestern:Te | gekauft:Vend', '대명사가 부사구보다 앞');
no('main', 'Ich:S | habe:V | gestern:Te | es:AkkP | gekauft:Vend', 'PronomenVorn',
   '부사구가 대명사보다 앞');

// ---------------------------------------------------------------- 종속절

console.log('종속절 — 정동사가 맨 끝');
ok('sub', 'weil:Konj | ich:S | müde:Präd | bin:V', 'weil ich müde bin');
no('sub', 'weil:Konj | ich:S | bin:V | müde:Präd', 'V-End', 'weil ich bin müde');
ok('sub', 'weil:Konj | ich:S | gestern:Te | gearbeitet:Vend | habe:V',
   'weil ich gestern gearbeitet habe');
no('sub', 'weil:Konj | ich:S | habe:V | gestern:Te | gearbeitet:Vend', 'V-End',
   'weil ich habe gestern gearbeitet');
no('sub', 'ich:S | weil:Konj | müde:Präd | bin:V', 'Konj', '접속사가 앞이 아님');

// ---------------------------------------------------------------- 의문문

console.log('의문문');
ok('wFrage', 'Wann:W | kommst:V | du:S', 'Wann kommst du?');
no('wFrage', 'Wann:W | du:S | kommst:V', 'V2', 'Wann du kommst?');
ok('jaNein', 'Kommst:V | du:S | morgen:Te', 'Kommst du morgen?');
no('jaNein', 'du:S | kommst:V | morgen:Te', 'V1', 'Du kommst morgen?');

// ---------------------------------------------------------------- nicht

console.log('nicht 위치');
ok('main', 'Ich:S | kenne:V | den Mann:Akk | nicht:Neg', 'Ich kenne den Mann nicht.');
no('main', 'Ich:S | kenne:V | nicht:Neg | den Mann:Akk', 'NichtPos',
   'Ich kenne nicht den Mann.');
ok('main', 'Das Buch:S | ist:V | nicht:Neg | interessant:Präd', '술어 앞');
ok('main', 'Ich:S | habe:V | ihn:AkkP | nicht:Neg | gesehen:Vend', '과거분사 앞');

// ---------------------------------------------------------------- 정답이 여러 개인지

console.log('한 문장에서 정답이 몇 가지나 되는가');
var chunks = parse('Ich:S | fahre:V | morgen:Te | nach Berlin:Lo');
var valid = W.countValid('main', chunks);
console.log('  Ich fahre morgen nach Berlin — 정답 ' + valid.length + '가지');
valid.forEach(function (x) { console.log('    ' + x); });
if (valid.length < 3) bad('Vorfeld 를 바꾼 배열이 전부 정답이어야 하는데 ' + valid.length + '가지뿐');

// ---------------------------------------------------------------- 필드 분해

console.log('문장 필드 분해 (Satzklammer 시각화용)');
var f = W.fields('main', parse('Ich:S | habe:V | gestern:Te | mit ihm:Mo | gesprochen:Vend'));
function txt(list) { return list.map(function (c) { return c.t; }).join(' '); }
console.log('  Vorfeld=' + txt(f.vorfeld) + ' | V=' + f.linke.t +
            ' | Mittelfeld=' + txt(f.mittelfeld) + ' | Ende=' + txt(f.rechte));
if (txt(f.vorfeld) !== 'Ich') bad('Vorfeld 분해 틀림');
if (f.linke.t !== 'habe') bad('정동사 분해 틀림');
if (f.rechte[0].t !== 'gesprochen') bad('문장 끝 동사부 분해 틀림');

console.log('\n' + (fails ? 'X 실패 ' + fails + '건' : 'OK 전부 통과'));
process.exit(fails ? 1 : 0);
