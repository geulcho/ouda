/*
 * prefixverbs.js — 접두사 동사 시드 (손으로 쓴 파일 · tools/ 재실행에 안 덮인다)
 *
 * 활용형은 여기 넣지 않는다. js/conjugation.js 가 verbs.js 의 pp·praet·separable 로
 * 만들어 내므로 두 군데 적으면 어긋난다.
 *
 *   lemma        필수 — verbs.js 에 실제로 있어야 한다
 *   meanings     필수 — 빈도 높은 것부터. freq: high | mid | low
 *   transparency high   접두사 + 기본 동사로 뜻이 대체로 보인다
 *                medium 중심 이미지는 이어지지만 실제 뜻은 따로 익혀야 한다
 *                low    직역으로 도달할 수 없다. 개별 어휘로 외운다
 *   literalKo    직역 (기억 보조용이지 정답이 아니다). 없으면 null
 *   whyKo        왜 예측 가능한지 / 왜 어려운지 한 줄
 *   prefix/base  자동 분해가 안 되거나 틀릴 때만 적는다 (ge- 계열 등)
 *
 * 늘리는 법: 객체 하나 더 쓰면 된다. lemma 와 meanings 만 있으면 화면이 돈다.
 *            tools/prefix_seed.py 가 뼈대를 뽑아 준다.
 */
