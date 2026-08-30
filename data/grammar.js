/*
 * grammar.js — 손으로 작성한 문법 데이터
 *
 * Goethe 단어장에 없는 정보다. 전부 폐쇄 집합이라 직접 쓰는 편이 정확하다.
 *   PREP_CASES       전치사 격지배           (목차 7-1 ~ 7-4)
 *   CONNECTORS       접속사 어순 3분류        (목차 9-1, 10-x)
 *   COMPARATIVES     불규칙 비교급            (목차 8-2)
 *   VERB_CASES       동사 격지배              (목차 4-4)
 *   VERB_PREPS       전치사격 보충어          (목차 14-3)
 *
 * 자동 생성물이 아니므로 build.py 가 덮어쓰지 않는다.
 */

/* ---------------------------------------------------------------- 전치사 격지배 */

window.PREP_CASES = [
  // 3격 지배 — 통째로 외우는 게 빠르다
  { de: 'aus',        kase: 'D', ko: '~에서(부터), ~로 만든', ex: 'Ich komme aus Korea.' },
  { de: 'bei',        kase: 'D', ko: '~ 곁에, ~ 집에', ex: 'Ich wohne bei meinen Eltern.' },
  { de: 'mit',        kase: 'D', ko: '~와 함께, ~로(수단)', ex: 'Ich fahre mit dem Bus.' },
  { de: 'nach',       kase: 'D', ko: '~ 후에, ~로(지명)', ex: 'Nach dem Essen gehe ich.' },
  { de: 'seit',       kase: 'D', ko: '~ 이래로', ex: 'Seit einem Jahr lerne ich Deutsch.' },
  { de: 'von',        kase: 'D', ko: '~로부터, ~의', ex: 'Das ist ein Geschenk von meiner Mutter.' },
  { de: 'zu',         kase: 'D', ko: '~에게로', ex: 'Ich gehe zum Arzt.' },
  { de: 'gegenüber',  kase: 'D', ko: '~ 맞은편에', ex: 'Die Bank liegt gegenüber dem Bahnhof.' },
  { de: 'ab',         kase: 'D', ko: '~부터(시점)', ex: 'Ab nächstem Monat arbeite ich hier.' },
  { de: 'außer',      kase: 'D', ko: '~를 제외하고', ex: 'Außer mir war niemand da.' },
  { de: 'entgegen',   kase: 'D', ko: '~에 반하여', ex: 'Entgegen meinem Rat ging er.' },
  { de: 'entsprechend', kase: 'D', ko: '~에 상응하여', ex: 'Entsprechend dem Plan…' },

  // 4격 지배
  { de: 'durch',      kase: 'A', ko: '~를 통과하여, ~에 의해', ex: 'Wir gehen durch den Park.' },
  { de: 'für',        kase: 'A', ko: '~를 위하여', ex: 'Das ist für dich.' },
  { de: 'gegen',      kase: 'A', ko: '~에 반대하여, ~쯤', ex: 'Ich bin gegen diesen Plan.' },
  { de: 'ohne',       kase: 'A', ko: '~ 없이', ex: 'Ohne dich gehe ich nicht.' },
  { de: 'um',         kase: 'A', ko: '~ 둘레에, ~시에', ex: 'Wir treffen uns um acht Uhr.' },
  { de: 'bis',        kase: 'A', ko: '~까지', ex: 'Bis nächsten Montag!' },
  { de: 'entlang',    kase: 'A', ko: '~를 따라 (명사 뒤에)', ex: 'Wir gehen den Fluss entlang.' },
  { de: 'wider',      kase: 'A', ko: '~에 거슬러', ex: 'wider Erwarten' },

  // 3·4격 지배 — Wo? 는 3격, Wohin? 는 4격 (목차 7-2의 핵심)
  { de: 'an',      kase: 'W', ko: '~에 접하여', wo: 'Das Bild hängt an der Wand.', wohin: 'Ich hänge das Bild an die Wand.' },
  { de: 'auf',     kase: 'W', ko: '~ 위에(접촉)', wo: 'Das Buch liegt auf dem Tisch.', wohin: 'Ich lege das Buch auf den Tisch.' },
  { de: 'hinter',  kase: 'W', ko: '~ 뒤에', wo: 'Der Garten ist hinter dem Haus.', wohin: 'Ich gehe hinter das Haus.' },
  { de: 'in',      kase: 'W', ko: '~ 안에', wo: 'Ich bin in der Schule.', wohin: 'Ich gehe in die Schule.' },
  { de: 'neben',   kase: 'W', ko: '~ 옆에', wo: 'Er sitzt neben mir.', wohin: 'Setz dich neben mich!' },
  { de: 'über',    kase: 'W', ko: '~ 위에(비접촉)', wo: 'Die Lampe hängt über dem Tisch.', wohin: 'Ich hänge die Lampe über den Tisch.' },
  { de: 'unter',   kase: 'W', ko: '~ 아래에', wo: 'Die Katze liegt unter dem Bett.', wohin: 'Die Katze läuft unter das Bett.' },
  { de: 'vor',     kase: 'W', ko: '~ 앞에', wo: 'Ich warte vor dem Kino.', wohin: 'Ich stelle mich vor das Kino.' },
  { de: 'zwischen',kase: 'W', ko: '~ 사이에', wo: 'Er sitzt zwischen den Stühlen.', wohin: 'Er setzt sich zwischen die Stühle.' },

  // 2격 지배 (목차 7-4)
  { de: 'während',  kase: 'G', ko: '~하는 동안', ex: 'Während des Studiums arbeitete ich.' },
  { de: 'trotz',    kase: 'G', ko: '~에도 불구하고', ex: 'Trotz des starken Regens gehe ich spazieren.' },
  { de: 'wegen',    kase: 'G', ko: '~ 때문에', ex: 'Wegen des Wetters bleiben wir zu Hause.' },
  { de: 'statt',    kase: 'G', ko: '~ 대신에', ex: 'Statt eines Briefes schrieb er eine Mail.' },
  { de: 'anstatt',  kase: 'G', ko: '~ 대신에', ex: 'Anstatt des Autos nahm er das Rad.' },
  { de: 'außerhalb',kase: 'G', ko: '~ 밖에', ex: 'Außerhalb der Stadt ist es ruhig.' },
  { de: 'innerhalb',kase: 'G', ko: '~ 안에, ~ 이내에', ex: 'Innerhalb einer Woche antworte ich.' },
  { de: 'oberhalb', kase: 'G', ko: '~ 위쪽에', ex: 'Oberhalb des Dorfes liegt eine Burg.' },
  { de: 'unterhalb',kase: 'G', ko: '~ 아래쪽에', ex: 'Unterhalb des Fensters steht ein Tisch.' },
  { de: 'aufgrund', kase: 'G', ko: '~에 근거하여', ex: 'Aufgrund des Unfalls kam er zu spät.' },
  { de: 'anhand',   kase: 'G', ko: '~를 근거로', ex: 'Anhand der Daten sieht man das.' },
  { de: 'angesichts', kase: 'G', ko: '~를 감안하면', ex: 'Angesichts der Lage…' },
  { de: 'bezüglich',kase: 'G', ko: '~에 관하여', ex: 'Bezüglich Ihrer Anfrage…' },
  { de: 'hinsichtlich', kase: 'G', ko: '~ 관점에서', ex: 'Hinsichtlich der Kosten…' },
  { de: 'infolge',  kase: 'G', ko: '~의 결과로', ex: 'Infolge des Sturms fiel der Strom aus.' },
  { de: 'mittels',  kase: 'G', ko: '~를 수단으로', ex: 'Mittels eines Schlüssels…' },
  { de: 'seitens',  kase: 'G', ko: '~ 측에서', ex: 'Seitens der Firma gab es keine Antwort.' },
  { de: 'zugunsten',kase: 'G', ko: '~에게 유리하게', ex: 'Zugunsten der Kinder…' }
];

