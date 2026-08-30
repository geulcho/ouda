/*
 * drills.js — 드릴 유형 레지스트리
 *
 * 유형 하나 = 객체 하나. 새 문법 파트를 붙일 때 여기에 객체만 추가하면
 * 세션·SRS·통계·오답노트가 자동으로 따라온다.
 *
 * 각 유형이 지켜야 할 형태:
 *   id       저장 키 (바꾸면 학습 기록이 끊긴다)
 *   label    화면에 보일 이름
 *   part     목차의 어느 항목인지
 *   pos      대상 품사
 *   applies(e)  이 단어에 낼 수 있는 문제인가
 *   make(e)     문제 객체를 만든다
 *   grade(q, input)  채점
 */
(function (global) {
  'use strict';

  var D = global.Declension;
  var C = global.Conjugation;
  var G = global.Grader;

  function s() { return global.Store.settings(); }

  function caseOrder() {
    return s().germanOrder ? D.ORDER_DE : D.ORDER_KO;
  }

  function caseLabel(k) {
    var c = D.CASES[k];
    return c.ko + ' (' + c.abbr + ', ' + c.particle + ')';
  }

  var GENDER_ARTICLE = { m: 'der', f: 'die', n: 'das' };

  /** 예문에서 그 단어가 든 문장 하나 (문맥 힌트용) */
  function hintSentence(e) {
    return (e.ex && e.ex.length) ? e.ex[0].de : null;
  }

  /**
   * 답을 특정할 수 있게 첫 글자와 길이만 알려준다.
   *   Material -> "M _ _ _ _ _ _ _  (8글자)"
   * 합성어는 하이픈·띄어쓰기를 그대로 남긴다.
   */
  function maskWord(w) {
    var body = w.split('').map(function (c, i) {
      if (i === 0) return c;
      return /[\s-]/.test(c) ? c : '_';
    }).join(' ');
    return body + '   (' + w.replace(/[\s-]/g, '').length + '글자)';
  }

  // ================================================================ 명사

  var genderDrill = {
    id: 'gender',
    label: '성 (der/die/das)',
    part: '2-1 명사의 성',
    pos: 'noun',
    input: 'choice3',
    applies: function (e) { return e.gender && e.gender !== 'pl'; },
    make: function (e) {
      return {
        prompt: '___ ' + e.de,
        sub: '이 명사의 성은?',
        hint: hintSentence(e),
        choices: ['der', 'die', 'das'],
        answer: GENDER_ARTICLE[e.gender]
      };
    },
    grade: function (q, input) {
      var ok = G.normalize(input).toLowerCase() === q.answer;
      var rule = D.guessGender(q.prompt.replace('___ ', ''));
      return {
        grade: ok ? 'right' : 'wrong',
        note: ok ? (rule ? '규칙: ' + rule.note : null)
                 : '정답: ' + q.answer + (rule ? ' — ' + rule.note : '')
      };
    }
  };

  /*
   * 관사 종류. 명사 앞에 이것들이 오면 명사와 한 덩어리로 비운다.
   *   - 그냥 두면 'Der ______ ist rot.' 처럼 성을 공짜로 알려준다 (예문의 35%)
   *   - 전치사 융합형(zum/zur/im…)이 남으면 3격 자리를 보여주고 1격을 답하라는
   *     모순이 생긴다 (15%). 캡쳐로 제보받은 'Soße zum ______ → der Braten' 이 이 경우.
   */
  var ARTICLE_WORDS = (
    'der die das den dem des ' +
    'ein eine einen einem einer eines ' +
    'kein keine keinen keinem keiner keines ' +
    'mein meine meinen meinem meiner meines ' +
    'dein deine deinen deinem deiner deines ' +
    'sein seine seinen seinem seiner seines ' +
    'ihr ihre ihren ihrem ihrer ihres ' +
    'unser unsere unseren unserem unserer unseres ' +
    'euer eure euren eurem eurer eures ' +
    'Ihr Ihre Ihren Ihrem Ihrer Ihres ' +
    'dieser diese dieses diesen diesem'
  ).split(' ');

  // 전치사 + 관사 융합형. 이게 붙어 있으면 격이 이미 정해져 있다.
  var CONTRACTIONS = {
    zum: ['zu', 'D'], zur: ['zu', 'D'], im: ['in', 'D'], am: ['an', 'D'],
    beim: ['bei', 'D'], vom: ['von', 'D'], ins: ['in', 'A'], ans: ['an', 'A'],
    aufs: ['auf', 'A'], fürs: ['für', 'A'], durchs: ['durch', 'A'], ums: ['um', 'A'],
    vorm: ['vor', 'D'], hinterm: ['hinter', 'D'], überm: ['über', 'D'], unterm: ['unter', 'D']
  };

  var ARTICLE_SET = {};
  ARTICLE_WORDS.forEach(function (w) { ARTICLE_SET[w.toLowerCase()] = true; });

  function isArticle(w) {
    // 문장 첫머리라 대문자인 경우(Der, Eine, Die)가 많으므로 대소문자를 무시한다.
    var t = w.replace(/[.,!?;:„"()]/g, '').toLowerCase();
    return ARTICLE_SET[t] === true || CONTRACTIONS.hasOwnProperty(t);
  }

  /**
   * 예문에서 '관사 + 명사' 구를 찾아 통째로 비운다.
   * @returns {prompt, answer, article} 또는 null (앞에 관사가 없을 때)
   */
  function blankPhrase(sentence, word, plural) {
    // 정규식 하나로 처리하려 하면 'Soße zum Braten' 에서 Soße 를 관사 자리로
    // 잘못 잡는다. 명사를 먼저 찾고 왼쪽으로 걸어가는 편이 정확하다.
    var toks = [], re = /[^\s]+/g, m;
    while ((m = re.exec(sentence))) toks.push({ t: m[0], i: m.index });

    function strip(t) { return t.replace(/[.,!?;:„"()»«]/g, ''); }

    // 명사 위치: 표제어 -> 복수형 -> 어간(파생형 Betreuer/Betreuerin 대응)
    var forms = [word, plural].filter(Boolean), ni = -1, i;
    for (var f = 0; f < forms.length && ni < 0; f++) {
      for (i = 0; i < toks.length; i++) {
        if (strip(toks[i].t) === forms[f]) { ni = i; break; }
      }
    }
    if (ni < 0 && word.length > 5) {
      var stem = word.slice(0, word.length - 2);
      for (i = 0; i < toks.length; i++) {
        if (strip(toks[i].t).indexOf(stem) === 0) { ni = i; break; }
      }
    }
    if (ni < 0) return null;

    // 왼쪽으로 형용사를 최대 2개까지 건너뛴다.
    // 독일어는 명사를 대문자로 쓰므로, 대문자를 만나면 남의 명사구다.
    // ('Ein Pfund Äpfel' 에서 Ein 은 Pfund 의 관사이지 Äpfel 의 것이 아니다)
    var j = ni - 1, adj = 0;
    while (j >= 0 && adj < 2 && !isArticle(strip(toks[j].t))) {
      if (!/^[a-zäöüß]/.test(strip(toks[j].t))) return null;
      j--; adj++;
    }
    if (j < 0 || !isArticle(strip(toks[j].t))) return null;

    var from = toks[j].i;
    var to = toks[ni].i + toks[ni].t.length;
    var trail = toks[ni].t.match(/[.,!?;:")]+$/);      // 명사 뒤 문장부호는 남긴다
    if (trail) to -= trail[0].length;

    return {
      prompt: sentence.slice(0, from) + '______' + sentence.slice(to),
      answer: sentence.slice(from, to),
      article: strip(toks[j].t)
    };
  }

  /** 격이 왜 그렇게 됐는지 한 줄 해설 */
  function caseNote(entry, article) {
    var a = article.replace(/[.,!?;:]/g, '');
    var low = a.toLowerCase();
    var nom = GENDER_ARTICLE[entry.gender] + ' ' + entry.de;

    if (CONTRACTIONS[low]) {
      var prep = CONTRACTIONS[low][0], kase = CONTRACTIONS[low][1];
      var full = { zum: 'zu dem', zur: 'zu der', im: 'in dem', am: 'an dem',
                   beim: 'bei dem', vom: 'von dem', ins: 'in das', ans: 'an das',
                   aufs: 'auf das', fürs: 'für das', durchs: 'durch das', ums: 'um das',
                   vorm: 'vor dem', hinterm: 'hinter dem',
                   überm: 'über dem', unterm: 'unter dem' }[low];
      return nom + '  ·  ' + prep + ' + ' + (kase === 'D' ? '3격' : '4격') +
             '  ·  ' + full + ' = ' + low;
    }
    var byForm = {
      den: '4격 (또는 3격 복수)', dem: '3격', des: '2격',
      einen: '4격 남성', einem: '3격', eines: '2격', einer: '3격/2격 여성',
      keinen: '4격 남성', keinem: '3격', meinen: '4격 남성', meinem: '3격', meiner: '3격 여성'
    };
    return nom + (byForm[low] ? '  ·  ' + a + ' = ' + byForm[low] : '');
  }

  var genderSpellDrill = {
    id: 'genderSpell',
    label: '문맥 속 관사 + 명사',
    part: '2-1 명사의 성 · 2-3 격 체계',
    pos: 'noun',
    input: 'text',
    applies: function (e) {
      if (!e.gender || e.gender === 'pl') return false;
      var sent = hintSentence(e);
      if (!sent) return false;
      // make 와 같은 조건을 봐야 한다. 안 그러면 문제를 못 만드는 단어가
      // 출제 후보에 섮여 빈 화면이 뜨거나 예외가 난다.
      return !!(blankPhrase(sent, e.de, e.plural) || blankOut(sent, e.de, e.plural));
    },
    make: function (e) {
      var sent = hintSentence(e);

      // ① 앞에 관사가 있으면 관사까지 함께 비우고 '문장이 요구하는 격 그대로' 답한다
      var ph = blankPhrase(sent, e.de, e.plural);
      if (ph) {
        return {
          prompt: ph.prompt,
          sub: '빈칸을 관사와 함께 채우세요 — 문장에 맞는 격으로',
          mask: maskWord(e.de),
          placeholder: 'zum Braten',
          answer: ph.answer,
          // 문장 첫머리라 대문자인 경우 소문자도 인정
          alts: [ph.answer.charAt(0).toLowerCase() + ph.answer.slice(1)],
          why: caseNote(e, ph.article),
          word: e.de
        };
      }

      // ② 관사가 없으면 명사만 비우고 1격으로 답한다 (이 경우엔 모순이 없다)
      var blanked = blankOut(sent, e.de, e.plural);
      if (!blanked) return null;
      return {
        prompt: blanked,
        sub: '빈칸의 명사를 1격 관사와 함께',
        mask: maskWord(e.de),
        placeholder: 'der Apfel',
        answer: GENDER_ARTICLE[e.gender] + ' ' + e.de,
        gender: e.gender,
        word: e.de
      };
    },
    grade: function (q, input) {
      // ② 형태 — 성/철자를 나눠서 채점한다
      if (q.gender) {
        return G.gradeArticleNoun(input, q.gender, q.word, { strictCase: s().strictCase });
      }
      // ① 형태 — 원문 구와 대조
      var r = G.gradeText(input, q.answer, { noun: true, strictCase: s().strictCase,
                                             alts: q.alts });
      r.note = (r.note ? r.note + ' · ' : '') + q.why;
      return r;
    }
  };

  var pluralDrill = {
    id: 'plural',
    label: '복수형',
    part: '2-1 명사의 복수형',
    pos: 'noun',
    input: 'text',
    applies: function (e) {
      return e.plural && !e.noPlural && !e.pluralOnly && e.plural !== e.de + '';
    },
    make: function (e) {
      return {
        prompt: GENDER_ARTICLE[e.gender] + ' ' + e.de,
        sub: '복수형은? (die 까지 함께)',
        placeholder: 'die …',
        answer: 'die ' + e.plural,
        alts: [e.plural],
        cls: e.pluralClass
      };
    },
    grade: function (q, input) {
      var r = G.gradeText(input, q.answer, { noun: true, strictCase: s().strictCase, alts: q.alts });
      if (r.grade !== 'right' && q.cls) {
        r.note = (r.note ? r.note + ' · ' : '') +
                 '유형: ' + (D.PLURAL_CLASSES[q.cls] || q.cls);
      }
      return r;
    }
  };

  /** 관사 격변화 표 — 정관사 / 부정관사 / kein / mein */
  function tableDrill(kind, id, label) {
    return {
      id: id,
      label: label,
      part: '2-2 관사 체계 · 2-3 격 체계',
      pos: 'noun',
      input: 'table',
      applies: function (e) { return e.gender && e.gender !== 'pl' && !e.pluralOnly; },
      make: function (e) {
        var t = D.table(e, kind, { germanOrder: s().germanOrder });
        var rows = [], answer = {};
        caseOrder().forEach(function (k) {
          var cell = t.sg[k];
          if (!cell) return;
          rows.push({ key: k, label: caseLabel(k), noun: cell.noun });
          answer[k] = cell.article;
        });
        return {
          prompt: GENDER_ARTICLE[e.gender] + ' ' + e.de,
          sub: label + ' 격변화 — 빈칸에 관사를 넣으세요',
          rows: rows,
          answer: answer,
          kind: kind
        };
      },
      grade: function (q, inputs) {
        return G.gradeTable(inputs, q.answer, {});
      }
    };
  }

  /** 관사 + 명사를 통째로 — 2격 -s, 3격 복수 -n, n-변화가 여기서 걸린다 */
  var fullFormDrill = {
    id: 'fullForm',
    label: '관사 + 명사 (격에 따른 명사 변화)',
    part: '2-3 격 체계 · 17-4 n-변화',
    pos: 'noun',
    input: 'text',
    applies: function (e) {
      // 명사 자체가 변하는 것만 (안 변하면 관사 문제와 다를 게 없다)
      if (!e.gender || e.gender === 'pl') return false;
      return e.nDekl || e.adjNoun || e.gender === 'm' || e.gender === 'n';
    },
    make: function (e) {
      var pool = ['gen'];
      if (e.nDekl || e.adjNoun) pool = ['gen', 'dat', 'akk'];
      var k = pool[Math.floor(Math.random() * pool.length)];
      var t = D.table(e, 'definite', { germanOrder: s().germanOrder });
      return {
        prompt: GENDER_ARTICLE[e.gender] + ' ' + e.de,
        sub: caseLabel(k) + ' 단수 — 관사와 명사를 함께',
        placeholder: 'des …',
        answer: t.sg[k].full,
        why: e.nDekl ? 'n-변화 명사: 1격 단수 말고는 전부 -n/-en'
           : e.adjNoun ? '형용사변화 명사: 관사에 따라 어미가 바뀝니다'
           : (k === 'gen' ? '남성·중성 2격 단수는 -(e)s' : null)
      };
    },
    grade: function (q, input) {
      var r = G.gradeText(input, q.answer, { strictCase: s().strictCase });
      if (r.grade !== 'right' && q.why) r.note = (r.note ? r.note + ' · ' : '') + q.why;
      return r;
    }
  };

  var datPluralDrill = {
    id: 'datPlural',
    label: '3격 복수 (-n)',
    part: '2-3 격 체계',
    pos: 'noun',
    input: 'text',
    applies: function (e) { return e.plural && !e.noPlural && !e.adjNoun; },
    make: function (e) {
      var t = D.table(e, 'definite', { germanOrder: s().germanOrder });
      return {
        prompt: 'die ' + e.plural,
        sub: caseLabel('dat') + ' 복수 — 관사와 명사를 함께',
        placeholder: 'den …',
        answer: t.pl.dat.full,
        why: /[ns]$/.test(e.plural)
          ? '복수형이 -n / -s 로 끝나면 3격에서 아무것도 붙이지 않습니다'
          : '3격 복수에는 -n 을 붙입니다'
      };
    },
    grade: function (q, input) {
      var r = G.gradeText(input, q.answer, { strictCase: s().strictCase });
      if (r.grade !== 'right') r.note = (r.note ? r.note + ' · ' : '') + q.why;
      return r;
    }
  };

  // ================================================================ 동사

  var principalPartsDrill = {
    id: 'principalParts',
    label: '동사 3요형',
    part: '4-1 동사의 3요형',
    pos: 'verb',
    input: 'multi',
    applies: function (e) { return e.pres3 && e.praet && e.pp; },
    make: function (e) {
      return {
        prompt: e.de,
        sub: '3인칭 현재 · 과거 · 과거분사',
        fields: [
          { key: 'pres3', label: 'er ___ (현재)',  answer: e.pres3 },
          { key: 'praet', label: 'er ___ (과거)',  answer: e.praet },
          { key: 'pp',    label: 'hat/ist ___ (과거분사)', answer: e.pp }
        ],
        answer: { pres3: e.pres3, praet: e.praet, pp: e.pp },
        why: e.irregular ? '불규칙(강변화) 동사' : '규칙(약변화) 동사'
      };
    },
    grade: function (q, inputs) {
      var r = G.gradeTable(inputs, q.answer, {});
      if (r.grade !== 'right') r.note = q.why;
      return r;
    }
  };

  var auxDrill = {
    id: 'aux',
    label: '완료 조동사 (haben / sein)',
    part: '5-2 과거 표현',
    pos: 'verb',
    input: 'choice',
    applies: function (e) { return e.aux && e.pp; },
    make: function (e) {
      return {
        prompt: e.de + ' … ' + e.pp,
        sub: '현재완료에 쓰는 조동사는?',
        choices: ['haben', 'sein'],
        answer: e.aux === 'haben/sein' ? 'haben' : e.aux,
        alts: e.aux === 'haben/sein' ? ['sein'] : [],
        why: e.aux === 'sein' ? '이동·상태변화 동사는 sein 을 씁니다'
           : e.aux === 'haben/sein' ? '자동사면 sein, 타동사면 haben — 둘 다 됩니다'
           : null
      };
    },
    grade: function (q, input) {
      var got = G.normalize(input).toLowerCase();
      var ok = got === q.answer || q.alts.indexOf(got) >= 0;
      return {
        grade: ok ? 'right' : 'wrong',
        note: ok ? q.why : '정답: ' + q.answer + (q.why ? ' — ' + q.why : '')
      };
    }
  };

  var personDrill = {
    id: 'person',
    label: '동사 인칭변화',
    part: '4-1 현재시제 인칭변화',
    pos: 'verb',
    input: 'text',
    applies: function (e) { return !!e.pres3; },
    make: function (e) {
      var persons = ['ich', 'du', 'er', 'wir', 'ihr'];
      var p = persons[Math.floor(Math.random() * persons.length)];
      return {
        prompt: p + ' ___  (' + e.de + ')',
        sub: '현재형으로',
        answer: C.present(e, p),
        why: e.irregular ? 'du / er 에서만 모음이 바뀝니다' : null
      };
    },
    grade: function (q, input) {
      var r = G.gradeText(input, q.answer, {});
      if (r.grade !== 'right' && q.why) r.note = (r.note ? r.note + ' · ' : '') + q.why;
      return r;
    }
  };

  var perfectDrill = {
    id: 'perfect',
    label: '현재완료 만들기',
    part: '5-2 Perfekt',
    pos: 'verb',
    input: 'text',
    applies: function (e) { return e.pp && e.aux; },
    make: function (e) {
      return {
        prompt: 'ich ' + C.present(e, 'ich') + (e.separable && e.prefix ? ' … ' + e.prefix : ''),
        sub: '현재완료로 바꾸세요 (ich …)',
        placeholder: 'ich habe … / ich bin …',
        answer: 'ich ' + C.perfect(e, 'ich'),
        alts: [C.perfect(e, 'ich')]
      };
    },
    grade: function (q, input) {
      return G.gradeText(input, q.answer, { alts: q.alts });
    }
  };

  var separableDrill = {
    id: 'separable',
    label: '분리동사 어순',
    part: '4-2 분리동사',
    pos: 'verb',
    input: 'text',
    applies: function (e) { return e.separable && e.prefix && e.pres3; },
    make: function (e) {
      return {
        prompt: e.de,
        sub: '주문장으로 — "ich" 를 주어로',
        placeholder: 'ich …',
        answer: C.mainClause(e, 'ich'),
        why: '주문장에서 분리 접두어 "' + e.prefix + '" 는 문장 끝으로 갑니다'
      };
    },
    grade: function (q, input) {
      var r = G.gradeText(input, q.answer, {});
      if (r.grade !== 'right') r.note = (r.note ? r.note + ' · ' : '') + q.why;
      return r;
    }
  };

  var zuInfDrill = {
    id: 'zuInf',
    label: 'zu 부정사',
    part: '12-1 zu-Infinitiv',
    pos: 'verb',
    input: 'text',
    applies: function (e) { return e.separable && e.prefix; },
    make: function (e) {
      return {
        prompt: e.de,
        sub: 'zu 부정사 형태는?',
        placeholder: '…zu…',
        answer: C.zuInfinitive(e),
        why: '분리동사는 접두어와 어간 사이에 zu 가 들어갑니다'
      };
    },
    grade: function (q, input) {
      var r = G.gradeText(input, q.answer, {});
      if (r.grade !== 'right') r.note = (r.note ? r.note + ' · ' : '') + q.why;
      return r;
    }
  };

  // ================================================================ 전 품사 — 예문 Cloze

  /** 문장에서 표제어(또는 그 활용형)를 빈칸으로 */
  function blankOut(sentence, word, alt) {
    if (!sentence) return null;
    var forms = [word, alt].filter(Boolean);
    // 어간으로 시작하는 낱말을 찾는다 (활용형·복수형까지 잡기 위해)
    // JS 의 \b 는 ASCII 기준이라 'Ärztin' · 'über' 처럼 움라우트로 시작하는 낱말을
    // 놓친다. 앞뒤 경계를 공백·문장부호로 직접 잡는다.
    var BEFORE = '(^|[\\s(„"’\'\\-])';
    var AFTER = '(?=$|[\\s.,!?;:)"“„\'\\-])';
    var stem = word.length > 4 ? word.slice(0, Math.max(4, word.length - 2)) : word;
    var re = new RegExp(BEFORE + escapeRe(stem) + '[\\wäöüßÄÖÜ]*' + AFTER, 'i');
    for (var i = 0; i < forms.length; i++) {
      var exact = new RegExp(BEFORE + escapeRe(forms[i]) + AFTER, 'i');
      if (exact.test(sentence)) return sentence.replace(exact, '$1______');
    }
    if (re.test(sentence)) return sentence.replace(re, '$1______');
    return null;
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  var clozeDrill = {
    id: 'cloze',
    label: '예문 빈칸 채우기',
    part: '전 품사 — 문맥 속 어형',
    pos: '*',
    input: 'text',
    applies: function (e) {
      if (!e.ex || !e.ex.length) return false;
      for (var i = 0; i < e.ex.length; i++) {
        if (blankOut(e.ex[i].de, e.de, e.plural)) return true;
      }
      return false;
    },
    make: function (e) {
      // 빈칸을 만들 수 있는 예문 중 하나를 고른다 (다의어면 어의별로 다른 문제가 된다)
      var usable = [];
      e.ex.forEach(function (x) {
        var b = blankOut(x.de, e.de, e.plural);
        if (b) usable.push({ blanked: b, orig: x.de });
      });
      var pick = usable[Math.floor(Math.random() * usable.length)];
      var answer = findForm(pick.orig, pick.blanked);
      return {
        prompt: pick.blanked,
        // 표제어를 그대로 적어 주면 답을 그냥 알려주는 꼴이 된다.
        // 첫 글자와 길이만 줘서 '떠올리는' 일이 남게 한다.
        sub: '빈칸에 알맞은 형태를 쓰세요',
        mask: maskWord(answer),
        placeholder: '',
        answer: answer,
        original: pick.orig
      };
    },
    grade: function (q, input) {
      var r = G.gradeText(input, q.answer, { noun: true, strictCase: s().strictCase });
      if (r.grade !== 'right') {
        r.note = (r.note ? r.note + ' · ' : '') + q.original;
      }
      return r;
    }
  };

  /** 원문과 빈칸 문장을 비교해 빠진 낱말을 되찾는다 */
  function findForm(orig, blanked) {
    var i = blanked.indexOf('______');
    if (i < 0) return '';
    var before = blanked.slice(0, i);
    var after = blanked.slice(i + 6);
    return orig.slice(before.length, orig.length - after.length).trim();
  }

  // ================================================================ 등록

  var ALL = [
    genderDrill,
    genderSpellDrill,
    pluralDrill,
    tableDrill('definite',   'artDef',  '정관사'),
    tableDrill('indefinite', 'artIndef','부정관사'),
    tableDrill('kein',       'artKein', 'kein-'),
    tableDrill('mein',       'artMein', '소유관사 mein-'),
    fullFormDrill,
    datPluralDrill,
    principalPartsDrill,
    auxDrill,
    personDrill,
    perfectDrill,
    separableDrill,
    zuInfDrill,
    clozeDrill
    // 비교급은 data/grammar.js 의 COMPARATIVES 로 다룬다 (grammar-drills.js).
    // Goethe 목록이 통째로 주는 건 gut / gern 둘뿐이라 여기서 낼 게 없다.
  ];

  var BY_ID = {};
  ALL.forEach(function (d) { BY_ID[d.id] = d; });

  global.Drills = {
    ALL: ALL,
    BY_ID: BY_ID,
    caseLabel: caseLabel,
    caseOrder: caseOrder,
    blankOut: blankOut,
    GENDER_ARTICLE: GENDER_ARTICLE
  };
})(window);
