/*
 * order-drills.js — 어순 · 받아쓰기 · 문체 변환
 *
 * 목차 Part 9~11(어순), 13(수동), 15(접속법), 16(문체), 17-2(nicht).
 * 기존 드릴 레지스트리에 이어붙이므로 SRS·통계·오답노트가 자동으로 따라온다.
 *
 * 문제는 대부분 이미 있는 Goethe 예문 3,000개에서 만든다. 새 데이터가 거의 필요 없다.
 */
(function (global) {
  'use strict';

  var G = global.Grader;
  var C = global.Conjugation;

  function s() { return global.Store.settings(); }

  function words(sentence) {
    return String(sentence).trim().split(/\s+/);
  }

  function norm(t) {
    return String(t).replace(/\s+/g, ' ').trim();
  }

  /** 예문 중 낱말 수가 적당한 것 (너무 길면 조립이 고역이다) */
  function pickSentence(e, min, max) {
    var ok = (e.ex || []).filter(function (x) {
      var n = words(x.de).length;
      return n >= (min || 4) && n <= (max || 9);
    });
    return ok.length ? ok[Math.floor(Math.random() * ok.length)].de : null;
  }

  // ================================================================ 받아쓰기

  var dictationDrill = {
    id: 'dictation',
    label: '받아쓰기 (듣고 적기)',
    part: 'Hören 대비 · 철자와 어순을 한 번에',
    pos: '*',
    input: 'text',
    applies: function (e) {
      if (!global.speechSynthesis) return false;
      return !!pickSentence(e, 3, 10);
    },
    make: function (e) {
      var sent = pickSentence(e, 3, 10);
      if (!sent) return null;
      return {
        prompt: '🔊',
        sub: '들리는 문장을 그대로 적으세요 (버튼을 눌러 다시 듣기)',
        speak: sent,
        placeholder: '들은 대로…',
        answer: sent,
        wordCount: words(sent).length
      };
    },
    grade: function (q, input) {
      var got = norm(input), want = norm(q.answer);
      if (got === want) return { grade: 'right' };

      var soft = function (x) {
        return G.foldUmlaut(x).toLowerCase().replace(/[.,!?;:„"]/g, '').replace(/\s+/g, ' ');
      };
      if (soft(got) === soft(want)) {
        return { grade: 'partial', note: '표기 차이 → ' + want };
      }

      // 어느 낱말에서 틀렸는지 짚어 준다
      var a = got.split(/\s+/), b = want.split(/\s+/), diff = [];
      for (var i = 0; i < Math.max(a.length, b.length); i++) {
        if (soft(a[i] || '') !== soft(b[i] || '')) {
          diff.push((a[i] || '(빠짐)') + ' → ' + (b[i] || '(군더더기)'));
        }
      }
      return {
        grade: 'wrong',
        note: want + (diff.length ? '\n틀린 곳: ' + diff.slice(0, 4).join(' , ') : '')
      };
    }
  };

  // ================================================================ nicht 위치

  /*
   * 목차 17-2. nicht 는 대체로 문장 끝으로 가지만,
   * 뒤에 밀 수 없는 것들(분리 접두어, 과거분사, 부정형, 전치사구, 술어 형용사)
   * 앞에서 멈춘다. 시험에서 자주 틀린다.
   */
  var NICHT_ITEMS = [
    { base: 'Ich kenne den Mann', answer: 'Ich kenne den Mann nicht.',
      why: '4격 목적어가 정관사면 nicht 는 문장 끝으로 간다.' },
    { base: 'Er kommt heute', answer: 'Er kommt heute nicht.',
      why: '시간 부사 뒤, 문장 끝.' },
    { base: 'Ich rufe dich an', answer: 'Ich rufe dich nicht an.',
      why: '분리 접두어(an)는 맨 끝 자리를 지킨다. nicht 는 그 앞.' },
    { base: 'Ich habe ihn gesehen', answer: 'Ich habe ihn nicht gesehen.',
      why: '과거분사는 맨 끝. nicht 는 그 앞.' },
    { base: 'Ich kann heute kommen', answer: 'Ich kann heute nicht kommen.',
      why: '동사원형은 맨 끝. nicht 는 그 앞.' },
    { base: 'Das Buch ist interessant', answer: 'Das Buch ist nicht interessant.',
      why: '술어 형용사 앞에서 멈춘다.' },
    { base: 'Er fährt nach Berlin', answer: 'Er fährt nicht nach Berlin.',
      why: '방향 전치사구 앞에서 멈춘다.' },
    { base: 'Sie wohnt in Köln', answer: 'Sie wohnt nicht in Köln.',
      why: '장소 전치사구 앞에서 멈춘다.' },
    { base: 'Ich bin Lehrer', answer: 'Ich bin nicht Lehrer.',
      why: 'sein 의 보어(직업 명사) 앞.' },
    { base: 'Wir gehen ins Kino', answer: 'Wir gehen nicht ins Kino.',
      why: '방향 표현 앞에서 멈춘다.' },
    { base: 'Er hat mir geholfen', answer: 'Er hat mir nicht geholfen.',
      why: '과거분사 앞.' },
    { base: 'Ich möchte das machen', answer: 'Ich möchte das nicht machen.',
      why: '동사원형 앞.' },
    { base: 'Sie steht früh auf', answer: 'Sie steht nicht früh auf.',
      why: '분리 접두어 앞이면서 부사 앞 — 부사를 부정하는 뜻이 된다.' },
    { base: 'Das Wetter ist gut', answer: 'Das Wetter ist nicht gut.',
      why: '술어 형용사 앞.' }
  ];

  var nichtDrill = {
    id: 'nichtPos',
    label: 'nicht 위치',
    part: '17-2 nicht 와 kein',
    pos: 'nicht',
    input: 'assemble',
    applies: function (e) { return !!e.base; },
    make: function (e) {
      var toks = words(e.base).concat(['nicht']);
      var shuffled = toks.slice();
      global.SRS.shuffle(shuffled);
      return {
        prompt: e.base + ' + nicht',
        sub: 'nicht 를 알맞은 자리에 넣어 문장을 완성하세요',
        tokens: shuffled,
        answer: e.answer,
        why: e.why
      };
    },
    grade: function (q, input) {
      var strip = function (x) { return norm(x).replace(/[.,!?;:]/g, ''); };
      var ok = strip(input) === strip(q.answer);
      return {
        grade: ok ? 'right' : 'wrong',
        note: (ok ? '' : '정답: ' + q.answer + '\n') + q.why
      };
    }
  };

  /*
   * 예문에 4격 목적어가 있는가 — 타동사 판정을 위한 어림수.
   * den/einen/keinen 같은 남성 4격 관사는 확실한 표지이고,
   * 중성·여성은 1격과 형태가 같아 동사 뒤 위치까지 함께 본다.
   */
  var ACC_MARKER = /\b(den|einen|keinen|meinen|deinen|seinen|ihren|unseren|euren|ihn|mich|dich|uns|euch|etwas|alles|nichts)\b/;
  // 관사와 명사 사이에 형용사가 낄 수 있다: ein neues Auto
  var ACC_LOOSE = /\b(das|ein|eine|die|meine|seine|Ihre)(?:\s+[a-zäöüß]+){0,2}\s+[A-ZÄÖÜ]/;

  function hasAccusativeObject(e) {
    var ex = e.ex || [];
    for (var i = 0; i < ex.length; i++) {
      var t = ex[i].de;
      if (ACC_MARKER.test(t)) return true;
      // 동사가 나온 뒤쪽에 명사구가 오면 목적어로 본다
      var stem = e.de.slice(0, Math.max(3, e.de.length - 2));
      var at = t.indexOf(stem);
      if (at >= 0 && ACC_LOOSE.test(t.slice(at))) return true;
    }
    return false;
  }

  // ================================================================ 문체 변환

  /** 능동 → 수동 (목차 13-1) */
  var passiveDrill = {
    id: 'passive',
    label: '수동태로 바꾸기',
    part: '13-1 Vorgangspassiv',
    pos: 'verb',
    input: 'text',
    applies: function (e) {
      // 수동이 되려면 4격 목적어를 갖는 타동사여야 한다.
      // aux === 'haben' 만으로는 부족하다 (stammen, schlafen 도 haben 을 쓴다).
      // 예문에 4격 목적어 표지가 있는지로 걸러낸다.
      if (!e.pp || e.aux !== 'haben' || e.reflexive || e.separable) return false;
      return hasAccusativeObject(e);
    },
    make: function (e) {
      return {
        prompt: 'Man ' + C.present(e, 'er') + ' das.',
        sub: '수동태 현재로 바꾸세요 (Das …)',
        placeholder: 'Das wird …',
        answer: 'Das wird ' + e.pp + '.',
        alts: ['Das wird ' + e.pp],
        why: 'werden + 과거분사.  현재: wird ' + e.pp +
             ' / 과거: wurde ' + e.pp +
             ' / 현재완료: ist ' + e.pp + ' worden'
      };
    },
    grade: function (q, input) {
      var r = G.gradeText(input, q.answer, { alts: q.alts });
      r.note = (r.grade === 'right' ? '' : '정답: ' + q.answer + '  ') + q.why;
      return r;
    }
  };

  /** 접속법 II — 정중한 부탁·비현실 (목차 15-1) */
  var konjunktivDrill = {
    id: 'konjunktiv2',
    label: '접속법 II (würde / hätte / könnte)',
    part: '15-1 Konjunktiv II',
    pos: 'verb',
    input: 'text',
    applies: function (e) { return !!e.praet && !e.separable; },
    make: function (e) {
      var k = C.konjunktivII(e, 'ich');
      if (!k) return null;
      var weak = /te$/.test(String(e.praet).split(' ')[0]);
      return {
        prompt: 'ich ' + e.praet + '  (' + e.de + ', 과거)',
        sub: '접속법 II 로 바꾸세요 (ich …)',
        placeholder: weak ? 'ich würde …' : 'ich …',
        answer: 'ich ' + k,
        alts: [k],
        why: weak
          ? '약변화 동사는 과거형과 모양이 같아서 würde + 부정형으로 대신한다.'
          : '강변화는 과거 어간에 움라우트를 붙이고 -e 어미를 단다.'
      };
    },
    grade: function (q, input) {
      var r = G.gradeText(input, q.answer, { alts: q.alts });
      r.note = (r.grade === 'right' ? '' : '정답: ' + q.answer + '  ') + q.why;
      return r;
    }
  };

  /** 명사화 ↔ 동사화 (목차 16) */
  var NOMINAL_ITEMS = [
    { verbal: 'weil die Preise steigen', nominal: 'wegen des Preisanstiegs',
      why: 'weil-절 → wegen + 2격 명사구' },
    { verbal: 'weil es stark regnete', nominal: 'wegen des starken Regens',
      why: 'weil-절 → wegen + 2격' },
    { verbal: 'obwohl es regnete', nominal: 'trotz des Regens',
      why: 'obwohl-절 → trotz + 2격' },
    { verbal: 'während ich studierte', nominal: 'während des Studiums',
      why: 'während-절 → während + 2격' },
    { verbal: 'nachdem er angekommen war', nominal: 'nach seiner Ankunft',
      why: 'nachdem-절 → nach + 3격' },
    { verbal: 'bevor er abfuhr', nominal: 'vor seiner Abfahrt',
      why: 'bevor-절 → vor + 3격' },
    { verbal: 'wenn man das Gerät benutzt', nominal: 'bei der Benutzung des Geräts',
      why: 'wenn-절 → bei + 3격' },
    { verbal: 'damit die Kosten sinken', nominal: 'zur Senkung der Kosten',
      why: 'damit-절 → zu + 3격 (목적)' },
    { verbal: 'weil die Firma umgezogen ist', nominal: 'wegen des Umzugs der Firma',
      why: 'weil-절 → wegen + 2격' },
    { verbal: 'seitdem das Gesetz gilt', nominal: 'seit dem Inkrafttreten des Gesetzes',
      why: 'seitdem-절 → seit + 3격' }
  ];

  var nominalDrill = {
    id: 'nominalStyle',
    label: '명사화 (Nominalstil)',
    part: '16 Nominalstil ↔ Verbalstil',
    pos: 'nominal',
    input: 'text',
    applies: function (e) { return !!e.nominal; },
    make: function (e) {
      return {
        prompt: e.verbal,
        sub: '명사 표현으로 바꾸세요 — 읽기·쓰기에서 자주 나오는 문체입니다',
        placeholder: 'wegen …',
        answer: e.nominal,
        why: e.why
      };
    },
    grade: function (q, input) {
      var r = G.gradeText(input, q.answer, {});
      r.note = (r.grade === 'right' ? '' : '정답: ' + q.answer + '  ') + q.why;
      return r;
    }
  };

  // ================================================================ 등록

  // 낱말 섞기 orderDrill 은 뺐다 — 낱말이 아니라 성분 단위여야 하고,
  // 정답을 하나만 인정해 맞는 독일어를 틀렸다고 가르치고 있었다.
  // 성분 기반 어순 드릴은 js/wordorder-drills.js 로 옮겼다.
  var DRILLS = [dictationDrill, nichtDrill,
                passiveDrill, konjunktivDrill, nominalDrill];

  /** 이 파일이 쓰는 자체 항목 (단어 목록이 아닌 것들) */
  function makeItems() {
    var out = [];
    NICHT_ITEMS.forEach(function (e, i) {
      out.push({ id: 'nicht:' + i, pos: 'nicht', levels: ['B1'], de: e.base,
                 base: e.base, answer: e.answer, why: e.why, ex: [] });
    });
    NOMINAL_ITEMS.forEach(function (e, i) {
      out.push({ id: 'nominal:' + i, pos: 'nominal', levels: ['B1'], de: e.verbal,
                 verbal: e.verbal, nominal: e.nominal, why: e.why, ex: [] });
    });
    return out;
  }

  global.OrderDrills = { DRILLS: DRILLS, makeItems: makeItems };

  if (global.Drills) {
    DRILLS.forEach(function (d) {
      global.Drills.ALL.push(d);
      global.Drills.BY_ID[d.id] = d;
    });
  }
})(window);