window.CASE_LABEL = {
  D: '3격 (Dativ)',
  A: '4격 (Akkusativ)',
  G: '2격 (Genitiv)',
  W: '3·4격 (Wechselpräposition)',
  N: '1격 (Nominativ)'
};

/* ---------------------------------------------------------------- 접속사 어순 */

/*
 * 독일어 문장 구조에서 제일 자주 틀리는 지점.
 * 접속사가 어느 부류인지에 따라 동사 위치가 셋으로 갈린다.
 *
 *   정치 (Position 0)  : 접속사가 자리를 안 먹는다   … , und ich gehe nach Hause.
 *   도치 (Position 1)  : 접속사가 1번 자리를 먹어 주어가 동사 뒤로  … , deshalb gehe ich …
 *   후치 (Endstellung) : 동사가 종속절 끝으로        … , weil ich müde bin.
 */
window.CONNECTORS = [
  // 정치 — 등위접속사 (nebenordnend, Position 0)
  { de: 'und',     type: 'main',  ko: '그리고',       ex: 'Ich lerne Deutsch und ich arbeite.' },
  { de: 'aber',    type: 'main',  ko: '그러나',       ex: 'Ich will nicht, aber ich muss.' },
  { de: 'oder',    type: 'main',  ko: '또는',         ex: 'Kommst du oder bleibst du?' },
  { de: 'denn',    type: 'main',  ko: '왜냐하면',     ex: 'Ich bleibe, denn ich bin krank.' },
  { de: 'sondern', type: 'main',  ko: '~가 아니라',   ex: 'Nicht heute, sondern morgen komme ich.' },

  // 후치 — 종속접속사 (unterordnend, 동사 문장 끝)
  { de: 'dass',    type: 'sub',   ko: '~라는 것',     ex: 'Ich weiß, dass er kommt.' },
  { de: 'weil',    type: 'sub',   ko: '~ 때문에',     ex: 'Sie bleibt zu Hause, weil sie krank ist.' },
  { de: 'da',      type: 'sub',   ko: '~이므로',      ex: 'Da es regnet, bleiben wir hier.' },
  { de: 'wenn',    type: 'sub',   ko: '~할 때/~라면', ex: 'Wenn ich Zeit habe, komme ich.' },
  { de: 'als',     type: 'sub',   ko: '~했을 때(1회)', ex: 'Als ich 18 war, war ich in Berlin.' },
  { de: 'ob',      type: 'sub',   ko: '~인지 아닌지', ex: 'Ich weiß nicht, ob ich helfen kann.' },
  { de: 'obwohl',  type: 'sub',   ko: '~임에도',      ex: 'Sie arbeitet weiter, obwohl sie müde ist.' },
  { de: 'damit',   type: 'sub',   ko: '~하기 위하여', ex: 'Ich gebe ihm Geld, damit er sich Schuhe kauft.' },
  { de: 'bevor',   type: 'sub',   ko: '~하기 전에',   ex: 'Bevor ich gehe, rufe ich an.' },
  { de: 'nachdem', type: 'sub',   ko: '~한 후에',     ex: 'Nachdem ich gegessen hatte, ging ich.' },
  { de: 'seitdem', type: 'sub',   ko: '~한 이래로',   ex: 'Seitdem er hier wohnt, ist es lauter.' },
  { de: 'sobald',  type: 'sub',   ko: '~하자마자',    ex: 'Sobald ich ankomme, melde ich mich.' },
  { de: 'solange', type: 'sub',   ko: '~하는 한',     ex: 'Solange es regnet, bleiben wir.' },
  { de: 'während', type: 'sub',   ko: '~하는 동안 / 반면', ex: 'Während er schläft, arbeite ich.' },
  { de: 'bis',     type: 'sub',   ko: '~할 때까지',   ex: 'Warte, bis ich fertig bin.' },
  { de: 'falls',   type: 'sub',   ko: '~인 경우',     ex: 'Falls es regnet, bleiben wir hier.' },
  { de: 'indem',   type: 'sub',   ko: '~함으로써',    ex: 'Man lernt, indem man übt.' },
  { de: 'sodass',  type: 'sub',   ko: '그래서 ~하다', ex: 'Es regnete, sodass wir blieben.' },
  { de: 'sofern',  type: 'sub',   ko: '~하는 한',     ex: 'Sofern es möglich ist, komme ich.' },
  { de: 'wohingegen', type: 'sub',ko: '~인 반면',     ex: 'Er ist laut, wohingegen sie leise ist.' },
  { de: 'ohne dass',  type: 'sub',ko: '~하지 않고',   ex: 'Er ging, ohne dass er sich verabschiedete.' },
  { de: 'anstatt dass', type: 'sub', ko: '~하는 대신', ex: 'Anstatt dass er hilft, schaut er zu.' },

  // 도치 — 접속부사 (Verbindungsadverb, 1번 자리를 먹는다)
  { de: 'deshalb',    type: 'adv', ko: '그래서',     ex: 'Ich bin krank. Deshalb komme ich nicht.' },
  { de: 'deswegen',   type: 'adv', ko: '그래서',     ex: 'Es regnet. Deswegen bleiben wir hier.' },
  { de: 'daher',      type: 'adv', ko: '그러므로',   ex: 'Er war müde. Daher ging er früh.' },
  { de: 'darum',      type: 'adv', ko: '그래서',     ex: 'Darum sage ich das.' },
  { de: 'trotzdem',   type: 'adv', ko: '그럼에도',   ex: 'Sie ist müde. Trotzdem arbeitet sie weiter.' },
  { de: 'dennoch',    type: 'adv', ko: '그럼에도',   ex: 'Es war teuer. Dennoch kaufte er es.' },
  { de: 'außerdem',   type: 'adv', ko: '게다가',     ex: 'Außerdem habe ich keine Zeit.' },
  { de: 'jedoch',     type: 'adv', ko: '하지만',     ex: 'Jedoch war es zu spät.' },
  { de: 'allerdings', type: 'adv', ko: '다만',       ex: 'Allerdings ist es teuer.' },
  { de: 'sonst',      type: 'adv', ko: '그렇지 않으면', ex: 'Beeil dich, sonst kommst du zu spät.' },
  { de: 'stattdessen',type: 'adv', ko: '그 대신',    ex: 'Stattdessen nahm er den Bus.' },
  { de: 'folglich',   type: 'adv', ko: '따라서',     ex: 'Folglich müssen wir warten.' },
  { de: 'dann',       type: 'adv', ko: '그 다음에',  ex: 'Dann gehen wir nach Hause.' },
  { de: 'danach',     type: 'adv', ko: '그 후에',    ex: 'Danach trinken wir Kaffee.' },
  { de: 'inzwischen', type: 'adv', ko: '그 사이에',  ex: 'Inzwischen ist er angekommen.' },
  { de: 'also',       type: 'adv', ko: '그러니까',   ex: 'Also gehen wir jetzt.' }
];