window.PREFIXVERBS = [

  // ================================================================ stehen 계열
  {
    lemma: 'aufstehen',
    literalKo: '위로 + 서다',
    meanings: [{ ko: '일어나다, 기상하다', en: 'to get up', freq: 'high' }],
    transparency: 'high',
    whyKo: '"몸을 위로 세운다"가 그대로 뜻이 됩니다. 예측하기 쉬운 편입니다.',
    ex: [{ de: 'Ich stehe jeden Tag um sieben Uhr auf.', ko: '나는 매일 7시에 일어난다.' }],
    confusions: ['anstehen', 'verstehen'],
    warning: null
  },
  {
    lemma: 'verstehen',
    literalKo: '변화·완료 + 서다',
    meanings: [
      { ko: '이해하다, 알아듣다', en: 'to understand', freq: 'high' },
      { ko: '(소리를) 알아듣다', en: 'to catch what is said', freq: 'mid' }
    ],
    transparency: 'low',
    whyKo: '"서다"에서 "이해하다"로 가는 길은 직역으로 보이지 않습니다. ' +
           'ver- 는 갈래가 너무 넓어 실마리가 되지 못합니다. 개별 어휘로 외우세요.',
    ex: [{ de: 'Ich verstehe die Frage nicht.', ko: '나는 그 질문을 이해하지 못한다.' }],
    confusions: ['bestehen', 'entstehen'],
    warning: null
  },
  {
    lemma: 'bestehen',
    literalKo: '대상을 직접 + 서다',
    meanings: [
      { ko: '(시험에) 합격하다', en: 'to pass (an exam)', freq: 'high' },
      { ko: '존재하다, 지속되다', en: 'to exist', freq: 'mid' },
      { ko: 'bestehen aus ~ : ~로 이루어져 있다', en: 'to consist of', freq: 'mid' },
      { ko: 'bestehen auf ~ : ~를 고집하다', en: 'to insist on', freq: 'low' }
    ],
    transparency: 'low',
    whyKo: '뜻이 넷이고 서로 멉니다. 전치사가 뜻을 갈라 놓으므로 ' +
           'bestehen aus / bestehen auf 를 통째로 외우는 편이 빠릅니다.',
    ex: [{ de: 'Ich habe die Prüfung bestanden.', ko: '나는 시험에 합격했다.' },
         { de: 'Das Team besteht aus fünf Personen.', ko: '그 팀은 다섯 명으로 이루어져 있다.' }],
    confusions: ['verstehen', 'entstehen'],
    warning: null
  },
  {
    lemma: 'entstehen',
    literalKo: '벗어남 + 서다',
    meanings: [{ ko: '생겨나다, 발생하다', en: 'to arise, to come into being', freq: 'high' }],
    transparency: 'low',
    whyKo: 'ent- 는 보통 "떼어낸다"인데 여기서는 반대로 "생겨난다"입니다. ' +
           'ent- 의 예외로 따로 기억하세요.',
    ex: [{ de: 'So entstehen Missverständnisse.', ko: '그렇게 해서 오해가 생긴다.' }],
    confusions: ['bestehen', 'entscheiden'],
    warning: null
  },

  // ================================================================ gehen 계열
  {
    lemma: 'ausgehen',
    literalKo: '밖으로 + 가다',
    meanings: [
      { ko: '외출하다, 놀러 나가다', en: 'to go out', freq: 'high' },
      { ko: '(불·전기가) 꺼지다', en: 'to go out (light)', freq: 'mid' },
      { ko: 'ausgehen von ~ : ~를 전제로 하다', en: 'to assume', freq: 'mid' }
    ],
    transparency: 'medium',
    whyKo: '"밖으로 나간다"는 첫 뜻에 그대로 이어집니다. 다만 "꺼지다"는 ' +
           'aus- 의 "끝까지 다 써서 없어진다" 쪽 갈래라 따로 알아야 합니다.',
    ex: [{ de: 'Wir gehen heute Abend aus.', ko: '우리는 오늘 저녁에 놀러 나간다.' },
         { de: 'Plötzlich ging das Licht aus.', ko: '갑자기 불이 꺼졌다.' }],
    confusions: ['eingehen', 'vergehen'],
    warning: null
  },
  {
    lemma: 'eingehen',
    literalKo: '안으로 + 가다',
    meanings: [
      { ko: '(우편물이) 도착하다, 접수되다', en: 'to arrive, to come in', freq: 'mid' },
      { ko: 'eingehen auf ~ : ~에 응하다, ~를 다루다', en: 'to respond to', freq: 'mid' },
      { ko: '(식물·동물이) 죽다', en: 'to die (plant/animal)', freq: 'low' }
    ],
    transparency: 'low',
    whyKo: '"안으로 간다"에서 세 뜻 어디로도 곧장 이어지지 않습니다. ' +
           '실제로는 eingehen auf 형태로 가장 자주 만납니다.',
    ex: [{ de: 'Ihre Bewerbung ist gestern eingegangen.', ko: '당신의 지원서가 어제 접수되었습니다.' },
         { de: 'Er ist auf meine Frage nicht eingegangen.', ko: '그는 내 질문에 응하지 않았다.' }],
    confusions: ['ausgehen', 'einfallen'],
    warning: null
  },
  {
    lemma: 'vergehen',
    literalKo: '소실 + 가다',
    meanings: [{ ko: '(시간이) 지나가다, 흐르다', en: 'to pass (of time)', freq: 'high' }],
    transparency: 'medium',
    whyKo: 'ver- 의 "사라진다" 갈래에 얹으면 "시간이 사라져 간다"로 이어집니다. ' +
           'ver- 치고는 드물게 실마리가 통하는 경우입니다.',
    ex: [{ de: 'Die Zeit vergeht viel zu schnell.', ko: '시간이 너무 빨리 지나간다.' }],
    confusions: ['ausgehen', 'verbringen'],
    warning: null
  },

  // ================================================================ kommen 계열
  {
    lemma: 'ankommen',
    literalKo: '~에 닿음 + 오다',
    meanings: [
      { ko: '도착하다', en: 'to arrive', freq: 'high' },
      { ko: 'ankommen auf ~ : ~에 달려 있다', en: 'to depend on', freq: 'mid' }
    ],
    transparency: 'high',
    whyKo: '"닿아서 온다 → 도착하다"로 잘 이어집니다. ' +
           '다만 es kommt darauf an(그건 상황에 따라 다르다)은 관용구로 외우세요.',
    ex: [{ de: 'Der Zug kommt um acht Uhr an.', ko: '기차는 8시에 도착한다.' }],
    confusions: ['mitkommen', 'bekommen'],
    warning: null
  },
  {
    lemma: 'mitkommen',
    literalKo: '함께 + 오다',
    meanings: [{ ko: '함께 가다, 따라오다', en: 'to come along', freq: 'high' }],
    transparency: 'high',
    whyKo: 'mit- 은 거의 예외 없이 "함께"입니다. 가장 예측하기 쉬운 부류입니다.',
    ex: [{ de: 'Kommst du heute Abend mit?', ko: '너 오늘 저녁에 같이 갈래?' }],
    confusions: ['ankommen', 'mitnehmen'],
    warning: null
  },
  {
    lemma: 'bekommen',
    literalKo: '대상을 직접 + 오다',
    meanings: [{ ko: '받다, 얻다', en: 'to get, to receive', freq: 'high' }],
    transparency: 'low',
    whyKo: '"오다"에서 "받다"로는 직역이 닿지 않습니다. 게다가 영어 become(되다)과 ' +
           '생김새가 같아 더 헷갈립니다 — bekommen 은 "받다"입니다.',
    ex: [{ de: 'Ich habe gestern einen Brief bekommen.', ko: '나는 어제 편지를 한 통 받았다.' }],
    confusions: ['ankommen', 'gehören'],
    warning: 'bekommen 은 "되다(become)"가 아니라 "받다"입니다. "되다"는 werden 입니다.'
  },

  // ================================================================ geben 계열
  {
    lemma: 'aufgeben',
    literalKo: '위로 + 주다',
    meanings: [
      { ko: '포기하다', en: 'to give up', freq: 'high' },
      { ko: '(우편물·짐을) 부치다, 접수시키다', en: 'to hand in, to post', freq: 'mid' },
      { ko: '(숙제를) 내주다', en: 'to assign (homework)', freq: 'mid' }
    ],
    transparency: 'low',
    whyKo: '"위로 주다"라는 직역으로는 "포기하다"가 나오지 않습니다. ' +
           '"손에서 위로 내놓는다 → 놓아버린다"로 이야기를 붙일 수는 있지만, ' +
           '실전에서는 하나의 독립 어휘로 확실히 외워야 합니다.',
    ex: [{ de: 'Gib nicht so schnell auf!', ko: '그렇게 빨리 포기하지 마!' },
         { de: 'Ich muss noch ein Paket aufgeben.', ko: '나는 소포를 하나 더 부쳐야 한다.' }],
    confusions: ['ausgeben', 'zurückgeben'],
    warning: null
  },
  {
    lemma: 'ausgeben',
    literalKo: '밖으로 + 주다',
    meanings: [
      { ko: '(돈을) 쓰다, 지출하다', en: 'to spend (money)', freq: 'high' },
      { ko: '나눠 주다, 발급하다', en: 'to hand out, to issue', freq: 'mid' }
    ],
    transparency: 'medium',
    whyKo: '"밖으로 내준다"에서 "돈을 쓴다"로 이어집니다. ' +
           '중심 이미지는 통하지만 "지출"이라는 실제 쓰임은 따로 익혀야 합니다.',
    ex: [{ de: 'Ich habe zu viel Geld ausgegeben.', ko: '나는 돈을 너무 많이 썼다.' }],
    confusions: ['aufgeben', 'weitergeben'],
    warning: null
  },
  {
    lemma: 'zurückgeben',
    literalKo: '뒤로 + 주다',
    meanings: [{ ko: '돌려주다, 반납하다', en: 'to give back, to return', freq: 'high' }],
    transparency: 'high',
    whyKo: 'zurück- 은 "되돌린다"로 거의 그대로 통합니다.',
    ex: [{ de: 'Ich muss das Buch morgen zurückgeben.', ko: '나는 그 책을 내일 반납해야 한다.' }],
    confusions: ['weitergeben', 'aufgeben'],
    warning: null
  },
  {
    lemma: 'weitergeben',
    literalKo: '계속 + 주다',
    meanings: [{ ko: '전달하다, 넘겨주다', en: 'to pass on', freq: 'high' }],
    transparency: 'high',
    whyKo: '"계속해서 준다 → 다음 사람에게 넘긴다"로 잘 이어집니다.',
    ex: [{ de: 'Bitte geben Sie die Information weiter.', ko: '그 정보를 전달해 주세요.' }],
    confusions: ['zurückgeben', 'ausgeben'],
    warning: null
  },

  // ================================================================ nehmen 계열
  {
    lemma: 'mitnehmen',
    literalKo: '함께 + 잡다',
    meanings: [{ ko: '가져가다, 데려가다', en: 'to take along', freq: 'high' }],
    transparency: 'high',
    whyKo: 'mit- 은 "함께"입니다. mitkommen(같이 오다)과 짝으로 외우면 좋습니다.',
    ex: [{ de: 'Nimm bitte den Schirm mit.', ko: '우산 좀 가져가.' }],
    confusions: ['mitkommen', 'annehmen'],
    warning: null
  },
  {
    lemma: 'annehmen',
    literalKo: '~를 향해 + 잡다',
    meanings: [
      { ko: '받아들이다, 수락하다', en: 'to accept', freq: 'high' },
      { ko: '가정하다, ~라고 추측하다', en: 'to assume', freq: 'mid' }
    ],
    transparency: 'medium',
    whyKo: '"자기 쪽으로 잡는다 → 받아들인다"는 이어집니다. ' +
           '"가정하다"는 별개의 갈래라 따로 외우세요.',
    ex: [{ de: 'Ich nehme die Einladung gerne an.', ko: '나는 그 초대를 기꺼이 받아들인다.' }],
    confusions: ['mitnehmen', 'übernehmen'],
    warning: null
  },
  {
    lemma: 'teilnehmen',
    literalKo: '부분 + 잡다',
    meanings: [{ ko: 'teilnehmen an ~ : ~에 참가하다', en: 'to take part in', freq: 'high' }],
    transparency: 'medium',
    whyKo: '"몫을 잡는다 → 참가한다"입니다. 전치사 an + 3격을 반드시 함께 외우세요.',
    ex: [{ de: 'Ich nehme an dem Kurs teil.', ko: '나는 그 강좌에 참가한다.' }],
    confusions: ['annehmen', 'zunehmen'],
    warning: null
  },
  {
    lemma: 'zunehmen',
    literalKo: '더함 + 잡다',
    meanings: [
      { ko: '늘어나다, 증가하다', en: 'to increase', freq: 'high' },
      { ko: '살이 찌다', en: 'to put on weight', freq: 'high' }
    ],
    transparency: 'medium',
    whyKo: 'zu- 의 "더한다"에 이어집니다. 반대말 abnehmen(줄다 / 살 빠지다)과 ' +
           '짝으로 외우면 둘 다 굳습니다.',
    ex: [{ de: 'Die Zahl der Studenten hat zugenommen.', ko: '학생 수가 늘었다.' }],
    confusions: ['teilnehmen', 'annehmen'],
    warning: null
  },
  {
    lemma: 'übernehmen',
    literalKo: '넘어서 + 잡다',
    meanings: [
      { ko: '(일·역할을) 넘겨받다, 인수하다', en: 'to take over', freq: 'high' },
      { ko: '(책임을) 지다', en: 'to assume (responsibility)', freq: 'mid' }
    ],
    transparency: 'medium',
    whyKo: '"건너와서 잡는다 → 넘겨받는다"로 이어집니다. über- 치고는 잘 보이는 편입니다.',
    ex: [{ de: 'Sie übernimmt die Leitung des Projekts.', ko: '그는 그 프로젝트의 지휘를 맡는다.' }],
    confusions: ['annehmen', 'unterschreiben'],
    warning: 'über- 동사는 대부분 비분리입니다. ich übernehme (o) / ich nehme über (x).'
  },

  // ================================================================ stellen · machen 계열
  {
    lemma: 'vorstellen',
    literalKo: '앞으로 + 세우다',
    meanings: [
      { ko: '소개하다', en: 'to introduce', freq: 'high' },
      { ko: 'sich etwas vorstellen : 상상하다', en: 'to imagine', freq: 'high' }
    ],
    transparency: 'medium',
    whyKo: '"앞에 세운다 → 소개한다"는 잘 이어집니다. ' +
           '재귀대명사가 붙으면 뜻이 완전히 바뀌어 "상상하다"가 됩니다.',
    ex: [{ de: 'Darf ich Ihnen meinen Kollegen vorstellen?', ko: '제 동료를 소개해 드려도 될까요?' },
         { de: 'Das kann ich mir gut vorstellen.', ko: '그건 충분히 상상이 갑니다.' }],
    confusions: ['feststellen', 'vorbereiten'],
    warning: 'sich vorstellen 은 격으로 뜻이 갈립니다. sich(4격) vorstellen = 자기소개하다 / ' +
             'sich(3격) etwas vorstellen = 상상하다.'
  },
  {
    lemma: 'feststellen',
    literalKo: '단단히 + 세우다',
    meanings: [{ ko: '확인하다, 알아내다', en: 'to determine, to find out', freq: 'high' }],
    transparency: 'medium',
    whyKo: '"단단히 세운다 → 확정한다 → 확인한다"로 이어집니다.',
    ex: [{ de: 'Wir haben einen Fehler festgestellt.', ko: '우리는 오류를 하나 발견했다.' }],
    confusions: ['vorstellen', 'festhalten'],
    warning: null
  },
  {
    lemma: 'aufmachen',
    literalKo: '열림 + 만들다',
    meanings: [{ ko: '열다', en: 'to open', freq: 'high' }],
    transparency: 'high',
    whyKo: 'auf- 의 "열림"이 그대로 뜻입니다. 반대말 zumachen(닫다)과 짝입니다.',
    ex: [{ de: 'Mach bitte das Fenster auf.', ko: '창문 좀 열어 줘.' }],
    confusions: ['zumachen', 'aufstehen'],
    warning: null
  },
  {
    lemma: 'zumachen',
    literalKo: '닫음 + 만들다',
    meanings: [{ ko: '닫다', en: 'to close', freq: 'high' }],
    transparency: 'high',
    whyKo: 'zu- 의 "닫음"이 그대로 뜻입니다. aufmachen 과 짝으로 외우세요.',
    ex: [{ de: 'Kannst du die Tür zumachen?', ko: '문 좀 닫아 줄래?' }],
    confusions: ['aufmachen', 'aufhören'],
    warning: null
  },

  // ================================================================ halten · fallen 계열
  {
    lemma: 'festhalten',
    literalKo: '단단히 + 잡고 있다',
    meanings: [
      { ko: '꽉 붙잡다', en: 'to hold on to', freq: 'high' },
      { ko: '(기록으로) 남기다', en: 'to record', freq: 'mid' }
    ],
    transparency: 'high',
    whyKo: 'fest- 는 형용사 fest(단단한)가 그대로 붙은 것이라 뜻이 잘 보입니다.',
    ex: [{ de: 'Halt dich gut fest!', ko: '꽉 붙잡아!' }],
    confusions: ['feststellen', 'durchhalten'],
    warning: null
  },
  {
    lemma: 'durchhalten',
    literalKo: '끝까지 + 버티다',
    meanings: [{ ko: '끝까지 버티다, 견디다', en: 'to hold out', freq: 'high' }],
    transparency: 'high',
    whyKo: 'durch- 의 "끝까지"가 그대로 이어집니다.',
    ex: [{ de: 'Nur noch zwei Wochen — halt durch!', ko: '이제 2주 남았어 — 버텨!' }],
    confusions: ['festhalten', 'aufhören'],
    warning: 'durch- 는 동사에 따라 분리·비분리가 갈립니다. durchhalten 은 분리형입니다.'
  },
  {
    lemma: 'einfallen',
    literalKo: '안으로 + 떨어지다',
    meanings: [{ ko: '(생각이) 문득 떠오르다', en: 'to occur to someone', freq: 'high' }],
    transparency: 'low',
    whyKo: '"안으로 떨어진다"에서 "생각이 난다"로는 직역이 닿지 않습니다. ' +
           '게다가 생각이 주어입니다 — Mir fällt der Name nicht ein.',
    ex: [{ de: 'Mir fällt sein Name nicht ein.', ko: '그 사람 이름이 생각나지 않는다.' }],
    confusions: ['ausfallen', 'eingehen'],
    warning: '사람이 주어가 아닙니다. "내가 떠올린다"가 아니라 "나에게(mir) 떠오른다"입니다.'
  },
  {
    lemma: 'ausfallen',
    literalKo: '밖으로 + 떨어지다',
    meanings: [
      { ko: '(행사·수업이) 취소되다', en: 'to be cancelled', freq: 'high' },
      { ko: '(기계가) 고장 나다', en: 'to break down', freq: 'mid' }
    ],
    transparency: 'low',
    whyKo: '"떨어져 나간다 → 예정에서 빠진다"로 이야기를 붙일 수는 있지만 ' +
           '"취소되다"는 따로 외워야 합니다.',
    ex: [{ de: 'Der Unterricht fällt heute aus.', ko: '오늘 수업은 휴강입니다.' }],
    confusions: ['einfallen', 'ausgehen'],
    warning: null
  },
  {
    lemma: 'gefallen',
    prefix: 'ge', base: 'fallen',
    literalKo: '(옛 흔적) + 떨어지다',
    meanings: [{ ko: '마음에 들다', en: 'to be pleasing to', freq: 'high' }],
    transparency: 'low',
    whyKo: 'ge- 는 지금은 새 동사를 만들지 않는 접두사라 실마리가 없습니다. ' +
           '3격을 쓴다는 점이 핵심입니다 — Das Buch gefällt mir.',
    ex: [{ de: 'Das Bild gefällt mir sehr.', ko: '나는 그 그림이 아주 마음에 든다.' }],
    confusions: ['gehören', 'ausfallen'],
    warning: '"내가 좋아한다"가 아니라 "그것이 나에게(mir) 든다"입니다. 좋아하는 대상이 주어입니다.'
  },

  // ================================================================ 이동 계열
  {
    lemma: 'aussteigen',
    literalKo: '밖으로 + 오르다',
    meanings: [{ ko: '(차에서) 내리다', en: 'to get off', freq: 'high' }],
    transparency: 'high',
    whyKo: 'aus-(밖으로)와 ein-(안으로)이 정확히 반대로 작동합니다. ' +
           'einsteigen(타다)과 짝으로 외우세요.',
    ex: [{ de: 'Wir steigen an der nächsten Haltestelle aus.', ko: '우리는 다음 정류장에서 내린다.' }],
    confusions: ['einsteigen', 'ausgehen'],
    warning: null
  },
  {
    lemma: 'einsteigen',
    literalKo: '안으로 + 오르다',
    meanings: [{ ko: '(차에) 타다', en: 'to get in/on', freq: 'high' }],
    transparency: 'high',
    whyKo: 'aussteigen 의 반대. ein-/aus- 짝이 가장 잘 통하는 자리입니다.',
    ex: [{ de: 'Bitte steigen Sie hinten ein.', ko: '뒤쪽으로 타 주세요.' }],
    confusions: ['aussteigen', 'einladen'],
    warning: null
  },
  {
    lemma: 'abfahren',
    literalKo: '떨어져 나감 + 가다',
    meanings: [{ ko: '출발하다, 떠나다', en: 'to depart', freq: 'high' }],
    transparency: 'high',
    whyKo: 'ab- 의 "떨어져 나간다"가 "출발한다"로 이어집니다. ankommen(도착하다)과 짝입니다.',
    ex: [{ de: 'Der Bus fährt in fünf Minuten ab.', ko: '버스는 5분 뒤에 출발한다.' }],
    confusions: ['ankommen', 'abholen'],
    warning: null
  },
  {
    lemma: 'umziehen',
    literalKo: '바꿈 + 끌다',
    meanings: [
      { ko: '이사하다', en: 'to move house', freq: 'high' },
      { ko: 'sich umziehen : 옷을 갈아입다', en: 'to change clothes', freq: 'high' }
    ],
    transparency: 'medium',
    whyKo: 'um- 의 "바꾼다"에 이어집니다. 재귀대명사가 붙으면 "옷을 갈아입다"가 됩니다.',
    ex: [{ de: 'Wir ziehen nächsten Monat um.', ko: '우리는 다음 달에 이사한다.' },
         { de: 'Ich muss mich noch umziehen.', ko: '나는 아직 옷을 갈아입어야 한다.' }],
    confusions: ['übernehmen', 'umsteigen'],
    warning: 'um- 은 동사에 따라 분리·비분리가 갈리고 그때 뜻도 달라집니다. ' +
             'umziehen 은 분리형입니다.'
  },

  // ================================================================ 일상 A1~A2
  {
    lemma: 'anfangen',
    literalKo: '시작 + 잡다',
    meanings: [{ ko: '시작하다', en: 'to begin', freq: 'high' }],
    transparency: 'medium',
    whyKo: 'an- 의 "시작" 갈래입니다. beginnen 과 뜻이 같지만 anfangen 이 더 일상적입니다.',
    ex: [{ de: 'Der Film fängt um acht an.', ko: '영화는 8시에 시작한다.' }],
    confusions: ['aufhören', 'ankommen'],
    warning: null
  },
  {
    lemma: 'aufhören',
    literalKo: null,
    meanings: [{ ko: '그만두다, 멈추다', en: 'to stop', freq: 'high' }],
    transparency: 'low',
    whyKo: '"듣다(hören)"와는 관계가 없습니다. anfangen(시작하다)의 반대말로 짝지어 ' +
           '외우세요. aufhören zu + 부정사 형태로 자주 씁니다.',
    ex: [{ de: 'Hör bitte auf zu reden!', ko: '말 좀 그만해!' }],
    confusions: ['anfangen', 'gehören'],
    warning: null
  },
  {
    lemma: 'anrufen',
    literalKo: '~를 향해 + 부르다',
    meanings: [{ ko: '전화하다', en: 'to call (on the phone)', freq: 'high' }],
    transparency: 'medium',
    whyKo: '"~쪽으로 부른다"에서 이어집니다. 4격을 직접 받습니다 — ' +
           'ich rufe dich an (전치사 없음).',
    ex: [{ de: 'Ich rufe dich morgen an.', ko: '내일 너에게 전화할게.' }],
    confusions: ['anfangen', 'aufpassen'],
    warning: null
  },
  {
    lemma: 'aufpassen',
    literalKo: null,
    meanings: [
      { ko: '조심하다, 주의하다', en: 'to pay attention', freq: 'high' },
      { ko: 'aufpassen auf ~ : ~를 돌보다', en: 'to look after', freq: 'mid' }
    ],
    transparency: 'low',
    whyKo: '"맞추다(passen)"에서 "조심하다"로는 닿지 않습니다. ' +
           'Pass auf! (조심해!)를 통째로 외우는 편이 빠릅니다.',
    ex: [{ de: 'Pass auf, das Auto kommt!', ko: '조심해, 차 온다!' }],
    confusions: ['aufhören', 'anrufen'],
    warning: null
  },
  {
    lemma: 'abholen',
    literalKo: '떼어냄 + 가져오다',
    meanings: [{ ko: '데리러 가다, 찾아오다', en: 'to pick up', freq: 'high' }],
    transparency: 'medium',
    whyKo: '"가서 떼어 온다 → 데려온다"로 이어집니다. 공항 마중에도 택배 수령에도 씁니다.',
    ex: [{ de: 'Ich hole dich am Bahnhof ab.', ko: '내가 역으로 데리러 갈게.' }],
    confusions: ['abfahren', 'wiederholen'],
    warning: null
  },
  {
    lemma: 'einladen',
    literalKo: '안으로 + 싣다',
    meanings: [{ ko: '초대하다', en: 'to invite', freq: 'high' }],
    transparency: 'medium',
    whyKo: '"안으로 들인다 → 초대한다"로 이어집니다. ' +
           '"내가 살게"라는 뜻으로도 씁니다 — Ich lade dich ein.',
    ex: [{ de: 'Ich lade dich zum Essen ein.', ko: '내가 밥 살게. (식사에 초대할게.)' }],
    confusions: ['einsteigen', 'einkaufen'],
    warning: null
  },
  {
    lemma: 'einkaufen',
    literalKo: '안으로 + 사다',
    meanings: [{ ko: '장을 보다, 쇼핑하다', en: 'to shop for groceries', freq: 'high' }],
    transparency: 'high',
    whyKo: '"사서 들인다"로 잘 이어집니다. kaufen(사다)과 달리 목적어 없이 쓰는 일이 ' +
           '많습니다 — Ich gehe einkaufen.',
    ex: [{ de: 'Ich muss noch einkaufen gehen.', ko: '나는 장을 보러 가야 한다.' }],
    confusions: ['verkaufen', 'einladen'],
    warning: null
  },
  {
    lemma: 'verkaufen',
    literalKo: '(방향을 뒤집음) + 사다',
    meanings: [{ ko: '팔다', en: 'to sell', freq: 'high' }],
    transparency: 'medium',
    whyKo: 'ver- 가 여기서는 방향을 뒤집습니다 — kaufen(사다) ↔ verkaufen(팔다). ' +
           'ver- 가 이렇게 깔끔하게 작동하는 경우는 드뭅니다.',
    ex: [{ de: 'Er hat sein Auto verkauft.', ko: '그는 자기 차를 팔았다.' }],
    confusions: ['einkaufen', 'verlieren'],
    warning: null
  },
  {
    lemma: 'aussehen',
    literalKo: '밖으로 + 보다',
    meanings: [{ ko: '~처럼 보이다', en: 'to look (like)', freq: 'high' }],
    transparency: 'low',
    whyKo: '"밖을 본다"가 아니라 "밖에서 볼 때 그렇게 보인다"입니다. 방향이 반대라 ' +
           '헷갈립니다. 형용사와 함께 씁니다 — Du siehst müde aus.',
    ex: [{ de: 'Du siehst heute müde aus.', ko: '너 오늘 피곤해 보인다.' }],
    confusions: ['ausgehen', 'aufpassen'],
    warning: null
  },
  {
    lemma: 'ausfüllen',
    prefix: 'aus', base: 'füllen',   // füllen 은 우리 단어장에 없어 직접 적어 준다
    literalKo: '끝까지 + 채우다',
    meanings: [{ ko: '(양식을) 작성하다, 채워 넣다', en: 'to fill out (a form)', freq: 'high' }],
    transparency: 'high',
    whyKo: 'aus- 의 "끝까지"가 "빠짐없이 채운다"로 이어집니다.',
    ex: [{ de: 'Bitte füllen Sie das Formular aus.', ko: '이 양식을 작성해 주세요.' }],
    confusions: ['ausgeben', 'aussehen'],
    warning: null
  },

  // ================================================================ 비분리 be- / er- / ent-
  {
    lemma: 'besuchen',
    literalKo: '대상을 직접 + 찾다',
    meanings: [
      { ko: '방문하다', en: 'to visit', freq: 'high' },
      { ko: '(학교·강좌를) 다니다', en: 'to attend', freq: 'mid' }
    ],
    transparency: 'medium',
    whyKo: 'be- 는 뜻보다 문법을 바꿉니다. suchen nach(찾다)와 달리 besuchen 은 ' +
           '전치사 없이 4격을 직접 받습니다.',
    ex: [{ de: 'Ich besuche meine Großeltern.', ko: '나는 조부모님을 방문한다.' }],
    confusions: ['bekommen', 'beantworten'],
    warning: null
  },
  {
    lemma: 'beantworten',
    literalKo: '대상을 직접 + 답하다',
    meanings: [{ ko: '(질문에) 답하다', en: 'to answer', freq: 'high' }],
    transparency: 'high',
    whyKo: 'be- 의 대표적인 예입니다 — auf eine Frage antworten 이 ' +
           'eine Frage beantworten 이 됩니다. 전치사가 사라지고 4격이 됩니다.',
    ex: [{ de: 'Können Sie meine Frage beantworten?', ko: '제 질문에 답해 주시겠어요?' }],
    confusions: ['besuchen', 'erklären'],
    warning: null
  },
  {
    lemma: 'erklären',
    literalKo: '이루어냄 + 밝히다',
    meanings: [
      { ko: '설명하다', en: 'to explain', freq: 'high' },
      { ko: '선언하다', en: 'to declare', freq: 'low' }
    ],
    transparency: 'high',
    whyKo: 'klar(분명한) → klären(밝히다) → erklären(밝혀서 알려주다)로 잘 이어집니다.',
    ex: [{ de: 'Kannst du mir das erklären?', ko: '그거 나한테 설명해 줄 수 있어?' }],
    confusions: ['erzählen', 'erreichen'],
    warning: null
  },
  {
    lemma: 'erzählen',
    literalKo: '이루어냄 + 세다',
    meanings: [{ ko: '이야기하다, 들려주다', en: 'to tell (a story)', freq: 'high' }],
    transparency: 'low',
    whyKo: 'zählen(수를 세다)과 뜻이 멀어 보이지만 영어 count / recount 와 같은 ' +
           '관계입니다. erklären(설명하다)과 헷갈리지 마세요.',
    ex: [{ de: 'Erzähl mir von deiner Reise!', ko: '네 여행 이야기 좀 들려줘!' }],
    confusions: ['erklären', 'erreichen'],
    warning: null
  },
  {
    lemma: 'erreichen',
    literalKo: '이루어냄 + 닿다',
    meanings: [
      { ko: '도달하다, 도착하다', en: 'to reach', freq: 'high' },
      { ko: '(연락이) 닿다', en: 'to get hold of someone', freq: 'mid' },
      { ko: '(목표를) 이루다', en: 'to achieve', freq: 'mid' }
    ],
    transparency: 'high',
    whyKo: 'er- 의 "애써서 도달한다"가 그대로 보입니다. er- 중에서 가장 투명한 편입니다.',
    ex: [{ de: 'Sie erreichen mich unter dieser Nummer.', ko: '이 번호로 저에게 연락하실 수 있습니다.' }],
    confusions: ['erklären', 'entscheiden'],
    warning: null
  },
  {
    lemma: 'entscheiden',
    literalKo: '떼어냄 + 가르다',
    meanings: [
      { ko: '결정하다', en: 'to decide', freq: 'high' },
      { ko: 'sich entscheiden für ~ : ~로 정하다', en: 'to decide on', freq: 'high' }
    ],
    transparency: 'medium',
    whyKo: 'scheiden(가르다) + ent-(떼어냄) → "갈라서 잘라낸다 → 결정한다". ' +
           '자기 일에는 재귀형 sich entscheiden 을 씁니다.',
    ex: [{ de: 'Ich habe mich für das rote Kleid entschieden.', ko: '나는 빨간 원피스로 정했다.' }],
    confusions: ['entstehen', 'erreichen'],
    warning: null
  },
  {
    lemma: 'empfehlen',
    prefix: 'emp', base: null,
    literalKo: null,
    meanings: [{ ko: '추천하다, 권하다', en: 'to recommend', freq: 'high' }],
    transparency: 'low',
    whyKo: 'emp- 동사는 셋뿐이라 쪼개지 말고 통째로 외우는 편이 빠릅니다 — ' +
           'empfehlen(추천하다) · empfangen(받다) · empfinden(느끼다). ' +
           '3격 사람 + 4격 사물을 씁니다.',
    ex: [{ de: 'Können Sie mir ein Restaurant empfehlen?', ko: '레스토랑 하나 추천해 주시겠어요?' }],
    confusions: ['erklären', 'gefallen'],
    warning: null
  },
  {
    lemma: 'gehören',
    prefix: 'ge', base: 'hören',
    literalKo: '(옛 흔적) + 듣다',
    meanings: [
      { ko: '~의 것이다, ~에 속하다', en: 'to belong to', freq: 'high' },
      { ko: 'gehören zu ~ : ~에 속하다', en: 'to be part of', freq: 'mid' }
    ],
    transparency: 'low',
    whyKo: '"듣다"와 관계가 없어 보입니다. 3격을 씁니다 — Das Buch gehört mir. ' +
           'gefallen(마음에 들다)과 함께 "3격을 쓰는 ge- 동사" 짝으로 외우세요.',
    ex: [{ de: 'Wem gehört dieses Fahrrad?', ko: '이 자전거는 누구 것입니까?' }],
    confusions: ['gefallen', 'aufhören'],
    warning: null
  },

  // ================================================================ 가변 접두사
  {
    lemma: 'übersetzen',
    literalKo: '건너 + 앉히다',
    meanings: [{ ko: '번역하다', en: 'to translate', freq: 'high' }],
    transparency: 'medium',
    whyKo: '"말을 건너편으로 옮겨 놓는다"로 이어집니다. ' +
           '비분리라서 강세가 setzen 쪽에 옵니다 — übersétzen.',
    ex: [{ de: 'Können Sie das ins Koreanische übersetzen?', ko: '이걸 한국어로 번역해 주실 수 있나요?' }],
    confusions: ['übernehmen', 'unterschreiben'],
    warning: 'úbersetzen(강세 앞 · 분리)이면 "배로 건네주다"라는 다른 뜻이 됩니다. ' +
             '일상에서 만나는 "번역하다"는 비분리 쪽입니다.'
  },
  {
    lemma: 'unterschreiben',
    literalKo: '아래에 + 쓰다',
    meanings: [{ ko: '서명하다', en: 'to sign', freq: 'high' }],
    transparency: 'high',
    whyKo: '"아래에 쓴다 → 서명한다"가 그대로 보입니다. ' +
           '비분리입니다 — ich unterschreibe (o) / ich schreibe unter (x).',
    ex: [{ de: 'Bitte unterschreiben Sie hier.', ko: '여기에 서명해 주세요.' }],
    confusions: ['übersetzen', 'übernehmen'],
    warning: null
  },
  {
    lemma: 'wiederholen',
    literalKo: '다시 + 가져오다',
    meanings: [{ ko: '반복하다, 복습하다', en: 'to repeat', freq: 'high' }],
    transparency: 'medium',
    whyKo: '"다시 가져온다 → 되풀이한다"로 이어집니다. ' +
           'wieder- 동사 중 유일하게 비분리라 예외로 외워야 합니다.',
    ex: [{ de: 'Können Sie das bitte wiederholen?', ko: '다시 한 번 말씀해 주시겠어요?' }],
    confusions: ['abholen', 'übersetzen'],
    warning: 'wiederholen 은 비분리 — ich wiederhole (o) / ich hole wieder (x). ' +
             '반면 wiedersehen(다시 만나다)은 분리형입니다.'
  },
  {
    lemma: 'zerstören',
    literalKo: '산산이 + 방해하다',
    meanings: [{ ko: '파괴하다', en: 'to destroy', freq: 'high' }],
    transparency: 'high',
    whyKo: 'zer- 는 "산산이 부순다"로 거의 예외가 없습니다. 뜻은 쉬운 접두사입니다.',
    ex: [{ de: 'Der Sturm hat viele Häuser zerstört.', ko: '폭풍이 많은 집을 파괴했다.' }],
    confusions: ['verlieren', 'entstehen'],
    warning: null
  },

  // ================================================================ 그 밖
  {
    lemma: 'nachdenken',
    literalKo: '뒤따라 + 생각하다',
    meanings: [{ ko: 'nachdenken über ~ : ~에 대해 곰곰이 생각하다', en: 'to think about', freq: 'high' }],
    transparency: 'medium',
    whyKo: '"되짚어 생각한다"로 이어집니다. 전치사 über + 4격과 함께 외우세요.',
    ex: [{ de: 'Ich muss darüber noch nachdenken.', ko: '나는 그것에 대해 좀 더 생각해 봐야 한다.' }],
    confusions: ['vorstellen', 'entscheiden'],
    warning: null
  },
  {
    lemma: 'stattfinden',
    literalKo: null,
    meanings: [{ ko: '(행사가) 열리다, 개최되다', en: 'to take place', freq: 'high' }],
    transparency: 'low',
    whyKo: 'Statt(자리) + finden 이 굳어진 말입니다. "찾다"로는 닿지 않습니다. ' +
           '사물이 주어입니다 — Das Konzert findet statt.',
    ex: [{ de: 'Das Konzert findet am Samstag statt.', ko: '그 콘서트는 토요일에 열린다.' }],
    confusions: ['ausfallen', 'teilnehmen'],
    warning: null
  },
  {
    lemma: 'kennenlernen',
    literalKo: '알다 + 배우다',
    meanings: [{ ko: '알게 되다, (사람을) 처음 만나다', en: 'to get to know', freq: 'high' }],
    transparency: 'high',
    whyKo: '접두사가 아니라 동사 두 개가 붙은 것입니다. ' +
           '"알아 가는 것을 배운다"로 그대로 읽힙니다.',
    ex: [{ de: 'Ich habe sie im Kurs kennengelernt.', ko: '나는 그를 강좌에서 알게 되었다.' }],
    confusions: ['vorstellen', 'einladen'],
    warning: null
  },
  {
    lemma: 'zusammenfassen',
    literalKo: '하나로 + 잡다',
    meanings: [{ ko: '요약하다, 정리하다', en: 'to summarize', freq: 'high' }],
    transparency: 'high',
    whyKo: '"한데 모아 잡는다 → 요약한다"로 잘 이어집니다.',
    ex: [{ de: 'Fassen Sie bitte den Text kurz zusammen.', ko: '그 글을 짧게 요약해 주세요.' }],
    confusions: ['feststellen', 'weitergeben'],
    warning: null
  },
  {
    lemma: 'wegwerfen',
    literalKo: '치움 + 던지다',
    meanings: [{ ko: '버리다', en: 'to throw away', freq: 'high' }],
    transparency: 'high',
    whyKo: 'weg- 는 "없어지게 한다"로 거의 그대로 통합니다.',
    ex: [{ de: 'Wirf das bitte nicht weg.', ko: '그거 버리지 마.' }],
    confusions: ['zurückgeben', 'verlieren'],
    warning: null
  },
  {
    lemma: 'versprechen',
    literalKo: '(잘못) + 말하다',
    meanings: [
      { ko: '약속하다', en: 'to promise', freq: 'high' },
      { ko: 'sich versprechen : 말실수하다', en: 'to misspeak', freq: 'low' }
    ],
    transparency: 'medium',
    whyKo: '재귀형이 되면 ver- 의 "잘못" 갈래가 살아납니다 — ' +
           'sich versprechen(말이 헛나오다). sich verlaufen(길을 잃다)과 같은 무리입니다.',
    ex: [{ de: 'Du hast es mir versprochen!', ko: '너 나한테 약속했잖아!' }],
    confusions: ['verbringen', 'verkaufen'],
    warning: null
  },
  {
    lemma: 'verbringen',
    literalKo: null,
    meanings: [{ ko: '(시간을) 보내다', en: 'to spend (time)', freq: 'high' }],
    transparency: 'low',
    whyKo: 'bringen(가져오다)에서 "시간을 보내다"로는 닿지 않습니다. ' +
           '시간에만 씁니다 — 돈을 쓰는 것은 ausgeben 입니다.',
    ex: [{ de: 'Wir haben den Sommer in Italien verbracht.', ko: '우리는 여름을 이탈리아에서 보냈다.' }],
    confusions: ['vergehen', 'ausgeben'],
    warning: '시간은 verbringen, 돈은 ausgeben 입니다.'
  }
];

