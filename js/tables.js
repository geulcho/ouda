/*
 * tables.js — 참고 표
 *
 * 표를 새로 적지 않는다. declension.js 엔진과 data/*.js 가 이미 갖고 있는 것을
 * 그대로 그려낸다. 그래야 엔진을 고쳤을 때 표가 같이 따라온다.
 *
 * 각 표는 { id, title, part, cols, rows:[{label, cells}], note } 형태로 통일한다.
 * 참고용 보기와 빈칸 채우기 연습이 같은 구조를 공유한다.
 */
(function (global) {
  'use strict';

  var D = global.Declension;

  var CASE_ROWS = [
    { key: 'nom', label: '주격 (Nom., -은/는)' },
    { key: 'gen', label: '소유격 (Gen., -의)' },
    { key: 'dat', label: '여격 (Dat., -에게)' },
    { key: 'akk', label: '목적격 (Akk., -을/를)' }
  ];

  var GENDER_COLS = ['남성 (m)', '여성 (f)', '중성 (n)', '복수 (pl)'];
  var GENDERS = ['m', 'f', 'n', 'pl'];

  // ---------------------------------------------------------------- 관사

  function articleTable(kind) {
    var k = D.ARTICLE_KINDS[kind];
    var notes = {
      definite: '남성 4격만 den 으로 바뀐다. 여성과 복수는 1격·4격이 같다.',
      indefinite: 'ein 은 복수형이 없다. 복수에서는 kein- 이나 소유관사를 쓴다.'
    };
    return {
      id: 'art-' + kind,
      title: k.label,
      part: '2-2 관사 체계',
      cols: GENDER_COLS,
      rows: CASE_ROWS.map(function (c) {
        return {
          label: c.label,
          cells: GENDERS.map(function (g) {
            var a = D.article(kind, g, c.key);
            return a === null ? '—' : (a || '(어미 없음)');
          })
        };
      }),
      note: notes[kind] || '어미가 부정관사 ein- 과 완전히 같다. 어간만 바꿔 끼우면 된다.'
    };
  }

  // ---------------------------------------------------------------- 형용사 어미

  var ADJ_KINDS = {
    weak: { title: '형용사 약변화', after: '정관사 der/die/das, dieser 뒤',
            note: '관사가 이미 격을 밝히므로 형용사는 -e 아니면 -en 뿐이다.' },
    mixed: { title: '형용사 혼합변화', after: '부정관사 ein/kein/mein 뒤',
             note: '관사가 격을 못 밝히는 칸(남성 1격, 중성 1·4격)에서만 형용사가 대신 밝힌다.' },
    strong: { title: '형용사 강변화', after: '관사 없음',
              note: '형용사가 관사 어미를 통째로 짊어진다. 정관사 어미와 거의 같다.' }
  };

  function adjTable(kind) {
    var spec = ADJ_KINDS[kind];
    var t = D.ADJ_TABLES[kind];
    return {
      id: 'adj-' + kind,
      title: spec.title,
      part: '8-1 형용사 어미변화  ·  ' + spec.after,
      cols: GENDER_COLS,
      rows: CASE_ROWS.map(function (c) {
        return {
          label: c.label,
          cells: GENDERS.map(function (g) { return '-' + t[g][c.key]; })
        };
      }),
      note: spec.note
    };
  }

  // ---------------------------------------------------------------- 동사 3요형

  function lastVowel(w) {
    var m = String(w || '').match(/(?:ie|ei|au|äu|eu|[aeiouäöü])/g);
    return m ? m[m.length - 1] : '?';
  }

  /** 모음변화 패턴으로 묶는다. 통째 나열보다 외우기 훨씬 쉽다. */
  function ablautKey(v) {
    var a = lastVowel(v.de.replace(/(en|ern|eln|n)$/, ''));
    var b = lastVowel(String(v.praet || '').replace(/te$/, ''));
    var c = lastVowel(String(v.pp || '').replace(/^ge/, '').replace(/(en|t)$/, ''));
    return a + '-' + b + '-' + c;
  }

  function verbRow(v) {
    return {
      label: v.de,
      cells: [v.pres3 || '—', v.praet, (v.aux === 'sein' ? 'ist ' : 'hat ') + v.pp]
    };
  }

  function byName(a, b) { return a.de.localeCompare(b.de); }

  function verbTables() {
    var V = global.VERBS || [];
    var irr = V.filter(function (v) { return v.irregular && v.praet && v.pp; });
    var reg = V.filter(function (v) { return !v.irregular && v.praet && v.pp; });

    var groups = {};
    irr.forEach(function (v) {
      var k = ablautKey(v);
      (groups[k] = groups[k] || []).push(v);
    });
    var keys = Object.keys(groups).sort(function (a, b) {
      return groups[b].length - groups[a].length;
    });

    var out = [];
    var rest = [];
    keys.forEach(function (k) {
      if (groups[k].length >= 3) {
        out.push({
          id: 'verb-' + k,
          title: '불규칙동사  ' + k,
          part: '4-1 동사의 3요형  ·  ' + groups[k].length + '개',
          cols: ['현재 (er)', '과거', '과거분사'],
          rows: groups[k].sort(byName).map(verbRow),
          collapsible: true
        });
      } else {
        rest = rest.concat(groups[k]);
      }
    });

    if (rest.length) {
      out.push({
        id: 'verb-misc',
        title: '불규칙동사  그 밖',
        part: '4-1 동사의 3요형  ·  ' + rest.length + '개',
        cols: ['현재 (er)', '과거', '과거분사'],
        rows: rest.sort(byName).map(verbRow),
        note: '패턴이 드물어 통째로 외워야 하는 것들.',
        collapsible: true
      });
    }

    out.push({
      id: 'verb-regular',
      title: '규칙동사 (약변화)',
      part: '4-1 동사의 3요형  ·  ' + reg.length + '개',
      cols: ['현재 (er)', '과거', '과거분사'],
      rows: reg.sort(byName).map(verbRow),
      note: '어간 + -te (과거), ge- + 어간 + -t (과거분사). 규칙이라 외울 게 없다.',
      collapsible: true
    });
    return out;
  }

  function seinVerbTable() {
    var V = (global.VERBS || []).filter(function (v) { return v.aux === 'sein' && v.pp; });
    return {
      id: 'verb-sein',
      title: 'sein 을 쓰는 동사',
      part: '5-2 Perfekt  ·  ' + V.length + '개',
      cols: ['과거분사', '예문'],
      rows: V.sort(byName).map(function (v) {
        return { label: v.de,
                 cells: ['ist ' + v.pp, (v.ex && v.ex[0]) ? v.ex[0].de : ''] };
      }),
      note: '이동(gehen, fahren)과 상태변화(werden, sterben) 동사가 sein 을 쓴다. ' +
            'sein · bleiben · passieren 도 여기 속한다.',
      collapsible: true
    };
  }

  // ---------------------------------------------------------------- 전치사 · 접속사

  var PREP_TITLES = {
    D: '3격 지배 전치사', A: '4격 지배 전치사',
    G: '2격 지배 전치사', W: '3·4격 전치사 (Wechselpräposition)'
  };
  var PREP_NOTES = {
    D: 'aus bei mit nach seit von zu — 이 일곱은 통째로 외운다.',
    A: 'durch für gegen ohne um — 이 다섯이 기본이다.',
    G: '문어체에서 자주 나온다. während · trotz · wegen 이 시험 단골.',
    W: 'Wohin? (어디로) 면 4격,  Wo? (어디서) 면 3격. 동사가 이동을 뜻하면 4격이다.'
  };

  function prepTables() {
    var P = global.PREP_CASES || [];
    var byCase = { D: [], A: [], G: [], W: [] };
    P.forEach(function (p) { if (byCase[p.kase]) byCase[p.kase].push(p); });

    return ['D', 'A', 'W', 'G'].filter(function (k) { return byCase[k].length; })
      .map(function (k) {
        return {
          id: 'prep-' + k,
          title: PREP_TITLES[k],
          part: '7-1 ~ 7-4 전치사  ·  ' + byCase[k].length + '개',
          cols: k === 'W' ? ['뜻', 'Wo? (3격)', 'Wohin? (4격)'] : ['뜻', '예문'],
          rows: byCase[k].map(function (p) {
            return {
              label: p.de,
              cells: k === 'W' ? [p.ko, p.wo || '', p.wohin || '']
                               : [p.ko, p.sentence || p.ex || '']
            };
          }),
          note: PREP_NOTES[k],
          collapsible: k === 'G'
        };
      });
  }

  function connectorTables() {
    var C = global.CONNECTORS || [];
    var T = global.CONNECTOR_TYPE || {};
    return ['main', 'adv', 'sub'].map(function (t) {
      var list = C.filter(function (c) { return c.type === t; });
      return {
        id: 'conn-' + t,
        title: T[t] ? T[t].label : t,
        part: '9-1 접속사 · 9-4 부사절  ·  ' + list.length + '개',
        cols: ['뜻', '예문'],
        rows: list.map(function (c) { return { label: c.de, cells: [c.ko, c.ex] }; }),
        note: T[t] ? (T[t].sub + '   예:  ' + T[t].hint) : null,
        collapsible: t === 'sub'
      };
    });
  }

  // ---------------------------------------------------------------- 성 · 복수형

  function genderRuleTable() {
    var R = D.GENDER_RULES || [];
    var name = { m: 'der (남성)', f: 'die (여성)', n: 'das (중성)' };
    return {
      id: 'gender-rules',
      title: '접미어로 성 알아내기',
      part: '2-1 명사의 성',
      cols: ['성', '설명'],
      rows: R.map(function (r) {
        return { label: '-' + r.suffix, cells: [name[r.gender], r.note] };
      }),
      note: '이 규칙이 꽤 많은 명사를 커버한다. 나머지는 통째로 외우는 수밖에 없다.'
    };
  }

  function pluralClassTable() {
    var N = global.NOUNS || [];
    var cnt = {};
    N.forEach(function (n) {
      if (n.pluralClass) cnt[n.pluralClass] = (cnt[n.pluralClass] || 0) + 1;
    });
    var known = D.PLURAL_CLASSES || {};
    var keys = Object.keys(cnt)
      .filter(function (k) { return cnt[k] >= 5 && known[k]; })
      .sort(function (a, b) { return cnt[b] - cnt[a]; });
    return {
      id: 'plural-classes',
      title: '복수형 유형',
      part: '2-1 명사의 복수형',
      cols: ['설명', '단어 수'],
      rows: keys.map(function (k) {
        return { label: k, cells: [known[k], cnt[k] + '개'] };
      }),
      note: '¨ 는 움라우트가 붙는다는 뜻이다 (Apfel → Äpfel). ' +
            '3격 복수에는 여기에 -n 이 하나 더 붙는다 (den Äpfeln).'
    };
  }

  function nDeklTable() {
    var N = (global.NOUNS || []).filter(function (n) { return n.nDekl; });
    return {
      id: 'n-dekl',
      title: 'n-변화 명사 (약변화)',
      part: '17-4 n-Deklination  ·  ' + N.length + '개',
      cols: ['1격 단수', '그 밖의 모든 격'],
      rows: N.sort(byName).map(function (n) {
        var t = D.table(n, 'definite', {});
        return { label: n.de, cells: [t.sg.nom.full, t.sg.akk.full] };
      }),
      note: '1격 단수 말고는 전부 -n / -en 이 붙는다. ' +
            '남성이면서 -e 로 끝나거나 -ent/-ant/-ist/-at 로 끝나면 대개 여기 속한다.',
      collapsible: true
    };
  }

  // ---------------------------------------------------------------- 묶음

  function sections() {
    return [
      {
        key: 'article', label: '관사 · 형용사',
        tables: [
          articleTable('definite'), articleTable('indefinite'),
          articleTable('kein'), articleTable('mein'),
          adjTable('weak'), adjTable('mixed'), adjTable('strong')
        ]
      },
      {
        key: 'pronoun', label: '대명사',
        tables: (global.PRONOUN_TABLES || []).map(function (t, i) {
          return { id: 'pron-' + i, title: t.title, part: t.part,
                   cols: t.cols, rows: t.rows, note: t.note };
        })
      },
      {
        key: 'verb', label: '동사 3요형',
        tables: verbTables().concat([seinVerbTable()])
      },
      {
        key: 'prep', label: '전치사 · 접속사',
        tables: prepTables().concat(connectorTables())
      },
      {
        key: 'noun', label: '성 · 복수형 규칙',
        tables: [genderRuleTable(), pluralClassTable(), nDeklTable()]
      }
    ];
  }

  global.Tables = { sections: sections, ablautKey: ablautKey };
})(window);