window.CONNECTOR_TYPE = {
  main: { label: '정치 — 동사 그대로 2번째',  sub: '접속사가 자리를 차지하지 않습니다',
          hint: '…, und ich gehe nach Hause.' },
  adv:  { label: '도치 — 주어가 동사 뒤로',   sub: '접속부사가 1번 자리를 먹습니다',
          hint: '…, deshalb gehe ich nach Hause.' },
  sub:  { label: '후치 — 동사가 문장 끝',     sub: '종속접속사는 동사를 끝으로 보냅니다',
          hint: '…, weil ich nach Hause gehe.' }
};

/* ---------------------------------------------------------------- 불규칙 비교급 */

window.COMPARATIVES = [
  // 완전 불규칙 — 통째로 외운다
  { de: 'gut',   comp: 'besser',  sup: 'besten',   ko: '좋은',   irregular: true },
  { de: 'viel',  comp: 'mehr',    sup: 'meisten',  ko: '많은',   irregular: true },
  { de: 'gern',  comp: 'lieber',  sup: 'liebsten', ko: '기꺼이', irregular: true },
  { de: 'hoch',  comp: 'höher',   sup: 'höchsten', ko: '높은',   irregular: true },
  { de: 'nah',   comp: 'näher',   sup: 'nächsten', ko: '가까운', irregular: true },
  { de: 'groß',  comp: 'größer',  sup: 'größten',  ko: '큰',     irregular: true },

  // 움라우트가 붙는 1음절 형용사
  { de: 'alt',    comp: 'älter',    sup: 'ältesten',   ko: '늙은/오래된' },
  { de: 'jung',   comp: 'jünger',   sup: 'jüngsten',   ko: '젊은' },
  { de: 'lang',   comp: 'länger',   sup: 'längsten',   ko: '긴' },
  { de: 'kurz',   comp: 'kürzer',   sup: 'kürzesten',  ko: '짧은' },
  { de: 'warm',   comp: 'wärmer',   sup: 'wärmsten',   ko: '따뜻한' },
  { de: 'kalt',   comp: 'kälter',   sup: 'kältesten',  ko: '추운' },
  { de: 'stark',  comp: 'stärker',  sup: 'stärksten',  ko: '강한' },
  { de: 'schwach',comp: 'schwächer',sup: 'schwächsten',ko: '약한' },
  { de: 'hart',   comp: 'härter',   sup: 'härtesten',  ko: '단단한' },
  { de: 'scharf', comp: 'schärfer', sup: 'schärfsten', ko: '날카로운/매운' },
  { de: 'arm',    comp: 'ärmer',    sup: 'ärmsten',    ko: '가난한' },
  { de: 'klug',   comp: 'klüger',   sup: 'klügsten',   ko: '똑똑한' },
  { de: 'dumm',   comp: 'dümmer',   sup: 'dümmsten',   ko: '어리석은' },
  { de: 'krank',  comp: 'kränker',  sup: 'kränksten',  ko: '아픈' },
  { de: 'grob',   comp: 'gröber',   sup: 'gröbsten',   ko: '거친' },

  // -el / -er / -euer 로 끝나면 비교급에서 e 가 떨어진다
  { de: 'teuer',  comp: 'teurer',   sup: 'teuersten',  ko: '비싼',   note: 'e 탈락' },
  { de: 'dunkel', comp: 'dunkler',  sup: 'dunkelsten', ko: '어두운', note: 'e 탈락' },
  { de: 'edel',   comp: 'edler',    sup: 'edelsten',   ko: '고귀한', note: 'e 탈락' },
  { de: 'sauer',  comp: 'saurer',   sup: 'sauersten',  ko: '신',     note: 'e 탈락' }
];

