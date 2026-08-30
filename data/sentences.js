/*
 * sentences.js — 어순 학습용 문장 (성분 라벨)
 *
 * 낱말이 아니라 '문장성분(Satzglied)' 단위로 적는다.
 * V2 가 "두 번째 낱말"이 아니라 "두 번째 성분"이기 때문이다.
 *   Vor der Abfahrt | rufe | ich | an.     ← 네 낱말짜리 성분이 앞자리
 *
 * src: 'GZB2' 는 Goethe-Zertifikat B2 Modellsatz (2025) 에서 가져온 실제 시험 문장.
 *      'Aspekte' 는 Aspekte neu B2 어휘목록의 용례.
 *      나머지는 규칙을 고르게 덮으려고 직접 쓴 문장.
 *
 * 역할: S 주어 · V 정동사 · Vend 문장끝동사부 · Te Ka Mo Lo 부사구
 *       Dat Akk 목적어(명사) · DatP AkkP 목적어(대명사) · Neg nicht
 *       Präd 술어 · Konj 종속접속사 · W 의문사
 */
window.SENTENCES = [

  /* ---------------------------------------------------------------- V2 기본 */

  { id: 'v2-01', type: 'main', teaches: ['V2'], chunks: [
    { t: 'Ich', role: 'S' }, { t: 'gehe', role: 'V' },
    { t: 'morgen', role: 'Te' }, { t: 'ins Kino', role: 'Lo' } ] },

  { id: 'v2-02', type: 'main', teaches: ['V2'], chunks: [
    { t: 'Wir', role: 'S' }, { t: 'treffen', role: 'V' },
    { t: 'uns', role: 'AkkP' }, { t: 'um acht', role: 'Te' } ] },

  { id: 'v2-03', type: 'main', teaches: ['V2'], src: 'GZB2', chunks: [
    { t: 'Meine Einzimmerwohnung', role: 'S' }, { t: 'ist', role: 'V' },
    { t: 'fast leer', role: 'Präd' } ] },

  { id: 'v2-04', type: 'main', teaches: ['V2'], chunks: [
    { t: 'Der Zug', role: 'S' }, { t: 'fährt', role: 'V' },
    { t: 'in zehn Minuten', role: 'Te' }, { t: 'ab', role: 'Vend' } ] },

  /* -------------------------------------------- V2 — 주어가 아닌 것이 앞자리 */

  { id: 'v2-10', type: 'main', teaches: ['V2', 'Vorfeld'], src: 'GZB2', chunks: [
    { t: 'Einen Kühlschrank', role: 'Akk' }, { t: 'brauche', role: 'V' },
    { t: 'ich', role: 'S' }, { t: 'nicht', role: 'Neg' } ] },

  { id: 'v2-11', type: 'main', teaches: ['V2', 'Vorfeld', 'Satzklammer'], src: 'GZB2', chunks: [
    { t: 'Erdbeeren und Salat', role: 'Akk' }, { t: 'pflanze', role: 'V' },
    { t: 'ich', role: 'S' }, { t: 'auf dem Balkon', role: 'Lo' },
    { t: 'an', role: 'Vend' } ] },

  { id: 'v2-12', type: 'main', teaches: ['V2', 'Vorfeld'], src: 'GZB2', chunks: [
    { t: 'Wegen des Verkehrs', role: 'Ka' }, { t: 'benutze', role: 'V' },
    { t: 'ich', role: 'S' }, { t: 'oft', role: 'Mo' }, { t: 'das Rad', role: 'Akk' } ] },

  { id: 'v2-13', type: 'main', teaches: ['V2', 'Vorfeld', 'Satzklammer'], src: 'GZB2', chunks: [
    { t: 'Für meine Reisen', role: 'Ka' }, { t: 'habe', role: 'V' },
    { t: 'ich', role: 'S' }, { t: 'ein Wohnmobil', role: 'Akk' } ] },

  { id: 'v2-14', type: 'main', teaches: ['V2', 'Vorfeld', 'Satzklammer'], src: 'GZB2', chunks: [
    { t: 'Auf Reisen', role: 'Lo' }, { t: 'will', role: 'V' },
    { t: 'ich', role: 'S' }, { t: 'Neues', role: 'Akk' },
    { t: 'entdecken', role: 'Vend' } ] },

  { id: 'v2-15', type: 'main', teaches: ['V2', 'Vorfeld', 'Satzklammer'], src: 'GZB2', chunks: [
    { t: 'Auch als Veganer', role: 'Mo' }, { t: 'kann', role: 'V' },
    { t: 'man', role: 'S' }, { t: 'genussvoll', role: 'Mo' },
    { t: 'essen', role: 'Vend' } ] },

  { id: 'v2-16', type: 'main', teaches: ['V2', 'Vorfeld'], src: 'GZB2', chunks: [
    { t: 'Zu einem guten Steak', role: 'Ka' }, { t: 'sage', role: 'V' },
    { t: 'ich', role: 'S' }, { t: 'nie', role: 'Te' }, { t: 'nein', role: 'Akk' } ] },

  { id: 'v2-17', type: 'main', teaches: ['V2', 'Vorfeld', 'Satzklammer'], src: 'GZB2', chunks: [
    { t: 'In der heutigen Gesellschaft', role: 'Lo' }, { t: 'wird', role: 'V' },
    { t: 'leider', role: 'Mo' }, { t: 'konsumiert', role: 'Vend' } ] },

  { id: 'v2-18', type: 'main', teaches: ['V2', 'Vorfeld'], chunks: [
    { t: 'Vor der Abfahrt', role: 'Te' }, { t: 'rufe', role: 'V' },
    { t: 'ich', role: 'S' }, { t: 'an', role: 'Vend' } ] },

  { id: 'v2-19', type: 'main', teaches: ['V2', 'Vorfeld'], chunks: [
    { t: 'Diesen Film', role: 'Akk' }, { t: 'habe', role: 'V' },
    { t: 'ich', role: 'S' }, { t: 'schon', role: 'Te' },
    { t: 'gesehen', role: 'Vend' } ] },

  { id: 'v2-20', type: 'main', teaches: ['V2', 'Vorfeld'], chunks: [
    { t: 'Am Wochenende', role: 'Te' }, { t: 'bleiben', role: 'V' },
    { t: 'wir', role: 'S' }, { t: 'zu Hause', role: 'Lo' } ] },

  /* ---------------------------------------------- Satzklammer — 분리동사 */

  { id: 'sk-01', type: 'main', teaches: ['Satzklammer'], chunks: [
    { t: 'Ich', role: 'S' }, { t: 'rufe', role: 'V' },
    { t: 'dich', role: 'AkkP' }, { t: 'später', role: 'Te' },
    { t: 'an', role: 'Vend' } ] },

  { id: 'sk-02', type: 'main', teaches: ['Satzklammer'], chunks: [
    { t: 'Sie', role: 'S' }, { t: 'steht', role: 'V' },
    { t: 'jeden Morgen', role: 'Te' }, { t: 'früh', role: 'Mo' },
    { t: 'auf', role: 'Vend' } ] },

  { id: 'sk-03', type: 'main', teaches: ['Satzklammer'], chunks: [
    { t: 'Der Kurs', role: 'S' }, { t: 'fängt', role: 'V' },
    { t: 'nächste Woche', role: 'Te' }, { t: 'an', role: 'Vend' } ] },

  { id: 'sk-04', type: 'main', teaches: ['Satzklammer'], chunks: [
    { t: 'Wir', role: 'S' }, { t: 'räumen', role: 'V' },
    { t: 'am Samstag', role: 'Te' }, { t: 'die Wohnung', role: 'Akk' },
    { t: 'auf', role: 'Vend' } ] },

  /* ---------------------------------------------- Satzklammer — 현재완료 */

  { id: 'sk-10', type: 'main', teaches: ['Satzklammer'], chunks: [
    { t: 'Ich', role: 'S' }, { t: 'habe', role: 'V' },
    { t: 'gestern', role: 'Te' }, { t: 'lange', role: 'Mo' },
    { t: 'gearbeitet', role: 'Vend' } ] },

  { id: 'sk-11', type: 'main', teaches: ['Satzklammer', 'TeKaMoLo'], chunks: [
    { t: 'Wir', role: 'S' }, { t: 'sind', role: 'V' },
    { t: 'letzten Sommer', role: 'Te' }, { t: 'mit dem Auto', role: 'Mo' },
    { t: 'nach Italien', role: 'Lo' }, { t: 'gefahren', role: 'Vend' } ] },

  { id: 'sk-12', type: 'main', teaches: ['Satzklammer'], chunks: [
    { t: 'Er', role: 'S' }, { t: 'hat', role: 'V' },
    { t: 'mir', role: 'DatP' }, { t: 'nicht', role: 'Neg' },
    { t: 'geantwortet', role: 'Vend' } ] },

  { id: 'sk-13', type: 'main', teaches: ['Satzklammer'], chunks: [
    { t: 'Die Firma', role: 'S' }, { t: 'hat', role: 'V' },
    { t: 'im letzten Jahr', role: 'Te' }, { t: 'viele Leute', role: 'Akk' },
    { t: 'eingestellt', role: 'Vend' } ] },

  /* -------------------------------------------- Satzklammer — 화법조동사 */

  { id: 'sk-20', type: 'main', teaches: ['Satzklammer'], chunks: [
    { t: 'Ich', role: 'S' }, { t: 'muss', role: 'V' },
    { t: 'heute', role: 'Te' }, { t: 'noch', role: 'Mo' },
    { t: 'einkaufen', role: 'Vend' } ] },

  { id: 'sk-21', type: 'main', teaches: ['Satzklammer'], chunks: [
    { t: 'Du', role: 'S' }, { t: 'kannst', role: 'V' },
    { t: 'mich', role: 'AkkP' }, { t: 'jederzeit', role: 'Te' },
    { t: 'anrufen', role: 'Vend' } ] },

  { id: 'sk-22', type: 'main', teaches: ['Satzklammer', 'TeKaMoLo'], chunks: [
    { t: 'Man', role: 'S' }, { t: 'sollte', role: 'V' },
    { t: 'vor dem Essen', role: 'Te' }, { t: 'gründlich', role: 'Mo' },
    { t: 'die Hände', role: 'Akk' }, { t: 'waschen', role: 'Vend' } ] },

  { id: 'sk-23', type: 'main', teaches: ['Satzklammer'], chunks: [
    { t: 'Wir', role: 'S' }, { t: 'wollen', role: 'V' },
    { t: 'am Freitag', role: 'Te' }, { t: 'ins Theater', role: 'Lo' },
    { t: 'gehen', role: 'Vend' } ] },

  /* ---------------------------------------------------------- TeKaMoLo */

  { id: 'tk-01', type: 'main', teaches: ['TeKaMoLo'], chunks: [
    { t: 'Ich', role: 'S' }, { t: 'fahre', role: 'V' },
    { t: 'morgen', role: 'Te' }, { t: 'mit dem Zug', role: 'Mo' },
    { t: 'nach Berlin', role: 'Lo' } ] },

  { id: 'tk-02', type: 'main', teaches: ['TeKaMoLo'], chunks: [
    { t: 'Sie', role: 'S' }, { t: 'fährt', role: 'V' },
    { t: 'heute', role: 'Te' }, { t: 'wegen des Streiks', role: 'Ka' },
    { t: 'mit dem Rad', role: 'Mo' }, { t: 'zur Arbeit', role: 'Lo' } ] },

  { id: 'tk-03', type: 'main', teaches: ['TeKaMoLo'], chunks: [
    { t: 'Wir', role: 'S' }, { t: 'treffen', role: 'V' },
    { t: 'uns', role: 'AkkP' }, { t: 'am Montag', role: 'Te' },
    { t: 'im Café', role: 'Lo' } ] },

  { id: 'tk-04', type: 'main', teaches: ['TeKaMoLo', 'Satzklammer'], chunks: [
    { t: 'Er', role: 'S' }, { t: 'ist', role: 'V' },
    { t: 'gestern', role: 'Te' }, { t: 'wegen der Erkältung', role: 'Ka' },
    { t: 'zu Hause', role: 'Lo' }, { t: 'geblieben', role: 'Vend' } ] },

  { id: 'tk-05', type: 'main', teaches: ['TeKaMoLo'], chunks: [
    { t: 'Die Kinder', role: 'S' }, { t: 'spielen', role: 'V' },
    { t: 'nachmittags', role: 'Te' }, { t: 'gern', role: 'Mo' },
    { t: 'im Garten', role: 'Lo' } ] },

  { id: 'tk-06', type: 'main', teaches: ['TeKaMoLo'], chunks: [
    { t: 'Ich', role: 'S' }, { t: 'lerne', role: 'V' },
    { t: 'jeden Abend', role: 'Te' }, { t: 'für die Prüfung', role: 'Ka' },
    { t: 'in der Bibliothek', role: 'Lo' } ] },

  { id: 'tk-07', type: 'main', teaches: ['TeKaMoLo', 'Vorfeld'], chunks: [
    { t: 'Am Wochenende', role: 'Te' }, { t: 'gehen', role: 'V' },
    { t: 'wir', role: 'S' }, { t: 'meistens', role: 'Mo' },
    { t: 'in den Park', role: 'Lo' } ] },

  { id: 'tk-08', type: 'main', teaches: ['TeKaMoLo', 'Satzklammer'], chunks: [
    { t: 'Sie', role: 'S' }, { t: 'hat', role: 'V' },
    { t: 'letzte Woche', role: 'Te' }, { t: 'aus Zeitmangel', role: 'Ka' },
    { t: 'schnell', role: 'Mo' }, { t: 'gepackt', role: 'Vend' } ] },

  /* ------------------------------------------------------- 목적어 순서 */

  { id: 'ob-01', type: 'main', teaches: ['ObjektOrder'], chunks: [
    { t: 'Ich', role: 'S' }, { t: 'gebe', role: 'V' },
    { t: 'dem Mann', role: 'Dat' }, { t: 'das Buch', role: 'Akk' } ] },

  { id: 'ob-02', type: 'main', teaches: ['ObjektOrder'], chunks: [
    { t: 'Ich', role: 'S' }, { t: 'gebe', role: 'V' },
    { t: 'es', role: 'AkkP' }, { t: 'dem Mann', role: 'Dat' } ] },

  { id: 'ob-03', type: 'main', teaches: ['ObjektOrder'], chunks: [
    { t: 'Ich', role: 'S' }, { t: 'gebe', role: 'V' },
    { t: 'es', role: 'AkkP' }, { t: 'ihm', role: 'DatP' } ] },

  { id: 'ob-04', type: 'main', teaches: ['ObjektOrder', 'Satzklammer'], chunks: [
    { t: 'Er', role: 'S' }, { t: 'hat', role: 'V' },
    { t: 'seiner Frau', role: 'Dat' }, { t: 'Blumen', role: 'Akk' },
    { t: 'geschenkt', role: 'Vend' } ] },

  { id: 'ob-05', type: 'main', teaches: ['ObjektOrder', 'PronomenVorn'], chunks: [
    { t: 'Ich', role: 'S' }, { t: 'habe', role: 'V' },
    { t: 'es', role: 'AkkP' }, { t: 'gestern', role: 'Te' },
    { t: 'gekauft', role: 'Vend' } ] },

  { id: 'ob-06', type: 'jaNein', teaches: ['ObjektOrder', 'V1'], chunks: [
    { t: 'Können', role: 'V' }, { t: 'Sie', role: 'S' },
    { t: 'mir', role: 'DatP' }, { t: 'ein Hotel', role: 'Akk' },
    { t: 'empfehlen', role: 'Vend' } ] },

  { id: 'ob-07', type: 'main', teaches: ['ObjektOrder'], chunks: [
    { t: 'Der Lehrer', role: 'S' }, { t: 'erklärt', role: 'V' },
    { t: 'den Schülern', role: 'Dat' }, { t: 'die Regel', role: 'Akk' } ] },

  { id: 'ob-08', type: 'main', teaches: ['ObjektOrder'], chunks: [
    { t: 'Ich', role: 'S' }, { t: 'zeige', role: 'V' },
    { t: 'sie', role: 'AkkP' }, { t: 'meinem Gast', role: 'Dat' } ] },

  /* ----------------------------------------------------------- 종속절 */

  { id: 'sb-01', type: 'sub', teaches: ['V-End'], chunks: [
    { t: 'weil', role: 'Konj' }, { t: 'ich', role: 'S' },
    { t: 'müde', role: 'Präd' }, { t: 'bin', role: 'V' } ] },

  { id: 'sb-02', type: 'sub', teaches: ['V-End', 'Satzklammer'], chunks: [
    { t: 'weil', role: 'Konj' }, { t: 'ich', role: 'S' },
    { t: 'gestern', role: 'Te' }, { t: 'gearbeitet', role: 'Vend' },
    { t: 'habe', role: 'V' } ] },

  { id: 'sb-03', type: 'sub', teaches: ['V-End'], chunks: [
    { t: 'dass', role: 'Konj' }, { t: 'er', role: 'S' },
    { t: 'morgen', role: 'Te' }, { t: 'kommt', role: 'V' } ] },

  { id: 'sb-04', type: 'sub', teaches: ['V-End', 'Satzklammer'], chunks: [
    { t: 'obwohl', role: 'Konj' }, { t: 'sie', role: 'S' },
    { t: 'sehr', role: 'Mo' }, { t: 'müde', role: 'Präd' },
    { t: 'war', role: 'V' } ] },

  { id: 'sb-05', type: 'sub', teaches: ['V-End', 'TeKaMoLo'], chunks: [
    { t: 'wenn', role: 'Konj' }, { t: 'ich', role: 'S' },
    { t: 'morgen', role: 'Te' }, { t: 'Zeit', role: 'Akk' },
    { t: 'habe', role: 'V' } ] },

  { id: 'sb-06', type: 'sub', teaches: ['V-End', 'Satzklammer'], chunks: [
    { t: 'nachdem', role: 'Konj' }, { t: 'wir', role: 'S' },
    { t: 'gegessen', role: 'Vend' }, { t: 'hatten', role: 'V' } ] },

  { id: 'sb-07', type: 'sub', teaches: ['V-End'], chunks: [
    { t: 'damit', role: 'Konj' }, { t: 'er', role: 'S' },
    { t: 'den Zug', role: 'Akk' }, { t: 'erreicht', role: 'V' } ] },

  { id: 'sb-08', type: 'sub', teaches: ['V-End', 'ObjektOrder'], chunks: [
    { t: 'weil', role: 'Konj' }, { t: 'ich', role: 'S' },
    { t: 'es', role: 'AkkP' }, { t: 'ihm', role: 'DatP' },
    { t: 'gesagt', role: 'Vend' }, { t: 'habe', role: 'V' } ] },

  /* ----------------------------------------------------------- 의문문 */

  { id: 'qw-01', type: 'wFrage', teaches: ['V2'], chunks: [
    { t: 'Wann', role: 'W' }, { t: 'kommst', role: 'V' },
    { t: 'du', role: 'S' } ] },

  { id: 'qw-02', type: 'wFrage', teaches: ['V2', 'Satzklammer'], chunks: [
    { t: 'Wann', role: 'W' }, { t: 'hast', role: 'V' },
    { t: 'du', role: 'S' }, { t: 'das', role: 'AkkP' },
    { t: 'gekauft', role: 'Vend' } ] },

  { id: 'qw-03', type: 'wFrage', teaches: ['V2'], chunks: [
    { t: 'Warum', role: 'W' }, { t: 'bist', role: 'V' },
    { t: 'du', role: 'S' }, { t: 'so spät', role: 'Te' } ] },

  { id: 'qj-01', type: 'jaNein', teaches: ['V1'], chunks: [
    { t: 'Kommst', role: 'V' }, { t: 'du', role: 'S' },
    { t: 'morgen', role: 'Te' } ] },

  { id: 'qj-02', type: 'jaNein', teaches: ['V1', 'Satzklammer'], chunks: [
    { t: 'Hast', role: 'V' }, { t: 'du', role: 'S' },
    { t: 'schon', role: 'Te' }, { t: 'gegessen', role: 'Vend' } ] },

  { id: 'qj-03', type: 'jaNein', teaches: ['V1', 'ObjektOrder'], chunks: [
    { t: 'Kannst', role: 'V' }, { t: 'du', role: 'S' },
    { t: 'mir', role: 'DatP' }, { t: 'helfen', role: 'Vend' } ] },

  /* ------------------------------------------------------------- nicht */

  { id: 'ng-01', type: 'main', teaches: ['NichtPos'], chunks: [
    { t: 'Ich', role: 'S' }, { t: 'kenne', role: 'V' },
    { t: 'den Mann', role: 'Akk' }, { t: 'nicht', role: 'Neg' } ] },

  { id: 'ng-02', type: 'main', teaches: ['NichtPos', 'Satzklammer'], chunks: [
    { t: 'Ich', role: 'S' }, { t: 'habe', role: 'V' },
    { t: 'ihn', role: 'AkkP' }, { t: 'nicht', role: 'Neg' },
    { t: 'gesehen', role: 'Vend' } ] },

  { id: 'ng-03', type: 'main', teaches: ['NichtPos'], chunks: [
    { t: 'Das Buch', role: 'S' }, { t: 'ist', role: 'V' },
    { t: 'nicht', role: 'Neg' }, { t: 'interessant', role: 'Präd' } ] },

  { id: 'ng-04', type: 'main', teaches: ['NichtPos', 'Satzklammer'], chunks: [
    { t: 'Ich', role: 'S' }, { t: 'kann', role: 'V' },
    { t: 'heute', role: 'Te' }, { t: 'nicht', role: 'Neg' },
    { t: 'kommen', role: 'Vend' } ] },

  { id: 'ng-05', type: 'main', teaches: ['NichtPos'], chunks: [
    { t: 'Er', role: 'S' }, { t: 'wohnt', role: 'V' },
    { t: 'nicht', role: 'Neg' }, { t: 'in Köln', role: 'Lo' } ] },

  { id: 'ng-06', type: 'main', teaches: ['NichtPos', 'Satzklammer'], chunks: [
    { t: 'Sie', role: 'S' }, { t: 'ruft', role: 'V' },
    { t: 'mich', role: 'AkkP' }, { t: 'nicht', role: 'Neg' },
    { t: 'an', role: 'Vend' } ] },

  /* ------------------------------------------- 실제 시험 문장 (추가 연습) */

  { id: 'gz-01', type: 'main', teaches: ['V2', 'Satzklammer'], src: 'GZB2', chunks: [
    { t: 'Die Personen', role: 'S' }, { t: 'können', role: 'V' },
    { t: 'mehrmals', role: 'Te' }, { t: 'gewählt werden', role: 'Vend' } ] },

  { id: 'gz-02', type: 'main', teaches: ['V2', 'Vorfeld'], src: 'GZB2', chunks: [
    { t: 'Da', role: 'Lo' }, { t: 'erkunde', role: 'V' },
    { t: 'ich', role: 'S' }, { t: 'Länder', role: 'Akk' },
    { t: 'am liebsten', role: 'Mo' } ] },

  { id: 'gz-03', type: 'main', teaches: ['V2', 'Satzklammer'], src: 'GZB2', chunks: [
    { t: 'Bitte', role: 'Mo' }, { t: 'schreiben', role: 'V' },
    { t: 'Sie', role: 'S' }, { t: 'mit einem blauen Stift', role: 'Mo' } ] },

  { id: 'gz-04', type: 'main', teaches: ['V2', 'Vorfeld'], src: 'GZB2', chunks: [
    { t: 'Heute', role: 'Te' }, { t: 'verreist', role: 'V' },
    { t: 'fast jeder', role: 'S' } ] },

  { id: 'gz-05', type: 'main', teaches: ['V2', 'Satzklammer'], src: 'GZB2', chunks: [
    { t: 'Ich', role: 'S' }, { t: 'halte', role: 'V' },
    { t: 'das', role: 'AkkP' }, { t: 'für eine deutsche Debatte', role: 'Mo' } ] },

  { id: 'gz-06', type: 'main', teaches: ['V2'], src: 'Aspekte', chunks: [
    { t: 'Der Film', role: 'S' }, { t: 'wurde', role: 'V' },
    { t: 'in Berlin', role: 'Lo' }, { t: 'gedreht', role: 'Vend' } ] },

  { id: 'gz-07', type: 'main', teaches: ['V2', 'Vorfeld', 'Satzklammer'], src: 'Aspekte', chunks: [
    { t: 'Mit dieser Rolle', role: 'Mo' }, { t: 'gelang', role: 'V' },
    { t: 'ihm', role: 'DatP' }, { t: 'der Durchbruch', role: 'S' } ] }
];
