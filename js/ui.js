/*
 * ui.js — 화면 렌더링 + 라우팅
 *
 * 키보드만으로 완주할 수 있어야 한다:
 *   Enter 제출 -> Enter 다음 문제, 표/여러칸 문제는 Tab 이동.
 */
(function (global) {
  'use strict';

  var D = global.Declension;
  var C = global.Conjugation;
  var S = global.Store;
  var Drills = global.Drills;

  var app = document.getElementById('app');
  var WORDS = [];          // 전체 표제어
  var POOL = [];           // 현재 필터에 걸린 (표제어 × 드릴) 후보
  var session = null;

  // ---------------------------------------------------------------- 유틸

  // checked·disabled 같은 것들은 '값'이 아니라 '있느냐'로 판단된다.
  // setAttribute('checked', null) 을 하면 문자열 "null" 이 들어가고,
  // 그래도 속성은 존재하므로 체크된 상태가 되어 버린다.
  var BOOL_ATTRS = { checked: 1, disabled: 1, selected: 1, readonly: 1, multiple: 1 };

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else if (BOOL_ATTRS[k]) n[k === 'readonly' ? 'readOnly' : k] = !!v;
      else if (v === null || v === undefined || v === false) return;   // 속성을 아예 안 넣는다
      else n.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function genderClass(g) { return g ? 'g-' + g : ''; }

  function levelTags(levels) {
    return (levels || []).map(function (l) {
      return '<span class="lvl">' + l + '</span>';
    }).join('');
  }

  // ---------------------------------------------------------------- 데이터

  function loadWords() {
    var all = []
      .concat(global.NOUNS || [])
      .concat(global.VERBS || [])
      .concat(global.ADJECTIVES || [])
      .concat(global.FUNCTIONWORDS || []);
    // 문법 항목(전치사 격지배·접속사 어순·비교급 등)도 같은 방식으로 학습한다
    if (global.GrammarDrills) all = all.concat(global.GrammarDrills.makeItems());
    if (global.OrderDrills) all = all.concat(global.OrderDrills.makeItems());
    if (global.WordOrderDrills) all = all.concat(global.WordOrderDrills.makeItems());
    all = all.concat(S.load().added || []);

    // 전치사구 드릴이 쓸 명사 표본 — 성이 고르게 섞이도록 골라 둔다
    global.__PREP_NOUNS = (global.NOUNS || []).filter(function (n) {
      return n.gender && n.gender !== 'pl' && !n.nDekl && !n.adjNoun &&
             !n.pluralOnly && (n.levels || []).indexOf('A1') >= 0;
    }).slice(0, 300);

    var out = S.dropDeleted(S.applyEdits(all));
    // 접두사 분해가 쓸 색인을 다시 태운다 — 사용자가 채운 뜻이 직역에 반영된다
    if (global.Prefix) global.Prefix.prime(out);
    if (global.Meanings) global.Meanings.reset();
    return out;
  }

  /** 현재 설정에 맞는 (표제어 × 드릴) 후보를 만든다 */
  function buildPool() {
    var st = S.settings();
    var lv = st.levels, pos = st.pos, only = st.drills;
    var out = [];
    WORDS.forEach(function (e) {
      if (pos.indexOf(e.pos) < 0) return;
      if (!(e.levels || []).some(function (l) { return lv.indexOf(l) >= 0; })) return;
      Drills.ALL.forEach(function (d) {
        if (only && only.indexOf(d.id) < 0) return;
        if (d.pos !== '*' && d.pos !== e.pos) return;
        if (!d.applies(e)) return;
        out.push({ id: e.id, drill: d.id, entry: e });
      });
    });
    return out;
  }

  // ---------------------------------------------------------------- 홈

  function viewHome() {
    var c = global.SRS.counts(POOL);
    var st = S.load();

    var tiles = el('div', { class: 'tiles' }, [
      tile(c.due, '복습 예정'),
      tile(Math.min(c.fresh, Math.max(0, S.settings().newPerDay - S.newTodayCount())), '오늘 신규'),
      tile(st.streak || 0, '연속 학습일'),
      tile(S.todayCount(), '오늘 푼 문제'),
      tile(c.done, '암기 완료')
    ]);

    var start = el('div', { class: 'actions' }, [
      el('button', {
        class: 'btn', text: (c.due || c.fresh) ? '학습 시작' : '자유 연습',
        onclick: function () { go('study'); }
      }),
      el('button', { class: 'btn ghost', text: '오답만 연습', onclick: function () { go('wrong'); } })
    ]);

    var byPart = partProgress();
    var shown = 6;

    render([
      el('h2', { text: '오늘의 학습' }),
      el('p', { class: 'muted small', text: '단어 ' + WORDS.length.toLocaleString() +
        '개 · 문제 후보 ' + POOL.length.toLocaleString() + '개' }),
      tiles,
      start,
      el('h3', { text: '드릴별 진도' }),
      el('div', { class: 'card' }, [
        stageLegend(),
        el('div', {}, progressRows(byPart, shown)),
        byPart.length > shown ? el('div', { class: 'actions' }, [
          el('button', { class: 'btn ghost', text: '전체 보기 (통계)',
            onclick: function () { go('stats'); } })
        ]) : null
      ])
    ]);
  }

  function tile(n, k) {
    return el('div', { class: 'tile' }, [
      el('div', { class: 'n', text: String(n) }),
      el('div', { class: 'k', text: k })
    ]);
  }

  /**
   * 드릴별 진도.
   *
   * 예전에는 '상자 4 이상'만 완료로 셌다. 상자 4는 7일 간격이라
   * 10분 → 1일 → 3일 → 7일, 즉 나흘에 걸쳐 연속 정답이어야 도달한다.
   * 첫날에는 아무리 풀어도 전부 0 이라 막대가 고장 난 것처럼 보였다.
   * 그래서 상자를 네 구간으로 나눠 누적해서 보여준다.
   */
  var STAGES = [
    { key: 'learning', label: '학습중', min: 1, max: 3, color: 'var(--partial)' },
    { key: 'familiar', label: '익숙',   min: 4, max: 5, color: 'var(--accent)' },
    { key: 'done',     label: '암기완료', min: 6, max: 99, color: 'var(--right)' }
  ];

  function stageOf(card) {
    if (!card || !card.box) return null;
    for (var i = 0; i < STAGES.length; i++) {
      if (card.box >= STAGES[i].min && card.box <= STAGES[i].max) return STAGES[i].key;
    }
    return null;
  }

  function partProgress() {
    var m = {};
    POOL.forEach(function (item) {
      var d = Drills.BY_ID[item.drill];
      if (!m[d.id]) {
        m[d.id] = { label: d.label, total: 0, learning: 0, familiar: 0, done: 0, touched: 0 };
      }
      var x = m[d.id];
      x.total++;
      var st = stageOf(S.getCard(item.id, item.drill));
      if (st) { x[st]++; x.touched++; }
    });
    return Object.keys(m).map(function (k) { return m[k]; })
      .sort(function (a, b) {
        // 손댄 것부터 위로, 그 다음 분량 순
        if (b.touched !== a.touched) return b.touched - a.touched;
        return b.total - a.total;
      });
  }

  /** 구간이 쌓인 막대 하나 */
  function stageBar(p) {
    var segs = STAGES.map(function (s) {
      var pct = p.total ? (p[s.key] / p.total) * 100 : 0;
      // 1개라도 있으면 눈에 보이게 최소 폭을 준다 (분모가 2,700이라 안 그러면 안 보인다)
      if (p[s.key] > 0 && pct < 1.2) pct = 1.2;
      return '<i style="width:' + pct + '%;background:' + s.color + '"></i>';
    }).join('');
    return el('span', { class: 'bar stacked', html: segs });
  }

  function progressRows(list, limit) {
    return (limit ? list.slice(0, limit) : list).map(function (p) {
      return el('div', { class: 'barrow prog' }, [
        el('span', { class: 'plabel', text: p.label }),
        stageBar(p),
        el('span', { class: 'rt', html: p.touched
          ? '<b>' + p.touched + '</b><span class="muted"> / ' + p.total + '</span>'
          : '<span class="muted">' + p.total + '</span>' })
      ]);
    });
  }

  function stageLegend() {
    return el('div', { class: 'legend' }, STAGES.map(function (s) {
      return el('span', {}, [
        el('i', { style: 'background:' + s.color }),
        document.createTextNode(s.label)
      ]);
    }).concat([el('span', { class: 'muted small', text: '· 숫자는 학습한 개수 / 전체' })]));
  }

  // ---------------------------------------------------------------- 학습

  function startSession(queue, title) {
    if (!queue.length) {
      render([
        el('h2', { text: title || '학습' }),
        el('div', { class: 'empty' }, [
          el('p', { text: '지금 풀 문제가 없습니다.' }),
          el('p', { class: 'small', text: '복습 예정이 아직 없거나, 오늘 신규 상한에 도달했습니다. 설정에서 하루 신규 개수를 늘릴 수 있습니다.' })
        ])
      ]);
      return;
    }
    session = { queue: queue, i: 0, right: 0, wrong: 0, partial: 0, title: title || '학습' };
    renderQuestion();
  }

  function renderQuestion() {
    if (session.i >= session.queue.length) return renderDone();

    var item = session.queue[session.i];
    var drill = Drills.BY_ID[item.drill];
    var q = drill.make(item.entry);
    session.current = { item: item, drill: drill, q: q };

    var pct = session.i / session.queue.length;
    var head = el('div', { class: 'progress' }, [
      el('span', { class: 'muted', text: (session.i + 1) + ' / ' + session.queue.length }),
      el('span', { class: 'bar', html: '<i style="width:' + Math.round(pct * 100) + '%"></i>' }),
      el('span', { class: 'muted', text: '정답 ' + session.right })
    ]);

    var meta = el('div', { class: 'q meta', html:
      '<span class="tag">' + esc(drill.label) + '</span>' +
      '<span class="tag">' + esc(drill.part) + '</span>' +
      levelTags(item.entry.levels) });

    var qbox = el('div', { class: 'q' }, [
      el('div', { class: 'prompt ' + genderClass(item.entry.gender), text: q.prompt }),
      q.sub ? el('div', { class: 'sub', text: q.sub }) : null,
      q.mask ? el('div', { class: 'mask', text: q.mask }) : null,
      q.hint ? el('div', { class: 'hint', text: '„' + q.hint + '"' }) : null,
      q.speak ? el('div', { class: 'actions' }, [
        el('button', { class: 'btn ghost', type: 'button', text: '🔊 다시 듣기',
          onclick: function () { speak(q.speak); } })
      ]) : null,
      hintBox(item.entry, q)
    ]);
    // 받아쓰기는 문제가 뜨자마자 한 번 읽어 준다
    if (q.speak && S.settings().tts) global.setTimeout(function () { speak(q.speak); }, 250);

    var body = el('div', { class: 'card' }, [meta, qbox, buildInput(drill, q)]);
    render([el('h2', { text: session.title }), head, body]);
    focusFirst();
  }

  /**
   * 힌트 — 눌렀을 때만 나온다.
   *
   * 뜻을 항상 띄우면 문제를 안 풀고 뜻만 보게 된다.
   * 막혔을 때 스스로 요청하도록 버튼 뒤에 둔다. 누른 사실은 기록해서
   * 채점 결과에 표시한다 (힌트 보고 맞춘 건 스스로 맞춘 것과 다르다).
   */
  function hintBox(e, q) {
    var steps = [];
    var meaning = [e.ko, e.en].filter(Boolean).join('  ·  ');
    if (meaning) steps.push({ label: '뜻 보기', text: meaning });

    // 문제로 쓰지 않은 다른 예문이 있으면 그것도 힌트가 된다
    (e.ex || []).forEach(function (x) {
      if (q.prompt && q.prompt.indexOf(x.de.slice(0, 12)) >= 0) return;
      if (x.de === q.original) return;
      if (steps.length < 3) steps.push({ label: '예문 힌트', text: '„' + x.de + '"' });
    });

    if (!steps.length) return null;

    var box = el('div', { class: 'hintbox' });
    var i = 0;
    var btn = el('button', {
      class: 'btn ghost hintbtn', type: 'button', text: '힌트 (' + steps[0].label + ')',
      onclick: function () {
        var s = steps[i++];
        box.insertBefore(el('div', { class: 'hintline', text: s.text }), btn);
        if (session && session.current) session.current.usedHint = true;
        if (i >= steps.length) btn.remove();
        else btn.textContent = '힌트 (' + steps[i].label + ')';
      }
    });
    box.appendChild(btn);
    return box;
  }

  /** 성분 역할의 한국어 이름 — 카드에 작게 붙인다 */
  function roleLabel(role) {
    var R = global.WordOrder && global.WordOrder.ROLE[role];
    return R ? R.ko : role;
  }

  function buildInput(drill, q) {
    var wrap = el('div', { class: 'answer' });

    if (drill.input === 'choice3' || drill.input === 'choice') {
      var box = el('div', { class: 'choices' });
      var longest = q.choices.reduce(function (a, c) {
        return Math.max(a, String(c).length);
      }, 0);
      if (longest > 14) box.className = 'choices stack';
      q.choices.forEach(function (ch) {
        box.appendChild(el('button', {
          // 색을 입히는 건 der/die/das 뿐이다. 긴 한국어를 클래스로 넣으면
          // 엉뚱한 CSS 규칙에 걸릴 수 있어 choice3 에만 준다.
          class: drill.input === 'choice3' ? ch : null,
          text: ch,
          onclick: function () { submit(ch); }
        }));
      });
      wrap.appendChild(box);
      return wrap;
    }

    if (drill.input === 'slot') {
      /*
       * 정동사 자리 고르기.
       * 낱말 사이마다 빈 자리를 놓고 그중 하나를 고른다.
       * "두 번째 낱말"이 아니라 "두 번째 성분"이라는 걸 눈으로 보게 하는 게 목적이다.
       */
      var line = el('div', { class: 'slotline' });

      q.slotWords.forEach(function (w, i) {
        line.appendChild(el('button', {
          class: 'slot', type: 'button', 'data-i': String(i),
          title: (i + 1) + '번째 자리',
          onclick: function () { submit(String(i)); }
        }, [el('span', { class: 'chip', text: q.verb })]));
        line.appendChild(el('span', { class: 'sw', text: w }));
      });
      line.appendChild(el('button', {
        class: 'slot', type: 'button', 'data-i': String(q.slotWords.length),
        onclick: function () { submit(String(q.slotWords.length)); }
      }, [el('span', { class: 'chip', text: q.verb })]));

      wrap.appendChild(line);
      wrap.appendChild(el('div', { class: 'muted small slothint',
        text: '낱말 사이의 빈칸을 누르세요' }));
      return wrap;
    }

    if (drill.input === 'assemble' && q.chunkMode) {
      /*
       * 성분 카드를 눌러 문장을 만든다.
       * 낱말이 아니라 성분이라 여러 배열이 정답이 될 수 있고, 채점은 규칙이 한다.
       */
      var picked = [];
      var tokenState = q.tokens.map(function (c) {
        return { c: c, used: false };
      });
      var lineC = el('div', { class: 'asmline chunks' });
      var poolC = el('div', { class: 'asmpool chunks' });

      function roleClass(role) {
        return 'r-' + String(role).replace(/[^A-Za-z]/g, '');
      }

      function paintC() {
        clear(lineC); clear(poolC);
        if (!picked.length) {
          lineC.appendChild(el('span', { class: 'asmempty', text: '아래 성분을 눌러 만드세요' }));
        }
        picked.forEach(function (item, i) {
          lineC.appendChild(el('button', {
            class: 'tok chunk picked ' + roleClass(item.c.role), type: 'button',
            onclick: function () { picked.splice(i, 1); item.used = false; paintC(); }
          }, [
            el('span', { class: 'ctext', text: item.c.t }),
            el('span', { class: 'crole', text: roleLabel(item.c.role) })
          ]));
        });
        tokenState.forEach(function (item) {
          if (item.used) return;
          poolC.appendChild(el('button', {
            class: 'tok chunk ' + roleClass(item.c.role), type: 'button',
            onclick: function () { item.used = true; picked.push(item); paintC(); }
          }, [
            el('span', { class: 'ctext', text: item.c.t }),
            el('span', { class: 'crole', text: roleLabel(item.c.role) })
          ]));
        });
      }

      wrap.appendChild(lineC);
      wrap.appendChild(poolC);
      wrap.appendChild(el('div', { class: 'actions' }, [
        el('button', { class: 'btn', text: '제출 (Enter)', onclick: function () {
          submit(picked.map(function (x) { return x.c; }));
        } }),
        el('button', { class: 'btn ghost', text: '처음부터', onclick: function () {
          picked = [];
          tokenState.forEach(function (x) { x.used = false; });
          paintC();
        } }),
        el('button', { class: 'btn ghost', text: '모르겠음', onclick: function () { submit([]); } })
      ]));
      paintC();
      session.current.readAssemble = function () {
        return picked.map(function (x) { return x.c; });
      };
      return wrap;
    }

    if (drill.input === 'assemble') {
      /*
       * 낱말 카드를 눌러 문장을 만든다.
       * 만든 줄을 위에, 남은 카드를 아래에 둔다. 위의 낱말을 누르면 되돌아간다.
       * 동사 위치를 눈으로 익히는 게 목적이라 순서만 본다.
       */
      var picked = [];
      var line = el('div', { class: 'asmline' });
      var pool = el('div', { class: 'asmpool' });

      function paint() {
        clear(line);
        clear(pool);

        if (!picked.length) {
          line.appendChild(el('span', { class: 'asmempty', text: '아래 낱말을 눌러 만드세요' }));
        }
        picked.forEach(function (p, i) {
          line.appendChild(el('button', {
            class: 'tok picked', type: 'button', text: p.t,
            onclick: function () {
              picked.splice(i, 1);
              p.used = false;
              paint();
            }
          }));
        });

        q.tokens.forEach(function (t, i) {
          var item = tokenState[i];
          if (item.used) return;
          pool.appendChild(el('button', {
            class: 'tok', type: 'button', text: t,
            onclick: function () {
              item.used = true;
              picked.push(item);
              paint();
            }
          }));
        });
      }

      var tokenState = q.tokens.map(function (t) { return { t: t, used: false }; });
      wrap.appendChild(line);
      wrap.appendChild(pool);
      wrap.appendChild(el('div', { class: 'actions' }, [
        el('button', { class: 'btn', text: '제출 (Enter)', onclick: function () {
          submit(picked.map(function (p) { return p.t; }).join(' '));
        } }),
        el('button', { class: 'btn ghost', text: '처음부터', onclick: function () {
          picked = [];
          tokenState.forEach(function (x) { x.used = false; });
          paint();
        } }),
        el('button', { class: 'btn ghost', text: '모르겠음', onclick: function () { submit(''); } })
      ]));
      paint();
      // 제출 때 현재 줄을 읽어가도록 세션에 매달아 둔다
      session.current.readAssemble = function () {
        return picked.map(function (p) { return p.t; }).join(' ');
      };
      return wrap;
    }

    if (drill.input === 'table') {
      var tbl = el('table', { class: 'decl' });
      q.rows.forEach(function (r) {
        tbl.appendChild(el('tr', {}, [
          el('th', { text: r.label }),
          el('td', { class: 'inp' }, [
            el('input', { type: 'text', 'data-key': r.key, autocomplete: 'off', spellcheck: 'false' })
          ]),
          el('td', { class: 'noun', text: r.noun || '' })
        ]));
      });
      wrap.appendChild(tbl);
      wrap.appendChild(umlautBar());
      wrap.appendChild(el('div', { class: 'actions' }, [
        el('button', { class: 'btn', text: '제출 (Enter)', onclick: function () { submit(collectKeys(wrap)); } })
      ]));
      return wrap;
    }

    if (drill.input === 'multi') {
      var fs = el('div', { class: 'fields' });
      q.fields.forEach(function (f) {
        fs.appendChild(el('div', { class: 'field' }, [
          el('label', { text: f.label }),
          el('input', { type: 'text', 'data-key': f.key, autocomplete: 'off', spellcheck: 'false' })
        ]));
      });
      wrap.appendChild(fs);
      wrap.appendChild(umlautBar());
      wrap.appendChild(el('div', { class: 'actions' }, [
        el('button', { class: 'btn', text: '제출 (Enter)', onclick: function () { submit(collectKeys(wrap)); } })
      ]));
      return wrap;
    }

    // 기본: 한 줄 타이핑
    var inp = el('input', {
      type: 'text', autocomplete: 'off', spellcheck: 'false',
      placeholder: q.placeholder || ''
    });
    wrap.appendChild(inp);
    wrap.appendChild(umlautBar());
    wrap.appendChild(el('div', { class: 'actions' }, [
      el('button', { class: 'btn', text: '제출 (Enter)', onclick: function () { submit(inp.value); } }),
      el('button', { class: 'btn ghost', text: '모르겠음', onclick: function () { submit(''); } })
    ]));
    return wrap;
  }

  /** ä ö ü ß 버튼 — 마지막으로 만진 입력칸에 넣는다 */
  function umlautBar() {
    var bar = el('div', { class: 'umlauts' });
    ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'].forEach(function (ch) {
      bar.appendChild(el('button', {
        type: 'button', text: ch,
        onmousedown: function (ev) { ev.preventDefault(); insertChar(ch); }
      }));
    });
    return bar;
  }

  var lastInput = null;
  function insertChar(ch) {
    var t = lastInput || app.querySelector('input[type=text]');
    if (!t) return;
    var s = t.selectionStart, e = t.selectionEnd;
    t.value = t.value.slice(0, s) + ch + t.value.slice(e);
    t.selectionStart = t.selectionEnd = s + ch.length;
    t.focus();
  }

  function collectKeys(wrap) {
    var out = {};
    wrap.querySelectorAll('input[data-key]').forEach(function (i) {
      out[i.getAttribute('data-key')] = i.value;
    });
    return out;
  }

  function focusFirst() {
    var i = app.querySelector('.answer input[type=text]');
    if (i) i.focus();
  }

  function submit(input) {
    var cur = session.current;
    if (!cur || cur.answered) return;
    cur.answered = true;

    var res = cur.drill.grade(cur.q, input);
    // 채점 전 카드를 떠 둔다. '이것도 정답' 을 누르면 여기서 다시 매긴다.
    cur.cardBefore = JSON.parse(JSON.stringify(S.getCard(cur.item.id, cur.item.drill)));
    var card = global.SRS.review(S.getCard(cur.item.id, cur.item.drill), res.grade);
    S.putCard(cur.item.id, cur.item.drill, card);
    S.recordAnswer(res.grade !== 'wrong');

    if (res.grade === 'right') session.right++;
    else if (res.grade === 'partial') session.partial++;
    else session.wrong++;

    showFeedback(res, cur);
  }

  /**
   * '이것도 정답' — 뜻 테스트에서 답지에 없던 표현을 사용자가 직접 인정한다.
   *
   * 누르면 세 가지가 한꺼번에 일어난다.
   *   1. 그 답을 이 단어의 답지에 넣는다 → 다음부터 자동으로 정답
   *   2. 채점 전 카드로 되돌린 뒤 정답으로 다시 매긴다
   *   3. 오늘 기록과 이번 세션 집계를 바로잡는다
   */
  function aliasBox(res, cur) {
    var box = el('div', { class: 'aliasbox' });

    box.appendChild(el('button', {
      class: 'btn ghost alias', type: 'button',
      text: '‘' + res.aliasText + '’ 도 정답으로 인정',
      onclick: function () {
        S.addAlias(res.aliasWord, res.aliasText);

        // 오답으로 한 번 깎였으니 채점 전 상태에서 정답으로 다시 매긴다.
        // 직접 상자를 만지는 것보다 이쪽이 SRS 규칙과 어긋날 일이 없다.
        var card = global.SRS.review(cur.cardBefore, 'right');
        S.putCard(cur.item.id, cur.item.drill, card);
        S.recordAnswer(true);      // 오답 1건은 남지만 정답 1건이 더해진다
        S.saveNow();

        session.wrong = Math.max(0, session.wrong - 1);
        session.right++;

        clear(box);
        box.appendChild(el('div', { class: 'note',
          text: '답지에 넣었습니다 — 다음부터 이 답도 정답입니다.' }));

        var head = app.querySelector('.fb .head');
        if (head) head.textContent = '정답 (직접 인정)';
        var fbEl = app.querySelector('.fb');
        if (fbEl) fbEl.className = 'fb right';
      }
    }));
    box.appendChild(el('div', { class: 'muted small',
      text: '띄어쓰기나 표현 차이라 사실 맞는 답이면 눌러 두세요.' }));
    return box;
  }

  function showFeedback(res, cur) {
    var titles = { right: '정답', partial: '거의 정답', wrong: '오답' };
    var fb = el('div', { class: 'fb ' + res.grade }, [
      el('div', { class: 'head',
        text: titles[res.grade] + (cur.usedHint ? '  (힌트 사용)' : '') })
    ]);

    // 표/여러칸 문제는 칸별로 무엇이 틀렸는지 보여준다
    if (res.cells) {
      markCells(res.cells);
      var bad = res.cells.filter(function (c) { return c.grade !== 'right'; });
      if (bad.length) {
        fb.appendChild(el('div', { class: 'cells', text:
          bad.map(function (c) {
            return (c.got ? c.got : '(빈칸)') + ' → ' + c.want;
          }).join('   ·   ') }));
      }
      fb.appendChild(el('div', { class: 'note', text:
        res.right + ' / ' + res.total + ' 정답' + (res.note ? ' · ' + res.note : '') }));
    } else {
      if (res.grade !== 'right') {
        fb.appendChild(el('div', { class: 'note', text: '정답: ' + (cur.q.answer || '') }));
      }
      if (res.note) fb.appendChild(el('div', { class: 'note muted small', text: res.note }));
    }

    // 뜻 테스트에서 답지에 없는 답을 썼으면 직접 인정할 길을 준다
    if (res.canAlias && res.aliasWord && res.aliasText) fb.appendChild(aliasBox(res, cur));

    // 어순 문제면 문장 구조를 그림으로 보여준다
    if (res.fields) fb.appendChild(satzklammer(res.fields));

    // 뜻·예문은 맞았을 때도 보여준다 — 여기가 그 단어를 다시 만나는 자리다
    fb.appendChild(wordInfo(cur.item.entry, cur.usedHint));

    // 틀렸으면 표까지 펼쳐서 그 자리에서 복습하게 한다
    if (cur.item.entry.pos === 'noun' && res.grade !== 'right') {
      fb.appendChild(declPreview(cur.item.entry));
    }
    if (cur.item.entry.pos === 'verb' && res.grade !== 'right') {
      fb.appendChild(verbPreview(cur.item.entry));
    }

    var next = el('div', { class: 'actions' }, [
      el('button', { class: 'btn', text: '다음 (Enter)', onclick: advance })
    ]);
    // 채점 뒤에 정답을 소리로 한 번 — 성을 소리로 기억하는 데 도움이 된다
    var sayable = cur.item.entry.pos === 'noun'
      ? headword(cur.item.entry)
      : (typeof cur.q.answer === 'string' ? cur.q.answer : cur.item.entry.de);
    if (S.settings().tts && global.speechSynthesis && sayable) {
      next.appendChild(el('button', {
        class: 'btn ghost', text: '발음 듣기',
        onclick: function () { speak(sayable); }
      }));
    }

    var host = app.querySelector('.card');
    host.appendChild(fb);
    host.appendChild(next);
    // 기존 제출 버튼은 지운다
    var old = host.querySelectorAll('.answer .actions');
    old.forEach(function (n) { n.remove(); });
    next.querySelector('button').focus();
  }

  function markCells(cells) {
    cells.forEach(function (c) {
      var i = app.querySelector('input[data-key="' + c.key + '"]');
      if (!i) return;
      i.className = c.grade === 'right' ? 'ok' : c.grade === 'partial' ? 'part' : 'bad';
      i.readOnly = true;
    });
  }

  /**
   * 채점 뒤에 보여주는 단어 정보 — 표제어 · 뜻 · 문법정보 · 예문.
   *
   * 뜻(en/ko)은 Goethe 원문에 없어서 지금은 비어 있다. 채워 넣으면 여기에 뜬다.
   * 그 전까지는 예문이 뜻을 대신한다.
   */
  function wordInfo(e, revealed) {
    var box = el('div', { class: 'winfo' });

    box.appendChild(el('div', { class: 'wtitle ' + genderClass(e.gender) }, [
      el('b', { text: headword(e) }),
      el('span', { class: 'muted small', text: '  ' + info(e) })
    ]));

    // 뜻은 여기서도 눌러야 나온다. 이미 힌트로 봤으면 그대로 펼쳐 둔다.
    // 뜻이 비어 있으면 바로 적을 수 있게 한다 — 뜻이 필요하다고 느끼는 자리가 여기다.
    var slot = el('div', { class: 'wmeanslot' });
    box.appendChild(slot);
    renderMeaning(slot, e, revealed);

    // 예문 전체. 그 단어를 굵게 표시해 문맥에서 눈에 띄게 한다.
    (e.ex || []).forEach(function (x) {
      box.appendChild(el('div', { class: 'wex', html: highlight(x.de, e) }));
    });

    if (S.settings().tts && global.speechSynthesis) {
      var say = e.pos === 'noun' ? headword(e) : e.de;
      box.appendChild(el('button', {
        class: 'btn ghost wsay', text: '🔊 ' + say,
        onclick: function () { speak(say); }
      }));
    }
    return box;
  }

  /**
   * 뜻 칸 — 세 가지 상태를 한 자리에서 처리한다.
   *   뜻 있음 + 힌트 봤음  -> 그냥 보여준다
   *   뜻 있음 + 힌트 안 봄 -> '뜻 보기' 버튼
   *   뜻 없음              -> 바로 입력칸 (학습 흐름을 끊지 않고 채워 나가려고)
   */
  function renderMeaning(slot, e, revealed) {
    clear(slot);
    var meaning = [e.ko, e.en].filter(Boolean).join('  ·  ');

    if (meaning && !revealed) {
      slot.appendChild(el('button', {
        class: 'btn ghost wsay', type: 'button', text: '뜻 보기',
        onclick: function () { renderMeaning(slot, e, true); }
      }));
      return;
    }

    if (meaning) {
      slot.appendChild(el('div', { class: 'wmean' }, [
        document.createTextNode(meaning),
        el('button', {
          class: 'linkbtn', type: 'button', text: '고치기',
          onclick: function () { meaningForm(slot, e); }
        })
      ]));
      return;
    }

    meaningForm(slot, e);
  }

  /** 뜻 입력 한 줄. Enter 로 저장되고 저장하면 그 자리에서 확정된다. */
  function meaningForm(slot, e) {
    clear(slot);
    var inp = el('input', {
      type: 'text', class: 'meaninput', autocomplete: 'off', spellcheck: 'false',
      value: e.ko || '', placeholder: '뜻을 적어 두세요 (Enter 저장)'
    });

    function save() {
      var v = inp.value.trim();
      if (!v) return;
      e.ko = v;
      S.editWord(e.id, { ko: v });
      S.saveNow();
      POOL = buildPool();          // 뜻이 생겼으니 뜻 테스트 범위도 바로 넓어진다
      renderMeaning(slot, e, true);
    }

    // Enter 가 '다음 문제' 로 새어 나가지 않게 여기서 막는다
    inp.addEventListener('keydown', function (ev) {
      ev.stopPropagation();
      if (ev.key === 'Enter') { ev.preventDefault(); save(); }
    });

    slot.appendChild(el('div', { class: 'meanrow' }, [
      inp,
      el('button', { class: 'btn ghost', type: 'button', text: '저장', onclick: save })
    ]));
  }

  /**
   * 문장 구조를 그림으로 — 독일어 문장의 뼈대를 한눈에 보게 한다.
   *
   *   Vorfeld    V2        Mittelfeld           문장 끝
   *     Ich    [ habe ]  gestern mit ihm    [ gesprochen ]
   *             └──────── 문장괄호 ────────────┘
   */
  function satzklammer(f) {
    var box = el('div', { class: 'klammer' });

    function cell(label, items, cls) {
      var texts = (items || []).map(function (c) { return c.t; }).join(' ');
      return el('div', { class: 'kcell ' + (cls || '') }, [
        el('div', { class: 'klabel', text: label }),
        el('div', { class: 'kval', text: texts || '—' })
      ]);
    }

    if (f.sub) {
      box.appendChild(el('div', { class: 'krow' }, [
        cell('접속사', f.vorfeld ? [f.vorfeld] : [], 'k-konj'),
        cell('가운데', f.mittelfeld),
        cell('동사 (맨 끝)', f.rechte, 'k-verb')
      ]));
      box.appendChild(el('div', { class: 'kbar sub' }, [
        el('span', { text: '종속절 — 정동사가 끝으로' })
      ]));
      return box;
    }

    box.appendChild(el('div', { class: 'krow' }, [
      cell('앞자리 Vorfeld', f.vorfeld),
      cell('정동사 (2위)', f.linke ? [f.linke] : [], 'k-verb'),
      cell('가운데 Mittelfeld', f.mittelfeld),
      f.rechte.length ? cell('문장 끝', f.rechte, 'k-verb') : null
    ].filter(Boolean)));

    if (f.rechte.length) {
      box.appendChild(el('div', { class: 'kbar' }, [
        el('span', { text: '문장괄호 (Satzklammer) — 두 동사부가 문장을 감쌉니다' })
      ]));
    }
    return box;
  }

  /** 예문 안에서 표제어(활용형 포함)를 굵게 */
  function highlight(sentence, e) {
    var stem = e.de.length > 4 ? e.de.slice(0, e.de.length - 2) : e.de;
    var re = new RegExp('(^|[\\s(„"\'-])(' + stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
                        '[\\wäöüßÄÖÜ]*)', 'i');
    var safe = esc(sentence);
    var m = safe.match(re);
    if (!m) return safe;
    return safe.replace(re, '$1<b>$2</b>');
  }

  function declPreview(e) {
    var t = D.table(e, 'definite', { germanOrder: S.settings().germanOrder });
    var tbl = el('table', { class: 'decl' });
    tbl.appendChild(el('tr', {}, [
      el('th', { text: '' }), el('th', { text: '단수' }), el('th', { text: '복수' })
    ]));
    t.order.forEach(function (k) {
      tbl.appendChild(el('tr', {}, [
        el('th', { text: Drills.caseLabel(k) }),
        el('td', { class: 'noun', text: t.sg[k] ? t.sg[k].full : '—' }),
        el('td', { class: 'noun', text: t.pl[k] ? t.pl[k].full : '—' })
      ]));
    });
    return el('div', {}, [el('div', { class: 'cells', text: '정관사 격변화' }), tbl]);
  }

  function verbPreview(e) {
    var rows = [
      ['부정형', e.de],
      ['현재 (er)', e.pres3 || '—'],
      ['과거 (er)', e.praet || '—'],
      ['과거분사', e.pp ? (e.aux === 'sein' ? 'ist ' : 'hat ') + e.pp : '—']
    ];
    var tbl = el('table', { class: 'decl' });
    rows.forEach(function (r) {
      tbl.appendChild(el('tr', {}, [
        el('th', { text: r[0] }), el('td', { class: 'noun', colspan: '2', text: r[1] })
      ]));
    });
    return el('div', {}, [el('div', { class: 'cells', text: '동사 기본형' }), tbl]);
  }

  function advance() {
    session.i++;
    renderQuestion();
  }

  function renderDone() {
    var n = session.queue.length;
    var pct = n ? Math.round(100 * (session.right + session.partial) / n) : 0;
    render([
      el('h2', { text: '세션 완료' }),
      el('div', { class: 'tiles' }, [
        tile(session.right, '정답'),
        tile(session.partial, '거의 정답'),
        tile(session.wrong, '오답'),
        tile(pct + '%', '정답률')
      ]),
      el('div', { class: 'actions' }, [
        el('button', { class: 'btn', text: '계속 학습', onclick: function () { go('study'); } }),
        el('button', { class: 'btn ghost', text: '홈으로', onclick: function () { go('home'); } })
      ])
    ]);
    session = null;
  }

  function viewStudy() {
    var q = global.SRS.buildQueue(POOL, 20, { newPerDay: S.settings().newPerDay });
    if (!q.length) {
      // 예정된 게 없으면 자유 연습 — 가장 덜 익은 것부터
      q = POOL.slice();
      q.sort(function (a, b) {
        return global.SRS.mastery(S.getCard(a.id, a.drill)) -
               global.SRS.mastery(S.getCard(b.id, b.drill));
      });
      q = global.SRS.shuffle(q.slice(0, 60)).slice(0, 20);
      startSession(q, '자유 연습');
      return;
    }
    startSession(q, '학습');
  }

  /**
   * 뜻 테스트 — 뜻을 적어 둔 단어만 골라 낸다.
   *
   * 설정의 드릴 선택과 무관하게 바로 시작한다. '지금 이걸 보겠다' 는 요청이라
   * 예정된 복습이 없어도 그냥 낸다.
   *
   * @param dir 'de'  독일어 → 뜻
   *            'ko'  뜻 → 독일어
   *            null  섞어서
   */
  function meaningPool(dir) {
    var want = dir === 'de' ? ['meaningDe']
             : dir === 'ko' ? ['meaningKo']
             : ['meaningDe', 'meaningKo'];
    var st = S.settings();
    var out = [];
    WORDS.forEach(function (e) {
      if (!(e.levels || []).some(function (l) { return st.levels.indexOf(l) >= 0; })) return;
      want.forEach(function (id) {
        var d = Drills.BY_ID[id];
        if (d && d.applies(e)) out.push({ id: e.id, drill: id, entry: e });
      });
    });
    return out;
  }

  function startMeaningTest(dir) {
    var pool = meaningPool(dir);
    if (!pool.length) {
      render([
        el('h2', { text: '뜻 테스트' }),
        el('div', { class: 'empty' }, [
          el('p', { text: '아직 뜻을 적어 둔 단어가 없습니다.' }),
          el('p', { class: 'small', text: '뜻을 채우면 그만큼 시험 범위가 자동으로 늘어납니다.' }),
          el('div', { class: 'actions' }, [
            el('button', { class: 'btn', text: '뜻 채우러 가기',
              onclick: function () { go('meanings'); } })
          ])
        ])
      ]);
      return;
    }
    // 복습 예정이 있으면 그것부터, 없으면 덜 익은 것부터
    var q = global.SRS.buildQueue(pool, 20, { newPerDay: 1000 });
    if (!q.length) {
      q = pool.slice().sort(function (a, b) {
        return global.SRS.mastery(S.getCard(a.id, a.drill)) -
               global.SRS.mastery(S.getCard(b.id, b.drill));
      });
      q = global.SRS.shuffle(q.slice(0, 60)).slice(0, 20);
    }
    startSession(q, '뜻 테스트 (' + pool.length.toLocaleString() + '개 중)');
  }

  function viewWrong() {
    var w = global.SRS.wrongList(POOL);
    if (!w.length) {
      render([el('h2', { text: '오답노트' }),
              el('div', { class: 'empty', text: '아직 틀린 문제가 없습니다.' })]);
      return;
    }
    startSession(w.slice(0, 20), '오답노트 (' + w.length + '개)');
  }

  // ---------------------------------------------------------------- 단어장

  var listState = { q: '', pos: '', lvl: '', page: 0, review: false, broken: false, trash: false };

  function viewWords() {
    var f = el('div', { class: 'filters' }, [
      el('input', { type: 'text', placeholder: '검색 (독일어)', value: listState.q,
        oninput: function (e) { listState.q = e.target.value; listState.page = 0; renderList(); } }),
      select(['', 'noun', 'verb', 'adj', 'function'],
             ['전체 품사', '명사', '동사', '형용사/부사', '기능어'], listState.pos,
             function (v) { listState.pos = v; listState.page = 0; renderList(); }),
      select(['', 'A1', 'A2', 'B1', 'B2'], ['전체 레벨', 'A1', 'A2', 'B1', 'B2'], listState.lvl,
             function (v) { listState.lvl = v; listState.page = 0; renderList(); }),
      el('label', { class: 'row' }, [
        el('input', { type: 'checkbox', checked: listState.review ? 'checked' : null,
          onchange: function (ev) {
            listState.review = ev.target.checked; listState.page = 0; renderList();
          } }),
        el('span', { class: 'small', text: '검수 필요만' })
      ]),
      // 원문에서 잘못 딸려 온 줄을 모아 본다 — 한 번에 정리하기 위해
      el('label', { class: 'row' }, [
        el('input', { type: 'checkbox', checked: listState.broken ? 'checked' : null,
          onchange: function (ev) {
            listState.broken = ev.target.checked;
            if (ev.target.checked) listState.trash = false;
            listState.page = 0;
            viewWords();   // 목록 위 안내와 일괄 삭제 버튼도 같이 바뀐다
          } }),
        el('span', { class: 'small', text: '깨진 항목만' })
      ]),
      el('label', { class: 'row' }, [
        el('input', { type: 'checkbox', checked: listState.trash ? 'checked' : null,
          onchange: function (ev) {
            listState.trash = ev.target.checked;
            if (ev.target.checked) listState.broken = false;
            listState.page = 0;
            viewWords();
          } }),
        el('span', { class: 'small', text: '지운 것 보기 (' + S.deletedCount() + ')' })
      ]),
      el('button', { class: 'btn ghost', text: '단어 추가', onclick: viewImport })
    ]);
    var extra = [];
    if (listState.broken) {
      var broken = filtered();
      extra.push(el('div', { class: 'card' }, [
        el('p', { class: 'muted small', text:
          '원문 PDF 에서 잘못 딸려 온 줄로 보이는 항목입니다 — 오스트리아·스위스 표기 안내나 ' +
          '참고문헌 조각이 낱말로 읽힌 것들입니다. 멀쩡한 낱말이 섞여 있을 수 있으니 ' +
          '한 번 훑어보고 지우세요.' }),
        el('div', { class: 'actions leftish' }, [
          el('button', { class: 'btn ghost danger',
            text: '이 조건의 ' + broken.length.toLocaleString() + '개 전부 삭제',
            onclick: function () {
              if (!broken.length) return;
              var msg = broken.length + '개를 목록에서 뺍니다.' + String.fromCharCode(10) +
                        '나중에 "지운 것 보기" 에서 되돌릴 수 있습니다.';
              if (!global.confirm(msg)) return;
              broken.forEach(function (e) { S.deleteWord(e.id); });
              S.saveNow();
              WORDS = loadWords();
              POOL = buildPool();
              lastDeleted = null;
              viewWords();
            } })
        ])
      ]));
    }
    if (listState.trash) {
      extra.push(el('p', { class: 'muted small', text:
        '지운 항목입니다. 행을 클릭하면 되돌릴 수 있습니다.' }));
    }
    var undoW = undoBar(function () { viewWords(); });
    if (undoW) extra.push(undoW);

    render([el('h2', { text: '단어장' }), f]
      .concat(extra)
      .concat([el('div', { id: 'listhost' })]));
    renderList();
  }

  function select(vals, labels, cur, onchange) {
    var s = el('select', { onchange: function (e) { onchange(e.target.value); } });
    vals.forEach(function (v, i) {
      var o = el('option', { value: v, text: labels[i] });
      if (v === cur) o.selected = true;
      s.appendChild(o);
    });
    return s;
  }

  function filtered() {
    var q = listState.q.trim().toLowerCase();
    // '지운 것 보기' 는 WORDS 에서 이미 빠진 항목이라 원본에서 다시 만든다
    var src = listState.trash ? deletedWords() : WORDS;
    return src.filter(function (e) {
      if (listState.pos && e.pos !== listState.pos) return false;
      if (listState.lvl && (e.levels || []).indexOf(listState.lvl) < 0) return false;
      if (listState.review && !global.Editor.needsReview(e)) return false;
      if (listState.broken && !global.Editor.looksBroken(e)) return false;
      if (q && e.de.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  /** 지운 항목만 — 되돌릴 수 있게 원본에서 다시 모은다 */
  function deletedWords() {
    var all = []
      .concat(global.NOUNS || [])
      .concat(global.VERBS || [])
      .concat(global.ADJECTIVES || [])
      .concat(global.FUNCTIONWORDS || [])
      .concat(S.load().added || []);
    return S.applyEdits(all).filter(function (e) { return S.isDeleted(e.id); });
  }

  // ---------------------------------------------------------------- 임포터

  function viewImport() {
    var ta = el('textarea', { rows: '12', spellcheck: 'false', placeholder:
      'Goethe 목록과 같은 형식으로 한 줄에 하나씩 붙여넣으세요.\n\n' +
      'der Apfel, -¨\n' +
      'die Ansage, -n\n' +
      'das Buch, ¨-er        Bücher sind teuer.\n' +
      'fahren, fährt, fuhr, ist gefahren\n' +
      'schnell' });
    var preview = el('div', {});

    function refresh() {
      clear(preview);
      var r = global.Editor.parseImport(ta.value);
      if (r.errors.length) {
        preview.appendChild(el('div', { class: 'fb wrong' }, [
          el('div', { class: 'head', text: '알아보지 못한 줄 ' + r.errors.length + '개' }),
          el('div', { class: 'cells', text: r.errors.slice(0, 6).join('\n') })
        ]));
      }
      if (!r.rows.length) return;

      var existing = {};
      WORDS.forEach(function (w) { existing[w.pos + ':' + w.id] = true; });

      var tbl = el('table', { class: 'list sticky' });
      tbl.appendChild(el('tr', {}, [
        el('th', { text: '표제어' }), el('th', { text: '정보' }), el('th', { text: '상태' })
      ]));
      r.rows.forEach(function (e) {
        var dup = existing[e.pos + ':' + e.id];
        tbl.appendChild(el('tr', {}, [
          el('td', { class: genderClass(e.gender), text: headword(e) }),
          el('td', { class: 'muted small', text: info(e) }),
          el('td', { class: 'small', text: dup ? '이미 있음 (건너뜀)' : '추가' })
        ]));
      });
      preview.appendChild(el('p', { class: 'muted small',
        text: r.rows.length + '개 인식' }));
      preview.appendChild(tbl);
      preview.appendChild(el('div', { class: 'actions' }, [
        el('button', { class: 'btn', text: '단어장에 추가', onclick: function () {
          var added = 0;
          r.rows.forEach(function (e) {
            if (existing[e.pos + ':' + e.id]) return;
            S.addWord(e); added++;
          });
          S.saveNow();
          WORDS = loadWords();
          POOL = buildPool();
          alert(added + '개를 추가했습니다.');
          go('words');
        } })
      ]));
    }

    ta.addEventListener('input', refresh);

    render([
      el('h2', { text: '단어 추가' }),
      el('p', { class: 'muted small', text:
        '탭이나 공백 두 칸으로 나누면 두 번째 칸을 복수형·예문으로 읽습니다. ' +
        'JSON 배열도 됩니다.' }),
      el('div', { class: 'card' }, [ta]),
      preview,
      el('div', { class: 'actions' }, [
        el('button', { class: 'btn ghost', text: '단어장으로', onclick: function () { go('words'); } })
      ])
    ]);
  }

  var PER = 60;

  function renderList() {
    var host = document.getElementById('listhost');
    if (!host) return;
    clear(host);
    var rows = filtered();
    var page = rows.slice(listState.page * PER, (listState.page + 1) * PER);

    host.appendChild(el('p', { class: 'muted small',
      text: rows.length.toLocaleString() + '개  ·  행을 클릭하면 뜻과 문법 정보를 고칠 수 있습니다' }));

    var tbl = el('table', { class: 'list sticky' });
    tbl.appendChild(el('tr', {}, [
      el('th', { text: '표제어' }), el('th', { text: '뜻' }), el('th', { text: '정보' }),
      el('th', { text: '레벨' }), el('th', { text: '' })
    ]));
    page.forEach(function (e) {
      var review = global.Editor && global.Editor.needsReview(e);
      var meaning = [e.ko, e.en].filter(Boolean).join(' · ');
      var row = el('tr', {}, [
        el('td', { class: genderClass(e.gender),
                   html: '<b>' + esc(headword(e)) + '</b>' +
                         (review ? ' <span class="lvl">검수</span>' : '') }),
        meaning
          ? el('td', { text: meaning })
          : el('td', { class: 'addmean', text: '＋ 뜻 적기' }),
        el('td', { class: 'muted small', text: info(e) }),
        el('td', { html: levelTags(e.levels) }),
        el('td', { class: 'muted small', text: '편집 ▾' })
      ]);
      row.className = 'clickable';
      row.addEventListener('click', function () { openEditor(e, row); });
      tbl.appendChild(row);
    });
    host.appendChild(tbl);

    var pages = Math.ceil(rows.length / PER);
    if (pages > 1) {
      host.appendChild(el('div', { class: 'pager' }, [
        el('button', { class: 'btn ghost', text: '이전', disabled: listState.page === 0 ? 'disabled' : null,
          onclick: function () { listState.page--; renderList(); window.scrollTo(0, 0); } }),
        el('span', { class: 'muted small', text: (listState.page + 1) + ' / ' + pages }),
        el('button', { class: 'btn ghost', text: '다음',
          disabled: listState.page >= pages - 1 ? 'disabled' : null,
          onclick: function () { listState.page++; renderList(); window.scrollTo(0, 0); } })
      ]));
    }
  }

  /**
   * 단어 편집 패널 — 목록의 행을 누르면 그 아래에 펼쳐진다.
   * PDF 에서 복수형이 안 잡힌 항목을 여기서 손으로 채운다 (검수).
   */
  function openEditor(e, row) {
    var next = row.nextSibling;
    if (next && next.className === 'editrow') { next.remove(); return; }

    var fields = global.Editor.fieldsFor(e);
    var inputs = {};
    var box = el('div', { class: 'card' }, [
      el('div', { class: 'q', html:
        '<div class="prompt ' + genderClass(e.gender) + '" style="font-size:22px">' +
        esc(headword(e)) + '</div>' }),
      speakButton(e)
    ]);

    var grid = el('div', { class: 'fields' });
    fields.forEach(function (f) {
      var control;
      if (f.type === 'select') {
        control = el('select', {});
        f.options.forEach(function (o) {
          var opt = el('option', { value: o[0], text: o[1] });
          if (String(e[f.key] || '') === o[0]) opt.selected = true;
          control.appendChild(opt);
        });
      } else if (f.type === 'bool') {
        control = el('input', { type: 'checkbox' });
        control.checked = !!e[f.key];
      } else {
        control = el('input', { type: 'text', value: e[f.key] == null ? '' : e[f.key],
                                placeholder: f.ph || '' });
      }
      inputs[f.key] = { el: control, type: f.type };
      grid.appendChild(el('div', { class: 'field' }, [el('label', { text: f.label }), control]));
    });
    box.appendChild(grid);

    box.appendChild(el('div', { class: 'actions' }, [
      el('button', { class: 'btn', text: '저장', onclick: function () {
        var patch = {};
        Object.keys(inputs).forEach(function (k) {
          var i = inputs[k];
          patch[k] = i.type === 'bool' ? i.el.checked
                   : i.type === 'text' ? (i.el.value.trim() || null)
                   : i.el.value;
        });
        S.editWord(e.id, patch);
        Object.assign(e, patch);
        POOL = buildPool();
        row.nextSibling.remove();
        renderList();
      } }),
      el('button', { class: 'btn ghost', text: '닫기', onclick: function () {
        row.nextSibling.remove();
      } }),
      // 원문에서 잘못 딸려 온 항목을 여기서 뺀다. 되돌릴 수 있다.
      S.isDeleted(e.id)
        ? el('button', { class: 'btn ghost', text: '되돌리기', onclick: function () {
            S.restoreWord(e.id); S.saveNow();
            WORDS = loadWords(); POOL = buildPool();
            viewWords();
          } })
        : el('button', { class: 'btn ghost danger', text: '이 항목 삭제',
            title: '낱말이 아닌 항목을 목록에서 뺍니다', onclick: function () {
              removeWord(e, function () { viewWords(); });
            } })
    ]));

    // 명사면 고친 결과의 격변화 표를 바로 보여준다
    if (e.pos === 'noun' && e.gender) box.appendChild(declPreview(e));

    var tr = el('tr', { class: 'editrow' }, [el('td', { colspan: '5' }, [box])]);
    row.parentNode.insertBefore(tr, row.nextSibling);
  }

  /** 발음 듣기 — 브라우저 내장 TTS. 외부 파일도 인터넷도 필요 없다. */
  function speakButton(e) {
    if (!S.settings().tts || !global.speechSynthesis) return null;
    var text = e.pos === 'noun' ? headword(e) : e.de;
    return el('div', { class: 'actions' }, [
      el('button', { class: 'btn ghost', text: '발음 듣기 (de-DE)', onclick: function () {
        speak(text);
      } })
    ]);
  }

  function speak(text) {
    try {
      global.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      u.rate = 0.9;
      global.speechSynthesis.speak(u);
    } catch (err) { /* 음성이 없는 환경이면 조용히 넘어간다 */ }
  }

  function headword(e) {
    if (e.pos === 'noun') return (Drills.GENDER_ARTICLE[e.gender] || '') + ' ' + e.de;
    return e.de;
  }

  function info(e) {
    if (e.pos === 'noun') {
      var p = e.plural ? 'pl. die ' + e.plural : (e.pluralOnly ? '복수전용' : '복수 없음');
      return p + (e.nDekl ? ' · n-변화' : '') + (e.adjNoun ? ' · 형용사변화' : '');
    }
    if (e.pos === 'verb') {
      if (!e.pres3) return '활용 정보 없음';
      return [e.pres3, e.praet, (e.aux === 'sein' ? 'ist ' : 'hat ') + (e.pp || '?')]
             .filter(Boolean).join(' · ') + (e.separable ? ' · 분리' : '');
    }
    if (e.pos === 'adj' && e.comp) return e.comp + ' · am ' + e.sup;
    return '';
  }


  // ---------------------------------------------------------------- 뜻 채우기

  /**
   * 뜻만 빠르게 채워 넣는 화면.
   * Enter 로 저장 -> 다음 단어 -> 포커스 유지. 손이 키보드를 안 떠나게 한다.
   */
  function viewMeanings() {
    var M = global.Meanings;
    var st = M.state;
    st.list = M.build(WORDS);
    if (st.i >= st.list.length) st.i = 0;

    var c = M.counts(WORDS);
    var pct = c.total ? Math.round(100 * c.filled / c.total) : 0;

    var filters = el('div', { class: 'filters' }, [
      select(['', 'A1', 'A2', 'B1', 'B2'], ['전체 레벨', 'A1', 'A2', 'B1', 'B2'], st.level,
             function (v) { st.level = v; st.i = 0; viewMeanings(); }),
      select(['', 'noun', 'verb', 'adj'], ['전체 품사', '명사', '동사', '형용사/부사'], st.pos,
             function (v) { st.pos = v; st.i = 0; viewMeanings(); }),
      el('label', { class: 'row' }, [
        el('input', { type: 'checkbox', checked: st.onlyEmpty ? 'checked' : null,
          onchange: function (ev) { st.onlyEmpty = ev.target.checked; st.i = 0; viewMeanings(); } }),
        el('span', { class: 'small', text: '뜻 없는 것만' })
      ]),
      // 접두사 동사만 — 기본 동사부터 나오게 정렬된다
      el('label', { class: 'row' }, [
        el('input', { type: 'checkbox', checked: st.prefixOnly ? 'checked' : null,
          onchange: function (ev) {
            st.prefixOnly = ev.target.checked; st.i = 0; viewMeanings();
          } }),
        el('span', { class: 'small', text: '접두사 동사만' })
      ])
    ]);

    var head = [
      el('h2', { text: '뜻 채우기' }),
      el('p', { class: 'muted small', text:
        c.total.toLocaleString() + '개 중 ' + c.filled.toLocaleString() + '개 채움 (' + pct + '%)' +
        '  ·  남은 목록 ' + st.list.length.toLocaleString() + '개  ·  ' +
        (st.prefixOnly ? '기본 동사 → 파생어 순으로 나옵니다' : 'A1 부터 나옵니다') }),
      el('div', { class: 'bar' , html: '<i style="width:' + pct + '%"></i>' }),
      // 채운 만큼 바로 시험을 볼 수 있다. 범위는 뜻을 적을수록 저절로 넓어진다.
      el('div', { class: 'actions' }, [
        el('button', { class: 'btn ghost', text: '뜻 테스트 (독→뜻)',
          onclick: function () { startMeaningTest('de'); } }),
        el('button', { class: 'btn ghost', text: '뜻 테스트 (뜻→독)',
          onclick: function () { startMeaningTest('ko'); } }),
        el('button', { class: 'btn ghost', text: '섞어서',
          onclick: function () { startMeaningTest(null); } })
      ]),
      filters
    ];

    var undo = undoBar(function () { viewMeanings(); });
    if (undo) head.push(undo);

    if (!st.list.length) {
      render(head.concat([el('div', { class: 'empty' }, [
        el('p', { text: '이 조건에서는 채울 단어가 없습니다.' }),
        el('p', { class: 'small', text: '"뜻 없는 것만" 을 끄면 이미 채운 것도 고칠 수 있습니다.' })
      ])]));
      return;
    }

    // 다른 화면에서 '이 단어를 채우러' 넘어왔으면 그 자리로 옮긴다
    if (st.focusId) {
      for (var fi = 0; fi < st.list.length; fi++) {
        if (st.list[fi].id === st.focusId) { st.i = fi; break; }
      }
      st.focusId = null;
    }

    var e = st.list[st.i];
    var inp = el('input', {
      type: 'text', class: 'meaninput big', autocomplete: 'off', spellcheck: 'false',
      value: e.ko || '', placeholder: '뜻 (Enter 저장 후 다음)'
    });

    function save(andNext) {
      var v = inp.value.trim();
      if (v) {
        e.ko = v;
        S.editWord(e.id, { ko: v });
        S.saveNow();
        POOL = buildPool();        // 채운 만큼 시험 범위가 늘어난다
      }
      if (andNext) next();
    }

    function next() {
      // '뜻 없는 것만' 이면 방금 채운 항목이 목록에서 빠지므로 인덱스를 그대로 둔다
      if (!st.onlyEmpty) st.i++;
      viewMeanings();
    }

    function skip() { st.i++; viewMeanings(); }
    function prev() { st.i = Math.max(0, st.i - 1); viewMeanings(); }

    // 원문 PDF 에서 잘못 딸려 온 줄이 섞여 있다. 낱말이 아니면 여기서 지운다.
    function drop() {
      removeWord(e, function () { viewMeanings(); });
    }

    inp.addEventListener('keydown', function (ev) {
      ev.stopPropagation();
      if (ev.key === 'Enter') { ev.preventDefault(); save(true); }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); skip(); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); prev(); }
    });

    var card = el('div', { class: 'card mcard' }, [
      el('div', { class: 'mhead ' + genderClass(e.gender) }, [
        el('b', { text: headword(e) }),
        el('span', { class: 'lvlwrap', html: levelTags(e.levels) })
      ]),
      // 접두사 동사면 무엇으로 이루어졌는지 보여준다.
      // 정답을 주는 게 아니라 뜻을 떠올릴 재료를 주는 것이다.
      decompHint(e),
      el('div', { class: 'muted small', text: info(e) }),
      el('div', { class: 'mex' }, (e.ex || []).slice(0, 3).map(function (x) {
        return el('div', { class: 'wex', html: highlight(x.de, e) });
      })),
      el('div', { class: 'meanrow' }, [
        inp,
        el('button', { class: 'btn', type: 'button', text: '저장', onclick: function () { save(true); } })
      ]),
      el('div', { class: 'actions' }, [
        el('button', { class: 'btn ghost', text: '건너뛰기 (↓)', onclick: skip }),
      el('button', { class: 'btn ghost danger', text: '삭제', title: '낱말이 아닌 항목을 목록에서 뺍니다',
        onclick: drop }),
        el('button', { class: 'btn ghost', text: '이전 (↑)', onclick: prev }),
        speakBtn(e)
      ])
    ]);

    render(head.concat([card]));
    inp.focus();
    inp.select();
  }

  function speakBtn(e) {
    if (!S.settings().tts || !global.speechSynthesis) return null;
    var say = e.pos === 'noun' ? headword(e) : e.de;
    return el('button', { class: 'btn ghost', text: '🔊 발음',
      onclick: function () { speak(say); } });
  }


  // ---------------------------------------------------------------- 참고 표

  var tableState = { section: 'article', quiz: false, open: {} };

  /**
   * 참고 표.
   * 보기 모드와 빈칸 채우기 연습 모드를 토글 하나로 오간다.
   * 표 자체는 js/tables.js 가 엔진·데이터에서 만들어 준다.
   */
  function viewTables() {
    var secs = global.Tables.sections();
    var cur = null;
    secs.forEach(function (x) { if (x.key === tableState.section) cur = x; });
    if (!cur) cur = secs[0];

    var tabs = el('div', { class: 'subtabs' }, secs.map(function (x) {
      return el('button', {
        class: 'subtab' + (x.key === cur.key ? ' on' : ''),
        text: x.label,
        onclick: function () { tableState.section = x.key; viewTables(); }
      });
    }));

    var toggle = el('label', { class: 'row' }, [
      el('input', { type: 'checkbox', checked: tableState.quiz ? 'checked' : null,
        onchange: function (ev) { tableState.quiz = ev.target.checked; viewTables(); } }),
      el('span', { text: '빈칸 채우기로 연습' })
    ]);

    var body = el('div', {}, cur.tables.map(function (t) {
      return renderTable(t);
    }));

    render([
      el('h2', { text: '참고 표' }),
      el('p', { class: 'muted small', text:
        '엔진과 단어 데이터에서 그대로 뽑아낸 표입니다. 학습 화면의 채점과 같은 규칙을 씁니다.' }),
      tabs,
      el('div', { class: 'filters' }, [toggle]),
      body
    ]);
  }

  function renderTable(t) {
    var open = tableState.open[t.id] !== undefined
      ? tableState.open[t.id] : !t.collapsible;

    var head = el('div', { class: 'tblhead' }, [
      el('div', {}, [
        el('b', { text: t.title }),
        t.part ? el('div', { class: 'muted small', text: t.part }) : null
      ]),
      t.collapsible ? el('button', {
        class: 'btn ghost', text: open ? '접기' : '펼치기 (' + t.rows.length + '행)',
        onclick: function () { tableState.open[t.id] = !open; viewTables(); }
      }) : null
    ]);

    var kids = [head];
    if (open) {
      kids.push(el('div', { class: 'tblwrap' }, [
        tableState.quiz ? quizTable(t) : plainTable(t)
      ]));
      if (t.note) kids.push(el('div', { class: 'tblnote', text: t.note }));
    }
    return el('div', { class: 'card tbl' }, kids);
  }

  function plainTable(t) {
    var tbl = el('table', { class: 'ref' });
    tbl.appendChild(el('tr', {}, [el('th', { text: '' })].concat(
      t.cols.map(function (c) { return el('th', { text: c }); }))));
    t.rows.forEach(function (r) {
      tbl.appendChild(el('tr', {}, [el('th', { text: r.label })].concat(
        r.cells.map(function (c) { return el('td', { text: c }); }))));
    });
    return tbl;
  }

  /** 빈칸 채우기 — 칸을 입력칸으로 바꾸고 표 단위로 채점한다 */
  function quizTable(t) {
    var wrap = el('div', {});
    var tbl = el('table', { class: 'ref quiz' });
    var inputs = [];

    tbl.appendChild(el('tr', {}, [el('th', { text: '' })].concat(
      t.cols.map(function (c) { return el('th', { text: c }); }))));

    t.rows.forEach(function (r, ri) {
      var cells = r.cells.map(function (c, ci) {
        // 예문처럼 긴 칸은 그대로 보여준다. 외울 대상이 아니다.
        if (String(c).length > 24 || c === '' || c === '—') {
          return el('td', { class: 'muted small', text: c });
        }
        var inp = el('input', { type: 'text', autocomplete: 'off', spellcheck: 'false',
                                'data-want': c });
        inputs.push(inp);
        return el('td', { class: 'inp' }, [inp]);
      });
      tbl.appendChild(el('tr', {}, [el('th', { text: r.label })].concat(cells)));
    });

    var result = el('div', {});
    wrap.appendChild(tbl);
    wrap.appendChild(el('div', { class: 'actions' }, [
      el('button', { class: 'btn', text: '채점', onclick: function () {
        var right = 0;
        inputs.forEach(function (i) {
          var want = i.getAttribute('data-want');
          var r = global.Grader.gradeText(i.value, want, {});
          i.className = r.grade === 'right' ? 'ok' : r.grade === 'partial' ? 'part' : 'bad';
          if (r.grade !== 'wrong') right++;
          if (r.grade === 'wrong' && i.value.trim() === '') i.placeholder = want;
          else if (r.grade === 'wrong') i.title = '정답: ' + want;
        });
        clear(result);
        result.appendChild(el('div', {
          class: 'fb ' + (right === inputs.length ? 'right' : right ? 'partial' : 'wrong')
        }, [
          el('div', { class: 'head', text: right + ' / ' + inputs.length + ' 정답' }),
          right < inputs.length
            ? el('div', { class: 'note small', text: '틀린 칸에 정답을 흐리게 넣어 두었습니다.' })
            : null
        ]));
      } }),
      el('button', { class: 'btn ghost', text: '지우기', onclick: function () {
        inputs.forEach(function (i) { i.value = ''; i.className = ''; i.placeholder = ''; });
        clear(result);
      } })
    ]));
    wrap.appendChild(result);
    return wrap;
  }

  // ---------------------------------------------------------------- 통계

  function pctText(x) { return Math.round(x * 100) + '%'; }

  function delta(cur, prev, unit) {
    var d = cur - prev;
    if (!prev && !cur) return el('span', { class: 'muted small', text: '—' });
    var cls = d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
    var sign = d > 0 ? '▲ +' : d < 0 ? '▼ ' : '– ';
    return el('span', { class: 'delta ' + cls, text: sign + d + (unit || '') });
  }

  function statRow(label, bar, right, color, cls) {
    return el('div', { class: 'barrow' + (cls ? ' ' + cls : '') }, [
      el('span', { class: 'small', text: label }),
      el('span', { class: 'bar', html:
        '<i style="width:' + Math.round(bar * 100) + '%' +
        (color ? ';background:' + color : '') + '"></i>' }),
      el('span', { class: 'rt', text: right })
    ]);
  }

  function rateColor(r) {
    return r < 0.6 ? 'var(--wrong)' : r < 0.85 ? 'var(--partial)' : 'var(--right)';
  }

  function viewStats() {
    var St = global.Stats;
    var c = global.SRS.counts(POOL);
    var store = S.load();

    // ── 요약
    var box = St.boxDistribution();
    var tiles = el('div', { class: 'tiles' }, [
      tile(box.longTerm, '장기기억 (7일+)'),
      tile(box.total, '학습 시작한 카드'),
      tile(c.total.toLocaleString(), '전체 문제 후보'),
      tile(store.streak || 0, '연속 학습일'),
      tile(S.todayCount(), '오늘 푼 문제')
    ]);

    // ── ① 장기기억 전환
    var boxCard = el('div', { class: 'card' }, [
      el('p', { class: 'muted small', text:
        '복습 간격이 길수록 오래 기억한다는 뜻입니다. 아래로 갈수록 좋습니다.' })
    ].concat(box.rows.map(function (r) {
      var color = (r.label === '35일' || r.label === '90일') ? 'var(--right)'
                : (r.label === '7일' || r.label === '16일') ? 'var(--accent)'
                : 'var(--partial)';
      return statRow(r.label + ' 뒤 복습', r.pct, r.n + '개', color);
    })));

    // ── ② 주간 비교
    var w = St.weekCompare();
    function cmpRow(label, a, b, unit) {
      return el('tr', {}, [
        el('th', { text: label }),
        el('td', { text: a + unit }),
        el('td', { text: b + unit }),
        el('td', {}, [delta(b, a, unit)])
      ]);
    }
    var weekCard = el('div', { class: 'card' }, [
      el('div', { class: 'tblwrap' }, [
        el('table', { class: 'ref' }, [
          el('tr', {}, [el('th', { text: '' }), el('th', { text: '지난 주' }),
                        el('th', { text: '이번 주' }), el('th', { text: '변화' })]),
          cmpRow('푼 문제', w.prev.n, w.cur.n, '개'),
          cmpRow('정답률', Math.round(w.prev.rate * 100), Math.round(w.cur.rate * 100), '%'),
          cmpRow('새로 시작한 단어', w.prev.fresh, w.cur.fresh, '개'),
          cmpRow('학습한 날', w.prev.days, w.cur.days, '일')
        ])
      ])
    ]);

    // ── 히트맵
    var hm = St.heatmap(12);
    var grid = el('div', { class: 'heat' });
    hm.cells.forEach(function (cell) {
      var lvl = cell.future ? 'x'
              : cell.n === 0 ? 0
              : Math.min(4, Math.ceil((cell.n / (hm.max || 1)) * 4));
      grid.appendChild(el('i', { class: 'h' + lvl, title: cell.d + '  ' + cell.n + '개' }));
    });
    var heatCard = el('div', { class: 'card' }, [
      el('div', { class: 'tblwrap' }, [grid]),
      el('div', { class: 'muted small', text: '최근 12주 · 진할수록 많이 푼 날' })
    ]);

    // ── ③ 드릴별 · 레벨별
    var dr = St.byDrill(Drills);
    var drillCard = el('div', { class: 'card' }, dr.length
      ? [el('p', { class: 'muted small', text:
          '정답률이 낮은 것부터. 위쪽이 지금 약한 곳입니다.' })].concat(
          dr.map(function (x) {
            return statRow(x.label, x.rate,
                           pctText(x.rate) + '  (' + x.seen + '회)', rateColor(x.rate));
          }))
      : [el('p', { class: 'muted small', text: '아직 기록이 없습니다.' })]);

    var lvCard = el('div', { class: 'card' }, [
      el('p', { class: 'muted small', text:
        '단어가 처음 나오는 레벨로 묶습니다. Goethe 단어장은 누적이라 A1 단어가 ' +
        'B1 목록에도 다시 실리는데, 그것까지 B1 성적으로 세면 등급이 뭉개집니다. ' +
        'B2 칸에는 B2 에만 있는 단어만 들어갑니다.' })
    ].concat(St.byLevel(WORDS).map(function (x) {
      return statRow(x.label, x.rate,
                     x.seen ? pctText(x.rate) + '  (' + x.seen + '회)' : '—',
                     rateColor(x.rate), 'wide');
    })).concat([
      el('div', { class: 'muted small' }, [
        el('span', { text: '푼 단어 / 전체:  ' }),
        el('span', { text: St.byLevel(WORDS).map(function (x) {
          return x.label + ' ' + x.words + '/' + x.pool.toLocaleString();
        }).join('   ·   ') })
      ])
    ]));

    // ── ④ 약점 목록
    var weak = St.weakest(WORDS, Drills, 20);
    var byId = {};
    WORDS.forEach(function (e) { byId[e.id] = e; });

    var weakCard = el('div', { class: 'card' }, weak.length ? [
      el('div', { class: 'actions leftish' }, [
        el('button', { class: 'btn', text: '이것만 모아서 연습 (' + weak.length + '개)',
          onclick: function () {
            var q = weak.map(function (x) {
              return byId[x.id] ? { id: x.id, drill: x.drill, entry: byId[x.id] } : null;
            }).filter(Boolean);
            startSession(q, '약점 집중 연습');
          } })
      ]),
      el('div', { class: 'tblwrap' }, [
        el('table', { class: 'list' }, [
          el('tr', {}, [el('th', { text: '단어' }), el('th', { text: '드릴' }),
                        el('th', { text: '틀림' }), el('th', { text: '오답률' })])
        ].concat(weak.map(function (x) {
          return el('tr', {}, [
            el('td', { class: genderClass(x.gender), html: '<b>' + esc(x.word) + '</b>' }),
            el('td', { class: 'muted small', text: x.drillLabel }),
            el('td', { text: x.wrong + ' / ' + x.seen }),
            el('td', { class: 'rt', text: pctText(x.rate) })
          ]);
        })))
      ])
    ] : [el('p', { class: 'muted small', text: '아직 틀린 문제가 없습니다.' })]);

    // ── 성별 · 복수형 유형
    var gName = { m: 'der (남성)', f: 'die (여성)', n: 'das (중성)' };
    var gCard = el('div', { class: 'card' }, [
      el('p', { class: 'muted small', text:
        '성을 알아야 풀리는 문제 전부 — 성 고르기 · 문맥 속 관사 + 명사 · 관사 격변화표 · ' +
        '뜻→독일어까지 셉니다.' })
    ].concat(St.byGender(WORDS).map(function (x) {
      return statRow(gName[x.g], x.rate,
                     x.seen ? pctText(x.rate) + '  (' + x.seen + '회)' : '아직 안 풀었음',
                     'var(--wrong)', 'wide');
    })));

    var pc = St.byPluralClass(WORDS).slice(0, 8);
    var pcCard = el('div', { class: 'card' }, pc.length
      ? pc.map(function (x) {
          var name = (D.PLURAL_CLASSES && D.PLURAL_CLASSES[x.cls]) || '';
          if (name === x.cls) name = '';        // '-e  -e' 처럼 겹쳐 찍히지 않게
          return statRow(x.cls + (name ? '  ' + name : ''), x.rate,
                         pctText(x.rate) + '  (' + x.seen + '회)', 'var(--wrong)');
        })
      : [el('p', { class: 'muted small', text: '복수형 문제를 더 풀면 여기 나옵니다.' })]);

    // ── 복습 부하 예보
    var up = St.upcoming(7);
    var maxUp = Math.max.apply(null, up.days.map(function (d) { return d.n; }).concat([1]));
    var upCard = el('div', { class: 'card' }, [
      up.late ? el('p', { class: 'muted small',
        text: '밀린 복습 ' + up.late + '개가 오늘 칸에 함께 들어 있습니다.' }) : null
    ].concat(up.days.map(function (d, i) {
      var label = i === 0 ? '오늘' : i === 1 ? '내일' : d.d.slice(5);
      return statRow(label, d.n / maxUp, d.n + '개',
                     d.n > 60 ? 'var(--wrong)' : 'var(--accent)');
    })));

    // ── ⑤ 뜻 채우기 진척
    var mp = St.meaningProgress(WORDS);
    var tr = St.meaningFillTrend(14);
    var maxFill = Math.max.apply(null, tr.days.map(function (d) { return d.n; }).concat([1]));

    var fillCard = el('div', { class: 'card' }, [
      el('div', { class: 'bigpct' }, [
        el('b', { text: mp.filled.toLocaleString() + ' / ' + mp.total.toLocaleString() }),
        el('span', { class: 'muted small', text: '  뜻을 적은 단어 (' + pctText(mp.pct) + ')' })
      ]),
      statRow('전체', mp.pct, pctText(mp.pct), 'var(--accent)'),
      el('p', { class: 'muted small', text: '레벨별 — 비어 있는 레벨부터 채우면 시험 범위가 빨리 넓어집니다.' })
    ].concat(mp.levels.map(function (r) {
      return statRow(r.label, r.pct, r.filled.toLocaleString() + ' / ' + r.total.toLocaleString(),
                     'var(--accent)', 'wide');
    })).concat([
      el('p', { class: 'muted small', text: '품사별' })
    ]).concat(mp.pos.map(function (r) {
      return statRow(r.label, r.pct, r.filled.toLocaleString() + ' / ' + r.total.toLocaleString(),
                     'var(--accent)', 'wide');
    })).concat([
      el('div', { class: 'actions leftish' }, [
        el('button', { class: 'btn ghost', text: '뜻 채우러 가기',
          onclick: function () { go('meanings'); } })
      ])
    ]));

    var trendCard = el('div', { class: 'card' }, [
      el('div', { class: 'tblwrap' }, [
        el('table', { class: 'ref' }, [
          el('tr', {}, [el('th', { text: '' }), el('th', { text: '지난 주' }),
                        el('th', { text: '이번 주' }), el('th', { text: '변화' })]),
          el('tr', {}, [
            el('th', { text: '적은 뜻' }),
            el('td', { text: tr.prev + '개' }),
            el('td', { text: tr.cur + '개' }),
            el('td', {}, [delta(tr.cur, tr.prev, '개')])
          ])
        ])
      ])
    ].concat(tr.total ? tr.days.map(function (d, i) {
      var label = i === tr.days.length - 1 ? '오늘' : d.d.slice(5);
      return statRow(label, d.n / maxFill, d.n ? d.n + '개' : '—',
                     d.n ? 'var(--right)' : 'var(--line)');
    }) : [el('p', { class: 'muted small', text: '아직 적은 뜻이 없습니다.' })])
      .concat([el('p', { class: 'muted small', text:
        '고친 시각 기준이라, 나중에 성·복수형을 고치면 그날로 옮겨 잡힙니다.' })]));

    // ── ⑥ 뜻 테스트 성적
    var mt = St.meaningTest(WORDS);
    var mtTiles = el('div', { class: 'tiles' }, [
      tile(mt.pool.toLocaleString(), '출제 가능 단어'),
      tile(mt.tested.toLocaleString(), '시험 본 단어'),
      tile(pctText(mt.coverage), '시험 진도'),
      tile(mt.seen ? pctText(mt.rate) : '—', '정답률'),
      tile(mt.longTerm, '장기기억 (7일+)')
    ]);

    var mtCard = el('div', { class: 'card' }, mt.pool ? [
      el('p', { class: 'muted small', text:
        '시험 진도 = 뜻을 적어 둔 단어 중 한 번이라도 시험까지 본 비율입니다. ' +
        '적어 두기만 하고 안 외운 단어를 잡아냅니다.' }),
      statRow('시험 진도', mt.coverage,
              mt.tested.toLocaleString() + ' / ' + mt.pool.toLocaleString(), 'var(--accent)', 'wide')
    ].concat(mt.dirs.map(function (d) {
      return statRow(d.label, d.rate,
                     d.seen ? pctText(d.rate) + '  (' + d.seen + '회)' : '아직 안 봄',
                     d.seen ? rateColor(d.rate) : 'var(--line)');
    })).concat([
      el('p', { class: 'muted small', text:
        mt.aliasCount
          ? '직접 인정한 답 ' + mt.aliasCount + '개 (단어 ' + mt.aliasWords + '개) — 답지에 들어가 있습니다.'
          : '아직 직접 인정한 답은 없습니다.' }),
      el('div', { class: 'actions leftish' }, [
        el('button', { class: 'btn', text: '뜻 테스트 (독→뜻)',
          onclick: function () { startMeaningTest('de'); } }),
        el('button', { class: 'btn ghost', text: '(뜻→독)',
          onclick: function () { startMeaningTest('ko'); } }),
        el('button', { class: 'btn ghost', text: '섞어서',
          onclick: function () { startMeaningTest(null); } })
      ])
    ]) : [
      el('p', { class: 'muted small', text:
        '뜻을 적은 단어가 없어 아직 출제할 게 없습니다. 뜻을 채우면 여기부터 채워집니다.' })
    ]);

    // ── 뜻 테스트에서 자주 틀리는 단어
    var wm = St.weakMeanings(WORDS, 15);
    var wmCard = el('div', { class: 'card' }, wm.length ? [
      el('div', { class: 'actions leftish' }, [
        el('button', { class: 'btn', text: '이것만 모아서 연습 (' + wm.length + '개)',
          onclick: function () {
            var q = wm.map(function (x) {
              return byId[x.id] ? { id: x.id, drill: x.drill, entry: byId[x.id] } : null;
            }).filter(Boolean);
            startSession(q, '뜻 집중 연습');
          } })
      ]),
      el('div', { class: 'tblwrap' }, [
        el('table', { class: 'list' }, [
          el('tr', {}, [el('th', { text: '단어' }), el('th', { text: '뜻' }),
                        el('th', { text: '틀림' }), el('th', { text: '오답률' })])
        ].concat(wm.map(function (x) {
          return el('tr', {}, [
            el('td', { class: genderClass(x.gender), html: '<b>' + esc(x.word) + '</b>' }),
            el('td', { class: 'muted small', text: x.meaning }),
            el('td', { text: x.wrong + ' / ' + x.seen }),
            el('td', { class: 'rt', text: pctText(x.rate) })
          ]);
        })))
      ])
    ] : [el('p', { class: 'muted small', text: '뜻 테스트에서 틀린 단어가 아직 없습니다.' })]);

    // ── ⑦ 접두사 동사
    var adv = St.prefixAdvice(WORDS);
    var pfxRows = St.byPrefix(WORDS);
    var trRows = St.byTransparency(WORDS);
    var mg = St.meaningVsGrammar(WORDS);

    var advCard = el('div', { class: 'card' }, [
      el('p', { class: 'note', text: adv.text }),
      el('div', { class: 'actions leftish' }, [
        el('button', { class: 'btn', text: '지금 이걸 연습',
          onclick: function () {
            var pool = adv.prefix ? global.Prefix.byPrefix(adv.prefix, WORDS)
                                  : global.Prefix.decomposable(WORDS);
            practice(pool, adv.drills, '접두사 집중 연습');
          } }),
        el('button', { class: 'btn ghost', text: '접두사 화면 열기',
          onclick: function () { go('prefixes'); } })
      ])
    ]);

    var pfxCard = el('div', { class: 'card' }, pfxRows.length
      ? [el('p', { class: 'muted small', text: '정답률이 낮은 접두사부터입니다.' })]
        .concat(pfxRows.slice(0, 12).map(function (x) {
          return statRow(x.label + '  ' + x.core, x.rate,
                         pctText(x.rate) + '  (' + x.seen + '회)', rateColor(x.rate), 'wide');
        }))
      : [el('p', { class: 'muted small', text: '접두사 문제를 풀면 여기 나옵니다.' })]);

    var trCard = el('div', { class: 'card' }, [
      el('p', { class: 'muted small', text:
        '"개별 암기" 등급에서만 낮다면 접두사로 뜻을 풀려 하지 말고 ' +
        '일반 단어처럼 반복하는 편이 빠릅니다.' })
    ].concat(trRows.map(function (x) {
      return statRow(x.label, x.rate,
                     x.seen ? pctText(x.rate) + '  (' + x.seen + '회)' : '아직 안 풀었음',
                     x.seen ? rateColor(x.rate) : 'var(--line)', 'wide');
    })));

    function gapTable(list, title, empty) {
      return el('div', { class: 'card' }, list.length ? [
        el('p', { class: 'muted small', text: title }),
        el('div', { class: 'tblwrap' }, [
          el('table', { class: 'list' }, [
            el('tr', {}, [el('th', { text: '동사' }), el('th', { text: '뜻' }),
                          el('th', { text: '활용' })])
          ].concat(list.slice(0, 10).map(function (x) {
            return el('tr', {}, [
              el('td', {}, [el('b', { text: x.word })]),
              el('td', { class: 'rt', text: pctText(x.mRate) }),
              el('td', { class: 'rt', text: pctText(x.gRate) })
            ]);
          })))
        ])
      ] : [el('p', { class: 'muted small', text: empty })]);
    }

    var mgCard = el('div', {}, [
      el('p', { class: 'muted small', text:
        '두 축을 다 풀어 본 동사 ' + mg.compared + '개를 비교했습니다. ' +
        '어느 쪽이 약한지에 따라 해야 할 일이 다릅니다.' }),
      gapTable(mg.grammarWeak, '뜻은 아는데 활용을 틀림 → 분리 위치 · ge 위치 훈련',
               '아직 이런 동사가 없습니다.'),
      gapTable(mg.meaningWeak, '활용은 되는데 뜻을 틀림 → 의미 추론 · 뜻 채우기',
               '아직 이런 동사가 없습니다.')
    ]);

    // ── 드릴별 진도 전체 (홈에서는 6개만 보여준다)
    var progCard = el('div', { class: 'card' }, [
      stageLegend(),
      el('div', {}, progressRows(partProgress()))
    ]);

    render([
      el('h2', { text: '통계' }),
      tiles,
      el('h3', { text: '장기기억 전환 현황' }), boxCard,
      el('h3', { text: '이번 주 vs 지난 주' }), weekCard,
      el('h3', { text: '학습 히트맵' }), heatCard,
      el('h3', { text: '드릴별 정답률 (약한 것부터)' }), drillCard,
      el('h3', { text: '레벨별 정답률' }), lvCard,
      el('h3', { text: '자주 틀리는 단어' }), weakCard,
      el('h3', { text: '성별 오답률 (낮을수록 좋음)' }), gCard,
      el('h3', { text: '복수형 유형별 오답률' }), pcCard,
      el('h3', { text: '뜻 채우기 진척' }), fillCard,
      el('h3', { text: '뜻을 적은 추이 (최근 2주)' }), trendCard,
      el('h3', { text: '뜻 테스트 성적' }), mtTiles, mtCard,
      el('h3', { text: '뜻 테스트에서 자주 틀리는 단어' }), wmCard,
      el('h3', { text: '접두사 동사 — 지금 할 일' }), advCard,
      el('h3', { text: '접두사별 정답률 (약한 것부터)' }), pfxCard,
      el('h3', { text: '의미 투명도별 정답률' }), trCard,
      el('h3', { text: '뜻 ↔ 활용, 어느 쪽이 약한가' }), mgCard,
      el('h3', { text: '앞으로 7일 복습 예정' }), upCard,
      el('h3', { text: '드릴별 진도 (전체)' }), progCard
    ]);
  }


  /**
   * 뜻 채우기 화면의 분해 힌트.
   * 기본 동사 뜻이 아직 없으면 그 사실을 알려 준다 — 먼저 채워야 쓸모가 생긴다.
   */
  function decompHint(e) {
    var P = global.Prefix;
    if (!P) return null;
    var n = P.info(e, WORDS);
    if (!n || !n.base) return null;

    var baseKo = n.baseKo;
    return el('div', { class: 'dhint' }, [
      el('div', { class: 'dhrow' }, [
        el('b', { class: 'dpre', text: n.prefix }),
        el('span', { class: 'dplus', text: '+' }),
        el('span', { class: 'dbase', text: n.base })
      ]),
      el('div', { class: 'dhrow small muted' }, [
        el('span', { class: 'dpre', text: n.prefixData.coreKo }),
        el('span', { class: 'dplus', text: ' ' }),
        el('span', { class: 'dbase', text: baseKo || '(기본 동사 뜻 미입력)' })
      ]),
      el('div', { class: 'muted small', text: n.separable ? '분리동사' : '비분리동사' })
    ]);
  }

  /**
   * 항목 삭제. 원본을 건드리지 않고 표시만 하므로 언제든 되돌릴 수 있다.
   * @param after 지운 뒤 화면을 다시 그리는 함수
   */
  function removeWord(e, after) {
    S.deleteWord(e.id);
    S.saveNow();
    WORDS = loadWords();
    POOL = buildPool();
    lastDeleted = { id: e.id, de: e.de };
    if (after) after();
  }

  var lastDeleted = null;

  /** 방금 지운 것을 되돌리는 줄 — 실수로 눌러도 바로 돌아온다 */
  function undoBar(after) {
    if (!lastDeleted) return null;
    // 이미 되돌렸으면 줄도 사라져야 한다
    if (!S.isDeleted(lastDeleted.id)) { lastDeleted = null; return null; }
    var d = lastDeleted;
    return el('div', { class: 'undobar' }, [
      el('span', { class: 'small', text: '"' + d.de + '" 을(를) 지웠습니다.' }),
      el('button', {
        class: 'linkish', type: 'button', text: '되돌리기',
        onclick: function () {
          S.restoreWord(d.id);
          S.saveNow();
          WORDS = loadWords();
          POOL = buildPool();
          lastDeleted = null;
          if (after) after();
        }
      })
    ]);
  }

  // ---------------------------------------------------------------- 접두사

  var prefixState = { tab: 'explore', prefix: null, base: null, level: '', open: {} };

  function P() { return global.Prefix; }

  var TRANS = {
    high:   { label: '예측 쉬움', cls: 'tr-high' },
    medium: { label: '중간',      cls: 'tr-mid' },
    low:    { label: '개별 암기', cls: 'tr-low' }
  };

  function transBadge(t) {
    var d = TRANS[t];
    if (!d) return el('span', { class: 'tbadge tr-none', text: '미지정' });
    return el('span', { class: 'tbadge ' + d.cls, text: d.label });
  }

  /** 접두사 + 기본 동사를 눈으로 갈라 보여준다 */
  function decomp(nfo) {
    return el('span', { class: 'decomp' }, [
      el('b', { class: 'dpre', text: nfo.prefix }),
      el('span', { class: 'dplus', text: '+' }),
      el('span', { class: 'dbase', text: nfo.base || '—' })
    ]);
  }

  function sepBadge(nfo) {
    return el('span', {
      class: 'sbadge ' + (nfo.separable ? 'sep' : 'insep'),
      text: nfo.separable ? '분리' : '비분리'
    });
  }

  /** 이 드릴들만 모아서 연습 */
  function practice(verbs, drillIds, title) {
    var q = [];
    verbs.forEach(function (e) {
      drillIds.forEach(function (id) {
        var d = Drills.BY_ID[id];
        if (d && d.applies(e)) q.push({ id: e.id, drill: id, entry: e });
      });
    });
    if (!q.length) {
      render([el('h2', { text: title }),
              el('div', { class: 'empty', text: '지금 낼 수 있는 문제가 없습니다.' })]);
      return;
    }
    startSession(global.SRS.shuffle(q).slice(0, 20), title);
  }

  function viewPrefixes() {
    var tabs = el('div', { class: 'subtabs' }, [
      el('button', {
        class: 'subtab' + (prefixState.tab === 'explore' ? ' on' : ''),
        text: '접두사 탐색',
        onclick: function () { prefixState.tab = 'explore'; viewPrefixes(); }
      }),
      el('button', {
        class: 'subtab' + (prefixState.tab === 'family' ? ' on' : ''),
        text: '기본 동사 패밀리',
        onclick: function () { prefixState.tab = 'family'; viewPrefixes(); }
      })
    ]);

    var body = prefixState.tab === 'family'
      ? (prefixState.base ? familyDetail() : familyList())
      : (prefixState.prefix ? prefixDetail() : prefixGrid());

    render([
      el('h2', { text: '접두사 동사' }),
      el('p', { class: 'muted small', text:
        '접두사는 뜻을 만들어 내는 공식이 아니라 기억을 묶는 실마리입니다. ' +
        '얼마나 믿을 수 있는지를 항상 함께 표시합니다.' }),
      tabs
    ].concat(body));
  }

  // ── 접두사 카드 그리드

  var TYPE_SECTIONS = [
    { key: 'separable',   label: '분리 가능', note: '접두어가 문장 끝으로 갑니다' },
    { key: 'inseparable', label: '비분리',    note: '떨어지지 않고 한 낱말로 활용합니다' },
    { key: 'variable',    label: '둘 다 되는 것',
      note: '동사에 따라 갈리고, 그때 뜻도 달라집니다' }
  ];

  function prefixGrid() {
    var counts = P().counts(WORDS);
    var rates = global.Stats.byPrefix(WORDS);
    var rateById = {};
    rates.forEach(function (r) { rateById[r.id] = r; });

    return TYPE_SECTIONS.map(function (sec) {
      var list = P().sortPrefixes(P().PREFIXES.filter(function (x) {
        return x.type === sec.key;
      }));
      var grid = el('div', { class: 'pgrid' }, list.map(function (x) {
        var n = counts[x.id] || 0;
        var r = rateById[x.id];
        return el('button', {
          class: 'pcard' + (x.warning ? ' warn' : ''), type: 'button',
          onclick: function () { prefixState.prefix = x.id; viewPrefixes(); }
        }, [
          el('div', { class: 'phead' }, [
            el('b', { text: x.label }),
            el('span', { class: 'lvl', text: x.level }),
            x.warning ? el('span', { class: 'wmark', text: '주의' }) : null
          ]),
          el('div', { class: 'pcore', text: x.coreKo }),
          el('div', { class: 'muted small', text:
            '동사 ' + n + '개' + (r && r.seen ? '  ·  정답률 ' + pctText(r.rate) : '') })
        ]);
      }));
      return el('div', {}, [
        el('h3', { text: sec.label + ' (' + list.length + ')' }),
        el('p', { class: 'muted small', text: sec.note }),
        grid
      ]);
    });
  }

  // ── 접두사 상세

  function prefixDetail() {
    var x = P().BY_ID[prefixState.prefix];
    var verbs = P().byPrefix(x.id, WORDS);
    if (prefixState.level) {
      verbs = verbs.filter(function (e) {
        return (e.levels || []).indexOf(prefixState.level) >= 0;
      });
    }

    // 예측하기 쉬운 것 / 예외가 많은 것
    var easy = [], hard = [], unknown = [];
    verbs.forEach(function (e) {
      var t = P().info(e, WORDS).transparency;
      if (t === 'high') easy.push(e);
      else if (t === 'low') hard.push(e);
      else if (t === 'medium') easy.push(e);
      else unknown.push(e);
    });

    var back = el('div', { class: 'actions leftish' }, [
      el('button', { class: 'btn ghost', text: '← 접두사 목록',
        onclick: function () { prefixState.prefix = null; viewPrefixes(); } })
    ]);

    var head = el('div', { class: 'card' }, [
      el('div', { class: 'phead big' }, [
        el('b', { text: x.label }),
        el('span', { class: 'sbadge ' + (x.type === 'separable' ? 'sep' :
                     x.type === 'inseparable' ? 'insep' : 'var'),
          text: x.type === 'separable' ? '분리' :
                x.type === 'inseparable' ? '비분리' : '둘 다' }),
        el('span', { class: 'lvl', text: x.level })
      ]),
      el('div', { class: 'pcore big', text: x.coreKo }),
      el('div', { class: 'meanchips' }, x.meaningsKo.map(function (m) {
        return el('span', { class: 'chip', text: m });
      })),
      el('p', { class: 'note', text: x.noteKo }),
      x.warning ? el('p', { class: 'warnbox', text: '주의 — ' + x.warning }) : null
    ]);

    // 문법 3형 — 실제 동사로 보여준다
    var sample = verbs.filter(function (e) {
      var c = P().forConjugation(e, WORDS);
      return c.pp && C.present(c, 'er');
    })[0];
    var gram = el('div', { class: 'card' }, sample ? (function () {
      var c = P().forConjugation(sample, WORDS);
      var n = P().info(sample, WORDS);
      return [
        el('p', { class: 'muted small', text:
          P().bare(sample.de) + ' 로 본 세 가지 형태' }),
        el('div', { class: 'tblwrap' }, [
          el('table', { class: 'ref' }, [
            el('tr', {}, [el('th', { text: '현재 (주문장)' }),
                          el('td', { text: C.mainClause(c, 'er') })]),
            el('tr', {}, [el('th', { text: 'zu 부정사' }),
                          el('td', { text: C.zuInfinitive(c) })]),
            el('tr', {}, [el('th', { text: '과거분사' }),
                          el('td', { text: c.pp })])
          ])
        ]),
        el('p', { class: 'muted small', text: P().ppRule(n) })
      ];
    })() : [el('p', { class: 'muted small', text: '형태를 보여줄 동사가 아직 없습니다.' })]);

    var filters = el('div', { class: 'filters' }, [
      select(['', 'A1', 'A2', 'B1', 'B2'], ['전체 레벨', 'A1', 'A2', 'B1', 'B2'],
             prefixState.level,
             function (v) { prefixState.level = v; viewPrefixes(); })
    ]);

    var actions = el('div', { class: 'actions leftish' }, [
      el('button', { class: 'btn', text: '이 접두사만 연습 (' + verbs.length + '개)',
        onclick: function () {
          practice(verbs, global.PrefixDrills.GRAMMAR.concat(global.PrefixDrills.MEANING),
                   x.label + ' 집중 연습');
        } })
    ]);

    var out = [back, head, el('h3', { text: '문법' }), gram,
               el('h3', { text: '동사 ' + verbs.length + '개' }), filters, actions];

    if (easy.length) {
      out.push(el('p', { class: 'muted small', text: '실마리가 통하는 편' }));
      out.push(verbCard(easy));
    }
    if (hard.length) {
      out.push(el('p', { class: 'muted small', text:
        '예외가 많아 개별로 외워야 하는 것' }));
      out.push(verbCard(hard));
    }
    if (unknown.length) {
      out.push(el('p', { class: 'muted small', text:
        '아직 뜻을 안 적은 것 — 채우면 의미 퀴즈에 들어갑니다' }));
      out.push(verbCard(unknown));
    }
    return out;
  }

  /**
   * 동사 목록. 뜻은 바로 열지 않고 눌러야 나온다 —
   * 먼저 스스로 짐작해 보게 하는 게 이 기능의 요지다.
   */
  function verbCard(list) {
    return el('div', { class: 'card' }, [
      el('div', { class: 'tblwrap' }, [
        el('table', { class: 'list' }, [
          el('tr', {}, [el('th', { text: '동사' }), el('th', { text: '구성' }),
                        el('th', { text: '뜻' }), el('th', { text: '예측' })])
        ].concat(list.map(function (e) { return verbRow(e); })))
      ])
    ]);
  }

  function verbRow(e) {
    var n = P().info(e, WORDS);
    var ms = P().meanings(e, n);
    var open = prefixState.open[e.id];

    var meaningCell;
    if (!ms.length) {
      meaningCell = el('td', {}, [
        el('button', { class: 'linkish', type: 'button', text: '＋ 뜻 적기',
          onclick: function () {
            global.Meanings.state.focusId = e.id;
            go('meanings');
          } })
      ]);
    } else if (open) {
      meaningCell = el('td', {}, [
        el('b', { text: ms[0] }),
        ms.length > 1 ? el('span', { class: 'muted small', text: '  / ' + ms.slice(1).join(' / ') }) : null,
        n.literalKo ? el('div', { class: 'lit', text: '직역: ' + n.literalKo }) : null
      ]);
    } else {
      meaningCell = el('td', {}, [
        el('button', { class: 'linkish', type: 'button', text: '뜻 보기',
          onclick: function () { prefixState.open[e.id] = true; viewPrefixes(); } })
      ]);
    }

    return el('tr', {}, [
      el('td', {}, [el('b', { text: P().bare(e.de) }), ' ', sepBadge(n)]),
      el('td', { class: 'muted small' }, [decomp(n)]),
      meaningCell,
      el('td', {}, [transBadge(n.transparency)])
    ]);
  }

  // ── 기본 동사 패밀리

  function familyList() {
    var fams = P().families(WORDS, 3);
    return [
      el('p', { class: 'muted small', text:
        '기본 동사 하나에 딸린 파생어를 나란히 놓고 비교합니다. ' +
        '따로 외우던 것들이 한 덩어리가 됩니다.' }),
      el('div', { class: 'pgrid' }, fams.map(function (f) {
        return el('button', {
          class: 'pcard', type: 'button',
          onclick: function () { prefixState.base = f.base; viewPrefixes(); }
        }, [
          el('div', { class: 'phead' }, [el('b', { text: f.base })]),
          el('div', { class: 'pcore', text: P().baseMeaning(null, f.base) || '뜻 미입력' }),
          el('div', { class: 'muted small', text: '파생어 ' + f.verbs.length + '개' })
        ]);
      }))
    ];
  }

  function familyDetail() {
    var base = prefixState.base;
    var verbs = P().family(base, WORDS);
    var baseKo = P().baseMeaning(null, base);

    var rows = verbs.map(function (e) {
      var n = P().info(e, WORDS);
      var ms = P().meanings(e, n);
      var card = S.getCard(e.id, 'pfxMeaning');
      var seen = card && card.seen;
      return el('tr', {}, [
        el('td', {}, [el('b', { text: P().bare(e.de) })]),
        // 실제 뜻이 먼저다. 직역은 회색 보조.
        el('td', {}, ms.length
          ? [el('b', { text: ms[0] }),
             ms.length > 1 ? el('span', { class: 'muted small', text: ' / ' + ms[1] }) : null]
          : [el('span', { class: 'muted small', text: '뜻 미입력' })]),
        el('td', { class: 'lit', text: n.literalKo || '—' }),
        el('td', {}, [transBadge(n.transparency)]),
        el('td', {}, [sepBadge(n)]),
        el('td', { class: 'rt muted small', text:
          seen ? pctText(card.right / card.seen) : '—' })
      ]);
    });

    return [
      el('div', { class: 'actions leftish' }, [
        el('button', { class: 'btn ghost', text: '← 기본 동사 목록',
          onclick: function () { prefixState.base = null; viewPrefixes(); } })
      ]),
      el('h3', { text: base + (baseKo ? '  =  ' + baseKo : '') }),
      el('div', { class: 'actions leftish' }, [
        el('button', { class: 'btn', text: '이 계열만 연습 (' + verbs.length + '개)',
          onclick: function () {
            practice(verbs, global.PrefixDrills.GRAMMAR.concat(global.PrefixDrills.MEANING),
                     base + ' 계열 집중');
          } })
      ]),
      el('div', { class: 'card' }, [
        el('div', { class: 'tblwrap' }, [
          el('table', { class: 'list' }, [
            el('tr', {}, [el('th', { text: '동사' }), el('th', { text: '실제 뜻' }),
                          el('th', { text: '추론 힌트 (직역)' }), el('th', { text: '예측' }),
                          el('th', { text: '분리' }), el('th', { text: '정답률' })])
          ].concat(rows))
        ]),
        el('p', { class: 'muted small', text:
          '직역은 기억을 돕는 실마리일 뿐입니다. "예측"이 낮은 것은 직역을 믿지 말고 ' +
          '개별 어휘로 외우세요.' })
      ])
    ];
  }

  // ---------------------------------------------------------------- 설정

  function viewSettings() {
    var st = S.settings();

    function checkbox(label, key, sub) {
      return el('label', { class: 'row' }, [
        el('input', { type: 'checkbox', checked: st[key] ? 'checked' : null,
          onchange: function (e) { S.setSetting(key, e.target.checked); } }),
        el('span', {}, [label, sub ? el('span', { class: 'muted small', text: '  ' + sub }) : null])
      ]);
    }

    function multi(key, vals, labels) {
      var box = el('div', {});
      vals.forEach(function (v, i) {
        box.appendChild(el('label', { class: 'row' }, [
          el('input', {
            type: 'checkbox', checked: st[key].indexOf(v) >= 0 ? 'checked' : null,
            onchange: function (e) {
              var cur = S.settings()[key].slice();
              if (e.target.checked) { if (cur.indexOf(v) < 0) cur.push(v); }
              else cur = cur.filter(function (x) { return x !== v; });
              S.setSetting(key, cur);
            }
          }),
          el('span', { text: labels[i] })
        ]));
      });
      return box;
    }

    render([
      el('h2', { text: '설정' }),

      el('h3', { text: '표 표기' }),
      el('div', { class: 'card' }, [
        checkbox('격 순서를 독일 교재식으로 (Nom · Akk · Dat · Gen)', 'germanOrder',
                 '끄면 주격 · 소유격 · 여격 · 목적격 순서'),
        checkbox('명사 소문자를 오답 처리', 'strictCase',
                 '끄면 경고만 표시하고 정답으로 인정'),
        checkbox('성별 색상 표시 (der 파랑 / die 빨강 / das 초록)', 'genderColors')
      ]),

      el('h3', { text: '학습 범위' }),
      el('div', { class: 'card' }, [
        el('p', { class: 'muted small', text: '레벨' }),
        multi('levels', ['A1', 'A2', 'B1', 'B2'], ['A1', 'A2', 'B1', 'B2']),
        el('p', { class: 'muted small', text: '품사' }),
        multi('pos', ['noun', 'verb', 'adj', 'function'],
                     ['명사', '동사', '형용사/부사', '기능어']),
        el('p', { class: 'muted small', text: '문법 규칙' }),
        multi('pos', ['prep', 'conn', 'comp', 'vcase', 'vprep'],
                     ['전치사 격지배', '접속사 어순', '비교급·최상급',
                      '동사 격지배', '전치사격 보충어'])
      ]),

      el('h3', { text: '드릴 종류' }),
      el('div', { class: 'card' }, [drillPicker()]),

      el('h3', { text: '하루 신규 개수' }),
      el('div', { class: 'card' }, [
        el('input', { type: 'text', value: String(st.newPerDay),
          onchange: function (e) {
            var v = parseInt(e.target.value, 10);
            if (v > 0) S.setSetting('newPerDay', v);
          } }),
        el('p', { class: 'muted small', text:
          '많이 넣으면 며칠 뒤 복습이 몰립니다. 15~30 정도를 권합니다.' })
      ]),

      el('h3', { text: '기기 간 동기화' }),
      syncCard(),

      el('h3', { text: '백업' }),
      el('div', { class: 'card' }, [
        el('div', { class: 'actions' }, [
          el('button', { class: 'btn ghost', text: '기록 내려받기', onclick: downloadBackup }),
          el('button', { class: 'btn ghost', text: '기록 불러오기', onclick: uploadBackup }),
          el('button', { class: 'btn ghost', text: '전체 초기화', onclick: function () {
            if (confirm('학습 기록을 모두 지웁니다. 계속할까요?')) { S.reset(); go('home'); }
          } })
        ]),
        el('p', { class: 'muted small', text:
          '브라우저 데이터를 지우면 기록이 사라집니다. 가끔 내려받아 두세요.' })
      ])
    ]);
  }

  function drillPicker() {
    var st = S.settings();
    var box = el('div', {});
    box.appendChild(el('label', { class: 'row' }, [
      el('input', { type: 'checkbox', checked: st.drills === null ? 'checked' : null,
        onchange: function (e) {
          S.setSetting('drills', e.target.checked ? null : Drills.ALL.map(function (d) { return d.id; }));
          POOL = buildPool(); viewSettings();
        } }),
      el('b', { text: '전체 사용' })
    ]));
    if (st.drills === null) return box;
    Drills.ALL.forEach(function (d) {
      box.appendChild(el('label', { class: 'row' }, [
        el('input', { type: 'checkbox', checked: st.drills.indexOf(d.id) >= 0 ? 'checked' : null,
          onchange: function (e) {
            var cur = S.settings().drills.slice();
            if (e.target.checked) { if (cur.indexOf(d.id) < 0) cur.push(d.id); }
            else cur = cur.filter(function (x) { return x !== d.id; });
            S.setSetting('drills', cur);
          } }),
        el('span', {}, [d.label, el('span', { class: 'muted small', text: '  ' + d.part })])
      ]));
    });
    return box;
  }

  /**
   * 동기화 설정.
   * data/config.js 가 없으면 안내만 보여주고 기능은 꺼진 채로 둔다.
   */
  function syncCard() {
    var Sy = global.Sync;
    if (!Sy) return el('div', { class: 'card' }, [
      el('p', { class: 'muted small', text: 'sync.js 를 불러오지 못했습니다.' })
    ]);

    var box = el('div', { class: 'card' });

    function paint() {
      clear(box);

      if (!Sy.configured()) {
        box.appendChild(el('p', { text: '동기화가 설정되지 않았습니다 — 이 기기에만 저장됩니다.' }));
        box.appendChild(el('p', { class: 'muted small', text:
          'data/config.example.js 를 data/config.js 로 복사하고 Supabase 주소와 키를 넣으면 ' +
          '켜집니다. 방법은 그 파일 맨 위 주석에 있습니다.' }));
        return;
      }

      var st = Sy.state;
      var label = { off: '꺼짐', idle: '동기화됨', syncing: '동기화 중…',
                    error: '오류', offline: '오프라인' }[st.status] || st.status;

      box.appendChild(el('div', { class: 'syncstat' }, [
        el('span', { class: 'dot ' + st.status }),
        el('b', { text: label }),
        st.message ? el('span', { class: 'muted small', text: '  ' + st.message }) : null,
        st.lastPull ? el('span', { class: 'muted small',
          text: '  · 마지막 ' + new Date(st.lastPull).toLocaleTimeString() }) : null
      ]));

      var codeIn = el('input', {
        type: 'text', value: Sy.getCode() || '', spellcheck: 'false',
        placeholder: '동기화 코드'
      });

      box.appendChild(el('div', { class: 'meanrow', style: 'margin-top:12px' }, [
        codeIn,
        el('button', { class: 'btn ghost', text: '저장', onclick: function () {
          Sy.setCode(codeIn.value.trim() || null);
          Sy.syncNow().then(paint);
          paint();
        } })
      ]));

      box.appendChild(el('div', { class: 'actions leftish' }, [
        el('button', { class: 'btn', text: '지금 동기화',
          onclick: function () { Sy.syncNow().then(paint); paint(); } }),
        el('button', { class: 'btn ghost', text: '새 코드 만들기', onclick: function () {
          var c = Sy.newCode();
          codeIn.value = c;
          Sy.setCode(c);
          Sy.syncNow().then(paint);
          paint();
        } })
      ]));

      box.appendChild(el('p', { class: 'muted small', text:
        '다른 기기에 같은 코드를 넣으면 진도가 합쳐집니다. 통째로 덮어쓰지 않고 ' +
        '카드마다 최신 기록을 골라 병합하므로, 양쪽에서 공부해도 진도가 사라지지 않습니다.' }));
    }

    paint();
    Sy.on(function () { paint(); });
    return box;
  }

  function downloadBackup() {
    var blob = new Blob([S.exportBackup()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'oeuda-' + S.today() + '.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function uploadBackup() {
    var inp = el('input', { type: 'file', accept: '.json' });
    inp.addEventListener('change', function () {
      var f = inp.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try { S.importBackup(r.result); alert('불러왔습니다.'); go('home'); }
        catch (e) { alert('실패: ' + e.message); }
      };
      r.readAsText(f);
    });
    inp.click();
  }

  // ---------------------------------------------------------------- 라우팅

  var VIEWS = {
    home: viewHome, study: viewStudy, wrong: viewWrong,
    words: viewWords, meanings: viewMeanings, tables: viewTables,
    prefixes: viewPrefixes, stats: viewStats, settings: viewSettings
  };

  function render(nodes) {
    clear(app);
    nodes.forEach(function (n) { if (n) app.appendChild(n); });
  }

  function go(view) {
    session = null;
    document.querySelectorAll('#nav button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-view') === view);
    });
    (VIEWS[view] || viewHome)();
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- 시작

  function init() {
    WORDS = loadWords();
    if (!WORDS.length) {
      app.innerHTML = '<div class="empty">단어 데이터를 찾지 못했습니다.<br>' +
        '<span class="small">tools/build.py 를 실행해 data/*.js 를 만드세요.</span></div>';
      return;
    }
    POOL = buildPool();

    document.querySelectorAll('#nav button').forEach(function (b) {
      b.addEventListener('click', function () { go(b.getAttribute('data-view')); });
    });

    // Enter 로 제출 -> Enter 로 다음. 표 문제는 Tab 으로 칸 이동.
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter') return;
      if (!session || !session.current) return;
      ev.preventDefault();
      if (session.current.answered) { advance(); return; }
      var drill = session.current.drill;
      if (drill.input === 'assemble') {
        var read = session.current.readAssemble;
        submit(read ? read() : '');
      } else if (drill.input === 'table' || drill.input === 'multi') {
        submit(collectKeys(app.querySelector('.answer')));
      } else if (drill.input === 'choice' || drill.input === 'choice3') {
        return;   // 선택형은 클릭/숫자키로
      } else {
        var i = app.querySelector('.answer input[type=text]');
        submit(i ? i.value : '');
      }
    });

    // 선택형은 1/2/3 숫자키로도 답할 수 있게
    document.addEventListener('keydown', function (ev) {
      if (!session || !session.current || session.current.answered) return;
      var drill = session.current.drill;
      if (drill.input !== 'choice' && drill.input !== 'choice3') return;
      var n = parseInt(ev.key, 10);
      if (n >= 1 && n <= session.current.q.choices.length) {
        submit(session.current.q.choices[n - 1]);
      }
    });

    document.addEventListener('focusin', function (ev) {
      if (ev.target.tagName === 'INPUT' && ev.target.type === 'text') lastInput = ev.target;
    });

    // 설정이 바뀌면 어디서 바꿨든 출제 후보를 다시 만든다
    global.onSettingsChanged = function () { POOL = buildPool(); };

    go('home');

    // 동기화가 설정돼 있으면 받아서 병합한 뒤 화면을 다시 그린다
    if (global.Sync && global.Sync.configured()) {
      global.Sync.start().then(function (ok) {
        if (!ok) return;
        WORDS = loadWords();
        POOL = buildPool();
        if (!session) go('home');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