/* ---------------------------------------------------------------- 동사 격지배 */

/*
 * 목차 4-4. 한국어에 대응이 없어서 제일 많이 틀리는 부분이다.
 * 특히 3격 지배 동사는 통째로 외우는 수밖에 없다.
 */
window.VERB_CASES = [
  // 3격만 취하는 동사 (Verben mit Dativ)
  { de: 'helfen',     kase: 'D', ko: '돕다',       ex: 'Können Sie mir bitte helfen?' },
  { de: 'danken',     kase: 'D', ko: '감사하다',   ex: 'Ich danke dir.' },
  { de: 'gefallen',   kase: 'D', ko: '마음에 들다', ex: 'Das Buch gefällt mir.' },
  { de: 'gehören',    kase: 'D', ko: '~의 것이다', ex: 'Das Auto gehört meinem Bruder.' },
  { de: 'antworten',  kase: 'D', ko: '대답하다',   ex: 'Er antwortet mir nicht.' },
  { de: 'glauben',    kase: 'D', ko: '(사람을) 믿다', ex: 'Ich glaube dir.' },
  { de: 'folgen',     kase: 'D', ko: '따르다',     ex: 'Folgen Sie mir bitte!' },
  { de: 'passen',     kase: 'D', ko: '어울리다',   ex: 'Der Termin passt mir gut.' },
  { de: 'schmecken',  kase: 'D', ko: '맛이 좋다',  ex: 'Das Essen schmeckt mir.' },
  { de: 'begegnen',   kase: 'D', ko: '마주치다',   ex: 'Ich bin ihm gestern begegnet.' },
  { de: 'fehlen',     kase: 'D', ko: '없다/그립다', ex: 'Du fehlst mir.' },
  { de: 'gratulieren',kase: 'D', ko: '축하하다',   ex: 'Ich gratuliere dir zum Geburtstag.' },
  { de: 'zuhören',    kase: 'D', ko: '경청하다',   ex: 'Hör mir bitte zu!' },
  { de: 'vertrauen',  kase: 'D', ko: '신뢰하다',   ex: 'Ich vertraue dir.' },
  { de: 'widersprechen', kase: 'D', ko: '반박하다', ex: 'Er widerspricht mir immer.' },
  { de: 'zustimmen',  kase: 'D', ko: '동의하다',   ex: 'Ich stimme dir zu.' },
  { de: 'schaden',    kase: 'D', ko: '해를 끼치다', ex: 'Rauchen schadet der Gesundheit.' },
  { de: 'gelingen',   kase: 'D', ko: '성공하다',   ex: 'Es ist mir gelungen.' },
  { de: 'leidtun',    kase: 'D', ko: '유감이다',   ex: 'Es tut mir leid.' },
  { de: 'wehtun',     kase: 'D', ko: '아프다',     ex: 'Mein Arm tut mir weh.' },

  // 3격 + 4격 (Verben mit Dativ und Akkusativ)
  { de: 'geben',      kase: 'DA', ko: '주다',      ex: 'Ich habe ihm ein Buch gegeben.' },
  { de: 'zeigen',     kase: 'DA', ko: '보여주다',  ex: 'Ich zeige meinem Gast die Stadt.' },
  { de: 'schenken',   kase: 'DA', ko: '선물하다',  ex: 'Sie schenkt ihm eine Uhr.' },
  { de: 'erklären',   kase: 'DA', ko: '설명하다',  ex: 'Er erklärt uns die Regel.' },
  { de: 'empfehlen',  kase: 'DA', ko: '추천하다',  ex: 'Können Sie mir ein Hotel empfehlen?' },
  { de: 'schicken',   kase: 'DA', ko: '보내다',    ex: 'Ich schicke dir eine Mail.' },
  { de: 'leihen',     kase: 'DA', ko: '빌려주다',  ex: 'Leihst du mir dein Auto?' },
  { de: 'erzählen',   kase: 'DA', ko: '이야기하다', ex: 'Er erzählt uns eine Geschichte.' },
  { de: 'bringen',    kase: 'DA', ko: '가져다주다', ex: 'Bring mir bitte ein Glas Wasser!' },
  { de: 'kaufen',     kase: 'DA', ko: '사주다',    ex: 'Ich kaufe meinem Sohn ein Fahrrad.' },

  // 2격 지배 (드물지만 시험에 나온다)
  { de: 'bedürfen',   kase: 'G', ko: '필요로 하다', ex: 'Das bedarf einer Erklärung.' },
  { de: 'gedenken',   kase: 'G', ko: '추모하다',   ex: 'Wir gedenken der Opfer.' },
  { de: 'sich erinnern', kase: 'G', ko: '기억하다 (문어)', ex: 'Ich erinnere mich seiner.' }
];

