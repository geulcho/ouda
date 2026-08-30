/*
 * editor.js — 단어 편집 · 검수 · 임포터
 *
 * 앱은 file:// 로 돌아 디스크에 못 쓴다. 그래서
 *   고친 내용 / 추가한 단어 -> localStorage
 *   영구 보관 -> "data 파일로 내보내기" 로 .js 를 받아 data/ 에 덮어쓴다
 *
 * 검수가 필요한 이유: PDF 에서 복수형 표기가 없거나 애매했던 항목이 남아 있다.
 * tools/out/review.txt 와 같은 것을 앱 안에서 바로 고칠 수 있게 한다.
 */
(function (global) {
  'use strict';

  var S = global.Store;

  /** 검수 대상 — 파서가 확신하지 못한 항목 */
  function needsReview(e) {
    if (e.pos !== 'noun') return false;
    if (!e.gender) return true;
    if (!e.plural && !e.noPlural && !e.pluralOnly) return true;   // 복수형 미상
    if (e.nDekl === null) return true;                            // n-변화 미판정
    return false;
  }

  // 뜻은 Goethe 원문에 없다. 품사와 무관하게 언제나 직접 넣을 수 있어야 한다.
  var MEANING_FIELDS = [
    { key: 'ko', label: '뜻 (한국어)', type: 'text', ph: '사과' },
    { key: 'en', label: '뜻 (영어)', type: 'text', ph: 'apple' }
  ];

  /** 편집 가능한 항목 목록 (품사별로 다르다) */
  function fieldsFor(e) {
    if (e.pos === 'noun') {
      return MEANING_FIELDS.concat([
        { key: 'gender', label: '성', type: 'select',
          options: [['m', 'der (남성)'], ['f', 'die (여성)'], ['n', 'das (중성)']] },
        { key: 'plural', label: '복수형', type: 'text', ph: '예: Äpfel' },
        { key: 'genSg',  label: '2격 단수 어미', type: 'select',
          options: [['s', '-s'], ['es', '-es'], ['', '없음 (여성)']] },
        { key: 'nDekl',  label: 'n-변화 명사', type: 'bool' },
        { key: 'adjNoun',label: '형용사변화 명사', type: 'bool' },
        { key: 'noPlural', label: '복수 없음 (단수전용)', type: 'bool' },
        { key: 'pluralOnly', label: '복수전용', type: 'bool' }
      ]);
    }
    if (e.pos === 'verb') {
      return MEANING_FIELDS.concat([
        { key: 'pres3', label: '현재 3인칭', type: 'text', ph: 'fährt' },
        { key: 'praet', label: '과거', type: 'text', ph: 'fuhr' },
        { key: 'pp',    label: '과거분사', type: 'text', ph: 'gefahren' },
        { key: 'aux',   label: '완료 조동사', type: 'select',
          options: [['haben', 'haben'], ['sein', 'sein'], ['haben/sein', '둘 다']] },
        { key: 'separable', label: '분리동사', type: 'bool' },
        { key: 'prefix', label: '분리 접두어', type: 'text', ph: 'ein' },
        { key: 'reflexive', label: '재귀동사', type: 'bool' },
        { key: 'irregular', label: '불규칙', type: 'bool' }
      ]);
    }
    return MEANING_FIELDS.concat([
      { key: 'comp', label: '비교급', type: 'text' },
      { key: 'sup',  label: '최상급', type: 'text' }
    ]);
  }

  // ---------------------------------------------------------------- 임포터

  /**
   * 붙여넣은 단어 목록을 파싱한다. 여러 형식을 알아서 알아본다.
   *   der Apfel, -¨          Äpfel
   *   die Ansage, -n
   *   fahren, fährt, fuhr, ist gefahren
   *   {"de":"Apfel","gender":"m",...}
   */
  function parseImport(text) {
    text = String(text || '').trim();
    if (!text) return { rows: [], errors: [] };

    // JSON 배열이면 그대로
    if (text[0] === '[') {
      try {
        var arr = JSON.parse(text);
        return { rows: arr.map(normRow).filter(Boolean), errors: [] };
      } catch (e) {
        return { rows: [], errors: ['JSON 형식이 아닙니다: ' + e.message] };
      }
    }

    var rows = [], errors = [];
    text.split(/\r?\n/).forEach(function (line, i) {
      line = line.trim();
      if (!line || line[0] === '#') return;
      // 탭 / 세미콜론 / 쉼표 두 칸 이상 공백으로 나뉜 열 형식도 받는다
      var cols = line.split(/\t|\s{2,}|;/).map(function (c) { return c.trim(); })
                     .filter(Boolean);
      var head = cols[0];
      var r = parseHead(head);
      if (!r) { errors.push((i + 1) + '행: 알아볼 수 없음 — ' + line); return; }
      // 두 번째 열이 있으면 복수형 또는 예문으로 본다
      if (cols[1]) {
        if (r.pos === 'noun' && !r.plural && /^[A-ZÄÖÜ]/.test(cols[1])) r.plural = cols[1];
        else r.ex = [{ de: cols.slice(1).join(' '), lvl: '추가' }];
      }
      rows.push(r);
    });
    return { rows: rows, errors: errors };
  }

  var ART = { der: 'm', die: 'f', das: 'n' };

  function parseHead(h) {
    h = h.replace(/\s+/g, ' ').trim();

    // 수 표기는 쉼표 없이 붙기도 한다: "die Eltern (pl.)" "das Obst (Sg.)"
    // 먼저 떼어 두어야 아래 명사 정규식이 걸린다.
    var pluralOnly = /\((nur\s+)?(pl|Pl)(ural)?\.?\)/.test(h);
    var singOnly = /\((Sg|Sing|Singular)\.?\)/.test(h);
    if (pluralOnly || singOnly) {
      h = h.replace(/\((nur\s+)?(pl|Pl|Sg|Sing|Singular)(ural)?\.?\)/g, '')
           .replace(/\s+/g, ' ').trim().replace(/,$/, '').trim();
    }

    // 명사: "der Apfel, -¨" / "die Ansage, -n"
    var m = h.match(/^(der|die|das)\s+([A-ZÄÖÜ][\wäöüßÄÖÜ-]*)\s*(?:,\s*(.*))?$/);
    if (m) {
      var e = {
        pos: 'noun', de: m[2], gender: ART[m[1]],
        plural: null, pluralClass: '', noPlural: false, pluralOnly: false,
        nDekl: false, adjNoun: false, levels: ['추가'], ex: [], en: '', ko: ''
      };
      e.genSg = e.gender === 'f' ? '' : (/(s|ß|x|z|sch|st)$/.test(e.de) ? 'es' : 's');
      if (pluralOnly) { e.pluralOnly = true; e.plural = e.de; e.pluralClass = 'pl.'; }
      else if (singOnly) { e.noPlural = true; e.pluralClass = 'Sg.'; }
      else if (m[3]) applyPluralMarker(e, m[3].trim());
      else e.noPlural = true;
      e.id = e.de.toLowerCase().replace(/ß/g, 'ss');
      return e;
    }

    // 동사: "fahren, fährt, fuhr, ist gefahren"
    if (/^[a-zäöüß(]/.test(h) && /,/.test(h)) {
      var parts = h.split(',').map(function (p) { return p.trim(); }).filter(Boolean);
      var v = { pos: 'verb', de: parts[0].replace(/^sich\s+/, ''),
                reflexive: /^sich\s/.test(parts[0]),
                pres3: null, praet: null, pp: null, aux: null,
                separable: false, prefix: null, irregular: null,
                levels: ['추가'], ex: [], en: '', ko: '' };
      var rest = parts.slice(1), perfI = -1;
      rest.forEach(function (p, i) { if (/^(hat|ist)\b/.test(p)) perfI = i; });
      if (perfI >= 0) {
        var toks = rest[perfI].split(' ');
        v.aux = toks[0] === 'hat' ? 'haben' : 'sein';
        v.pp = toks.slice(1).join(' ') || null;
        rest = rest.slice(0, perfI);
      }
      if (rest[0]) v.pres3 = rest[0];
      if (rest[1]) v.praet = rest[1];
      if (v.pres3 && v.pres3.indexOf(' ') > 0) {
        v.separable = true;
        v.prefix = v.pres3.split(' ').pop();
      }
      v.id = v.de.toLowerCase().replace(/ß/g, 'ss');
      return v;
    }

    // 그 밖: 형용사/부사로
    if (/^[a-zäöüß]/.test(h) && h.length > 1) {
      return { pos: 'adj', de: h, levels: ['추가'], ex: [], en: '', ko: '',
               id: h.toLowerCase().replace(/ß/g, 'ss') };
    }
    return null;
  }

  function applyPluralMarker(e, marker) {
    // 수 표기를 먼저 본다. 지역 표기부터 벗기면 '(pl.)' 이 통째로 사라진다.
    if (/\((nur\s+)?(pl|Pl)(ural)?\.?\)/.test(marker) || /^pl\.?$/i.test(marker)) {
      e.pluralOnly = true; e.plural = e.de; e.pluralClass = 'pl.'; return;
    }
    if (/\((Sg|Sing|Singular)\.?\)/.test(marker)) {
      e.noPlural = true; e.plural = null; e.pluralClass = 'Sg.'; return;
    }
    marker = marker.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (!marker || marker === '-' || marker === '–') {
      e.plural = e.de; e.pluralClass = '-'; return;
    }
    // 완전한 복수형을 그대로 쓴 경우
    if (/^[A-ZÄÖÜ]/.test(marker)) { e.plural = marker; e.pluralClass = '형태제시'; return; }

    var uml = marker.indexOf('¨') >= 0;
    var suf = marker.replace(/[¨\-,\s]/g, '');
    var base = uml ? umlaut(e.de) : e.de;
    if (suf.charAt(0) === 'e' && /e$/.test(base)) suf = suf.slice(1);
    e.plural = base + suf;
    e.pluralClass = (uml ? '¨' : '') + '-' + suf;
  }

  function umlaut(stem) {
    var low = stem.toLowerCase(), best = -1, v = null, end = -1;
    ['au', 'a', 'o', 'u'].forEach(function (x) {
      var i = low.lastIndexOf(x);
      if (i < 0) return;
      var e2 = i + x.length;
      if (e2 > end || (e2 === end && x.length > v.length)) { best = i; v = x; end = e2; }
    });
    if (best < 0) return stem;
    var rep = { au: 'äu', a: 'ä', o: 'ö', u: 'ü' }[v];
    if (stem[best] === stem[best].toUpperCase()) rep = rep[0].toUpperCase() + rep.slice(1);
    return stem.slice(0, best) + rep + stem.slice(best + v.length);
  }

  function normRow(o) {
    if (!o || !o.de) return null;
    o.id = o.id || o.de.toLowerCase().replace(/ß/g, 'ss');
    o.pos = o.pos || 'noun';
    o.levels = o.levels || ['추가'];
    o.ex = o.ex || [];
    return o;
  }

  /** data/*.js 형식으로 내보내기 (덮어쓰면 영구 보관된다) */
  function exportData(list, varname) {
    var out = '// 자동 생성 — 앱의 내보내기로 만들었습니다.\n' +
              'window.' + varname + ' = [\n';
    list.forEach(function (r) { out += JSON.stringify(r) + ',\n'; });
    return out + '];\n';
  }

  /*
   * 원문 PDF 에서 잘못 딸려 온 항목인가.
   *
   * A1~B1 단어장에는 오스트리아·스위스 표기 안내("→D, A: Friseur")나 참고문헌 줄이
   * 섞여 있고, 파서가 이것을 낱말로 읽어 버린 것이 151개 있다. 거의 다 형용사로 분류됐다.
   *
   * 판정은 '확실히 깨진 표시'만 본다. Geschwindigkeitsbeschränkung 처럼 길기만 한 것,
   * Pommes frites 처럼 두 낱말인 것은 멀쩡한 낱말이므로 건드리지 않는다.
   * 어디까지나 후보를 모아 주는 것이고, 지우는 것은 언제나 사람이 정한다.
   */
  // PDF 에서 뽑아 온 품사만 대상이다. 문법·어순 항목은 손으로 쓴 것이라
  // 문장에 마침표가 있는 게 정상이고, 여기 걸리면 안 된다.
  var FROM_PDF = { noun: 1, verb: 1, adj: 1, 'function': 1 };

  function looksBroken(e) {
    if (!FROM_PDF[e.pos]) return false;
    var d = String(e.de || '');
    if (!d) return true;
    return /[()0-9→←;:]/.test(d)   // 괄호 · 숫자 · 화살표 · 콜론
        || /[.]/.test(d)            // 마침표
        || /,/.test(d)              // 쉼표
        || /^[-\/]/.test(d)         // - 나 / 로 시작
        || /\s{2,}/.test(d);        // 공백이 뭉쳐 있음
  }

  global.Editor = {
    looksBroken: looksBroken,
    needsReview: needsReview,
    fieldsFor: fieldsFor,
    parseImport: parseImport,
    parseHead: parseHead,
    exportData: exportData,
    umlaut: umlaut
  };
})(window);