/*
 * 기본 동사 뜻.
 *
 * 의미 추론 퀴즈는 "기본 동사 뜻 + 접두사 이미지 → 실제 뜻" 순서로 묻기 때문에
 * 기본 동사 뜻이 없으면 아예 성립하지 않는다. verbs.js 는 자동 생성물이라
 * 손대지 않고 여기에 따로 적어 둔다.
 *
 * 뜻 채우기 화면에서 직접 채운 값이 있으면 그쪽이 우선한다.
 */
window.BASEVERBS = {
  antworten:  '대답하다',
  bringen:    '가져오다, 데려오다',
  denken:     '생각하다',
  fahren:     '(타고) 가다, 운전하다',
  fallen:     '떨어지다, 넘어지다',
  fangen:     '잡다, 붙잡다',
  fassen:     '잡다, 붙들다',
  geben:      '주다',
  gehen:      '가다, 걷다',
  halten:     '잡고 있다, 멈추다',
  holen:      '가져오다, 데려오다',
  'hören':    '듣다',
  kaufen:     '사다',
  'klären':   '밝히다, 해명하다',
  kommen:     '오다',
  laden:      '싣다, 적재하다',
  machen:     '만들다, 하다',
  nehmen:     '잡다, 취하다',
  passen:     '맞다, 어울리다',
  reichen:    '닿다, 충분하다, 건네다',
  rufen:      '부르다, 외치다',
  scheiden:   '가르다, 나누다',
  schreiben:  '쓰다',
  sehen:      '보다',
  setzen:     '앉히다, 놓다',
  sprechen:   '말하다',
  stehen:     '서다, 서 있다',
  steigen:    '오르다, 올라가다',
  stellen:    '세우다, 놓다',
  'stören':   '방해하다',
  suchen:     '찾다',
  werfen:     '던지다',
  ziehen:     '끌다, 당기다',
  'zählen':   '세다, 헤아리다',
  'füllen':   '채우다',
  lernen:     '배우다',
  finden:     '찾다, 발견하다'
};