/* ---------------------------------------------------------------- 전치사격 보충어 */

/*
 * 목차 14-3. 동사마다 붙는 전치사와 격이 정해져 있다.
 * 'denken an + 4격' 처럼 통째로 한 덩어리로 외워야 한다.
 */
window.VERB_PREPS = [
  { de: 'denken',            prep: 'an',    kase: 'A', ko: '~를 생각하다',   ex: 'Ich denke oft an dich.' },
  { de: 'sich erinnern',     prep: 'an',    kase: 'A', ko: '~를 기억하다',   ex: 'Ich erinnere mich an den Tag.' },
  { de: 'sich gewöhnen',     prep: 'an',    kase: 'A', ko: '~에 익숙해지다', ex: 'Ich gewöhne mich an das Wetter.' },
  { de: 'glauben',           prep: 'an',    kase: 'A', ko: '~를 믿다',       ex: 'Sie glaubt an das Gute.' },
  { de: 'teilnehmen',        prep: 'an',    kase: 'D', ko: '~에 참가하다',   ex: 'Er nimmt an dem Kurs teil.' },
  { de: 'leiden',            prep: 'an',    kase: 'D', ko: '~를 앓다',       ex: 'Sie leidet an einer Allergie.' },
  { de: 'arbeiten',          prep: 'an',    kase: 'D', ko: '~에 매진하다',   ex: 'Ich arbeite an einem Projekt.' },

  { de: 'warten',            prep: 'auf',   kase: 'A', ko: '~를 기다리다',   ex: 'Ich warte auf den Bus.' },
  { de: 'sich freuen',       prep: 'auf',   kase: 'A', ko: '~를 고대하다',   ex: 'Ich freue mich auf die Ferien.' },
  { de: 'achten',            prep: 'auf',   kase: 'A', ko: '~에 유의하다',   ex: 'Achten Sie auf die Aussprache!' },
  { de: 'antworten',         prep: 'auf',   kase: 'A', ko: '~에 답하다',     ex: 'Er antwortet auf die Frage.' },
  { de: 'sich verlassen',    prep: 'auf',   kase: 'A', ko: '~를 신뢰하다',   ex: 'Ich verlasse mich auf dich.' },
  { de: 'sich vorbereiten',  prep: 'auf',   kase: 'A', ko: '~를 준비하다',   ex: 'Ich bereite mich auf die Prüfung vor.' },
  { de: 'verzichten',        prep: 'auf',   kase: 'A', ko: '~를 포기하다',   ex: 'Ich verzichte auf den Nachtisch.' },
  { de: 'aufpassen',         prep: 'auf',   kase: 'A', ko: '~를 돌보다',     ex: 'Pass auf die Kinder auf!' },
  { de: 'sich beziehen',     prep: 'auf',   kase: 'A', ko: '~와 관련되다',   ex: 'Das bezieht sich auf Ihren Brief.' },

  { de: 'sich freuen',       prep: 'über',  kase: 'A', ko: '~를 기뻐하다 (이미 일어난 일)', ex: 'Ich freue mich über das Geschenk.' },
  { de: 'sprechen',          prep: 'über',  kase: 'A', ko: '~에 대해 말하다', ex: 'Wir sprechen über das Wetter.' },
  { de: 'sich ärgern',       prep: 'über',  kase: 'A', ko: '~에 화내다',     ex: 'Ich ärgere mich über den Lärm.' },
  { de: 'nachdenken',        prep: 'über',  kase: 'A', ko: '~를 숙고하다',   ex: 'Ich denke über den Plan nach.' },
  { de: 'sich beschweren',   prep: 'über',  kase: 'A', ko: '~에 항의하다',   ex: 'Er beschwert sich über den Service.' },
  { de: 'sich informieren',  prep: 'über',  kase: 'A', ko: '~를 알아보다',   ex: 'Ich informiere mich über den Kurs.' },
  { de: 'lachen',            prep: 'über',  kase: 'A', ko: '~를 비웃다',     ex: 'Sie lachen über den Witz.' },
  { de: 'sich beklagen',     prep: 'über',  kase: 'A', ko: '~를 불평하다',   ex: 'Er beklagt sich über die Arbeit.' },

  { de: 'sich interessieren',prep: 'für',   kase: 'A', ko: '~에 관심이 있다', ex: 'Ich interessiere mich für Musik.' },
  { de: 'sich entscheiden',  prep: 'für',   kase: 'A', ko: '~로 결정하다',   ex: 'Ich entscheide mich für den blauen Mantel.' },
  { de: 'sich bedanken',     prep: 'für',   kase: 'A', ko: '~에 감사하다',   ex: 'Ich bedanke mich für Ihre Hilfe.' },
  { de: 'sich entschuldigen',prep: 'für',   kase: 'A', ko: '~를 사과하다',   ex: 'Ich entschuldige mich für die Verspätung.' },
  { de: 'sorgen',            prep: 'für',   kase: 'A', ko: '~를 돌보다',     ex: 'Sie sorgt für ihre Eltern.' },
  { de: 'halten',            prep: 'für',   kase: 'A', ko: '~로 여기다',     ex: 'Ich halte ihn für ehrlich.' },

  { de: 'sich kümmern',      prep: 'um',    kase: 'A', ko: '~를 돌보다',     ex: 'Ich kümmere mich um den Hund.' },
  { de: 'bitten',            prep: 'um',    kase: 'A', ko: '~를 부탁하다',   ex: 'Ich bitte Sie um Hilfe.' },
  { de: 'sich bewerben',     prep: 'um',    kase: 'A', ko: '~에 지원하다',   ex: 'Er bewirbt sich um die Stelle.' },
  { de: 'sich handeln',      prep: 'um',    kase: 'A', ko: '~에 관한 것이다', ex: 'Es handelt sich um ein Missverständnis.' },
  { de: 'sich sorgen',       prep: 'um',    kase: 'A', ko: '~를 걱정하다',   ex: 'Ich sorge mich um dich.' },

  { de: 'sich beschäftigen', prep: 'mit',   kase: 'D', ko: '~에 몰두하다',   ex: 'Ich beschäftige mich mit Politik.' },
  { de: 'anfangen',          prep: 'mit',   kase: 'D', ko: '~를 시작하다',   ex: 'Wir fangen mit der Arbeit an.' },
  { de: 'aufhören',          prep: 'mit',   kase: 'D', ko: '~를 그만두다',   ex: 'Er hört mit dem Rauchen auf.' },
  { de: 'rechnen',           prep: 'mit',   kase: 'D', ko: '~를 예상하다',   ex: 'Wir rechnen mit Regen.' },
  { de: 'sich unterhalten',  prep: 'mit',   kase: 'D', ko: '~와 대화하다',   ex: 'Ich unterhalte mich mit ihr.' },
  { de: 'telefonieren',      prep: 'mit',   kase: 'D', ko: '~와 통화하다',   ex: 'Ich telefoniere mit meiner Mutter.' },
  { de: 'vergleichen',       prep: 'mit',   kase: 'D', ko: '~와 비교하다',   ex: 'Vergleichen Sie A mit B!' },

  { de: 'sich fürchten',     prep: 'vor',   kase: 'D', ko: '~를 두려워하다', ex: 'Ich fürchte mich vor Hunden.' },
  { de: 'Angst haben',       prep: 'vor',   kase: 'D', ko: '~가 무섭다',     ex: 'Er hat Angst vor der Prüfung.' },
  { de: 'warnen',            prep: 'vor',   kase: 'D', ko: '~를 경고하다',   ex: 'Sie warnt mich vor dem Hund.' },
  { de: 'schützen',          prep: 'vor',   kase: 'D', ko: '~로부터 보호하다', ex: 'Die Creme schützt vor der Sonne.' },

  { de: 'sich bemühen',      prep: 'um',    kase: 'A', ko: '~를 애쓰다',     ex: 'Ich bemühe mich um eine Lösung.' },
  { de: 'gehören',           prep: 'zu',    kase: 'D', ko: '~에 속하다',     ex: 'Das gehört zu meinen Aufgaben.' },
  { de: 'einladen',          prep: 'zu',    kase: 'D', ko: '~에 초대하다',   ex: 'Ich lade dich zu meiner Party ein.' },
  { de: 'führen',            prep: 'zu',    kase: 'D', ko: '~로 이어지다',   ex: 'Das führt zu Problemen.' },
  { de: 'passen',            prep: 'zu',    kase: 'D', ko: '~와 어울리다',   ex: 'Die Hose passt zu dem Hemd.' },
  { de: 'zwingen',           prep: 'zu',    kase: 'D', ko: '~를 강요하다',   ex: 'Niemand zwingt dich zu dieser Arbeit.' },

  { de: 'träumen',           prep: 'von',   kase: 'D', ko: '~를 꿈꾸다',     ex: 'Ich träume von einem Haus.' },
  { de: 'abhängen',          prep: 'von',   kase: 'D', ko: '~에 달려 있다',  ex: 'Das hängt vom Wetter ab.' },
  { de: 'erzählen',          prep: 'von',   kase: 'D', ko: '~에 대해 말하다', ex: 'Er erzählt von seiner Reise.' },
  { de: 'sich verabschieden',prep: 'von',   kase: 'D', ko: '~에게 작별하다', ex: 'Ich verabschiede mich von euch.' },
  { de: 'sich erholen',      prep: 'von',   kase: 'D', ko: '~에서 회복하다', ex: 'Er erholt sich von der Krankheit.' },

  { de: 'sich bewerben',     prep: 'bei',   kase: 'D', ko: '~에 지원하다',   ex: 'Ich bewerbe mich bei der Firma.' },
  { de: 'sich bedanken',     prep: 'bei',   kase: 'D', ko: '~에게 감사하다', ex: 'Ich bedanke mich bei Ihnen.' },
  { de: 'sich entschuldigen',prep: 'bei',   kase: 'D', ko: '~에게 사과하다', ex: 'Entschuldige dich bei ihm!' },
  { de: 'helfen',            prep: 'bei',   kase: 'D', ko: '~를 도와주다',   ex: 'Er hilft mir bei den Hausaufgaben.' },

  { de: 'sich streiten',     prep: 'über',  kase: 'A', ko: '~로 다투다',     ex: 'Sie streiten sich über Geld.' },
  { de: 'sich verlieben',    prep: 'in',    kase: 'A', ko: '~와 사랑에 빠지다', ex: 'Er hat sich in sie verliebt.' },
  { de: 'bestehen',          prep: 'aus',   kase: 'D', ko: '~로 이루어지다', ex: 'Das Team besteht aus fünf Leuten.' },
  { de: 'sich ergeben',      prep: 'aus',   kase: 'D', ko: '~에서 나오다',   ex: 'Daraus ergibt sich ein Problem.' }
];
