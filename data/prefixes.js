/*
 * prefixes.js — 접두사 26개 (손으로 쓴 파일 · tools/ 재실행에 안 덮인다)
 *
 * 접두사는 뜻을 만들어 내는 공식이 아니라 기억을 묶는 실마리다.
 * coreKo 는 "중심 이미지", meaningsKo 는 실제로 자주 나타나는 갈래.
 *
 *   type          separable   항상 분리
 *                 inseparable 항상 비분리
 *                 variable    동사에 따라 갈림 (뜻도 갈린다)
 *   predictability 이 접두사 전체의 경향. 개별 동사의 투명도와는 다르다.
 *   level          학습 순서용 — 카드 정렬에 쓴다
 */
window.PREFIXES = [

  // ---------------------------------------------------------------- 분리 (18)

  {
    id: 'auf', label: 'auf-', type: 'separable', level: 'A1',
    coreKo: '위로 · 열림 · 시작',
    meaningsKo: ['위로', '열림', '시작', '증가'],
    predictability: 'high',
    noteKo: '"열다"와 "시작하다"가 가장 흔합니다. 다만 aufgeben 처럼 ' +
            '"위로 내놓다 → 포기하다"로 굳어 버린 것도 있습니다.',
    warning: null
  },
  {
    id: 'aus', label: 'aus-', type: 'separable', level: 'A1',
    coreKo: '밖으로 · 끝까지 · 완결',
    meaningsKo: ['밖으로', '끝까지', '다 써버림', '꺼짐'],
    predictability: 'high',
    noteKo: '"밖으로"가 기본입니다. "끝까지 해서 없어진다"는 갈래도 자주 나옵니다 — ' +
            'ausgehen 은 "외출하다"이면서 "(불이) 꺼지다"이기도 합니다.',
    warning: null
  },
  {
    id: 'ein', label: 'ein-', type: 'separable', level: 'A1',
    coreKo: '안으로 · 들어감',
    meaningsKo: ['안으로', '들어감', '포함', '시작'],
    predictability: 'high',
    noteKo: '"안으로"는 거의 그대로 통합니다. 반대는 aus-. ' +
            '다만 eingehen 처럼 추상으로 넘어가면 예측이 어렵습니다.',
    warning: null
  },
  {
    id: 'an', label: 'an-', type: 'separable', level: 'A1',
    coreKo: '접촉 · 향함 · 시작',
    meaningsKo: ['~에 붙음', '~를 향해', '시작', '켜기'],
    predictability: 'medium',
    noteKo: '"닿는다 / 향한다"가 중심입니다. anmachen(켜다) · anrufen(전화하다)처럼 ' +
            '"작동을 시작한다"는 갈래가 넓게 퍼져 있습니다.',
    warning: null
  },
  {
    id: 'mit', label: 'mit-', type: 'separable', level: 'A1',
    coreKo: '함께',
    meaningsKo: ['함께', '동행', '같이 가져감'],
    predictability: 'high',
    noteKo: '이 목록에서 가장 예측하기 쉬운 접두사입니다. ' +
            '거의 예외 없이 "함께 ~하다"로 읽힙니다.',
    warning: null
  },
  {
    id: 'ab', label: 'ab-', type: 'separable', level: 'A1',
    coreKo: '떨어져 나감 · 출발 · 완료',
    meaningsKo: ['떼어냄', '출발', '아래로', '끝냄'],
    predictability: 'medium',
    noteKo: '"분리"가 중심입니다. abfahren(출발하다)은 "떨어져 나간다"에서, ' +
            'abnehmen(줄다·살 빠지다)은 "덜어낸다"에서 옵니다.',
    warning: null
  },
  {
    id: 'zu', label: 'zu-', type: 'separable', level: 'A1',
    coreKo: '닫힘 · ~를 향해 · 더함',
    meaningsKo: ['닫음', '~쪽으로', '더함', '증가'],
    predictability: 'medium',
    noteKo: 'auf-(열림)의 반대가 기본입니다. zunehmen(늘다)처럼 "더한다"도 자주 나옵니다. ' +
            'zu 부정사의 zu 와는 다른 것이니 헷갈리지 마세요.',
    warning: null
  },
  {
    id: 'vor', label: 'vor-', type: 'separable', level: 'A1',
    coreKo: '앞으로 · 미리 · 내보임',
    meaningsKo: ['앞으로', '미리', '남에게 보임', '제안'],
    predictability: 'medium',
    noteKo: '"앞에 내놓는다"가 중심입니다. vorstellen 은 "앞에 세우다 → 소개하다", ' +
            'sich vorstellen 이면 "상상하다"가 됩니다.',
    warning: null
  },
  {
    id: 'nach', label: 'nach-', type: 'separable', level: 'A2',
    coreKo: '뒤따라 · 나중에 · 되짚음',
    meaningsKo: ['뒤따라', '나중에', '따라 함', '확인'],
    predictability: 'medium',
    noteKo: '"뒤를 따라간다"가 중심입니다. nachschlagen(사전을 찾다)처럼 ' +
            '"되짚어 확인한다"는 갈래도 흔합니다.',
    warning: null
  },
  {
    id: 'weg', label: 'weg-', type: 'separable', level: 'A2',
    coreKo: '치워버림 · 떠남',
    meaningsKo: ['치움', '떠남', '없앰'],
    predictability: 'high',
    noteKo: '"없어지게 한다"로 거의 그대로 통합니다. ' +
            'wegwerfen(버리다) · weggehen(떠나다).',
    warning: null
  },
  {
    id: 'zurück', label: 'zurück-', type: 'separable', level: 'A2',
    coreKo: '뒤로 · 되돌림',
    meaningsKo: ['뒤로', '되돌림', '반환'],
    predictability: 'high',
    noteKo: '"되돌린다"로 거의 그대로 통합니다. 예측하기 쉬운 접두사입니다.',
    warning: null
  },
  {
    id: 'her', label: 'her-', type: 'separable', level: 'A2',
    coreKo: '말하는 사람 쪽으로',
    meaningsKo: ['이쪽으로', '가져옴', '유래'],
    predictability: 'medium',
    noteKo: 'her- 는 나에게로, hin- 은 나에게서 멀어지는 방향입니다. ' +
            '한국어에는 이 구분이 없어 특히 헷갈립니다.',
    warning: null
  },
  {
    id: 'hin', label: 'hin-', type: 'separable', level: 'A2',
    coreKo: '말하는 사람에게서 멀어지는 쪽으로',
    meaningsKo: ['저쪽으로', '가져감', '향함'],
    predictability: 'medium',
    noteKo: 'her- 의 짝입니다. hingehen(그리로 가다) / herkommen(이리로 오다). ' +
            '방향의 기준이 언제나 "말하는 사람"이라는 점만 잡으면 됩니다.',
    warning: null
  },
  {
    id: 'bei', label: 'bei-', type: 'separable', level: 'B1',
    coreKo: '곁에 · 덧붙임',
    meaningsKo: ['곁에', '덧붙임', '기여'],
    predictability: 'medium',
    noteKo: '동사 수가 많지 않습니다. beitragen(기여하다) · beibringen(가르치다)처럼 ' +
            '개별로 외우는 편이 빠릅니다.',
    warning: null
  },
  {
    id: 'fest', label: 'fest-', type: 'separable', level: 'B1',
    coreKo: '단단히 · 고정',
    meaningsKo: ['단단히', '고정', '확정'],
    predictability: 'high',
    noteKo: '형용사 fest(단단한)가 그대로 붙은 것이라 뜻이 잘 보입니다. ' +
            'feststellen(확인하다) · festhalten(붙잡다).',
    warning: null
  },
  {
    id: 'los', label: 'los-', type: 'separable', level: 'B1',
    coreKo: '풀림 · 출발',
    meaningsKo: ['풀어놓음', '출발', '시작'],
    predictability: 'medium',
    noteKo: 'losfahren(출발하다)처럼 "떼고 나간다"가 중심입니다.',
    warning: null
  },
  {
    id: 'weiter', label: 'weiter-', type: 'separable', level: 'B1',
    coreKo: '계속 · 넘김',
    meaningsKo: ['계속', '더 멀리', '남에게 넘김'],
    predictability: 'high',
    noteKo: '"계속 ~하다"로 거의 그대로 통합니다. ' +
            'weitergeben 은 "넘겨주다 / 전달하다".',
    warning: null
  },
  {
    id: 'zusammen', label: 'zusammen-', type: 'separable', level: 'B1',
    coreKo: '함께 · 하나로',
    meaningsKo: ['함께', '모음', '합침'],
    predictability: 'high',
    noteKo: 'mit- 이 "동행"이라면 zusammen- 은 "하나로 합쳐진다"에 가깝습니다.',
    warning: null
  },

  // ── 접두사는 아니지만 똑같이 움직이는 것들
  //    teil(명사) · statt(명사) · kennen(동사) 이 붙은 복합동사다.
  //    분리하고 ge 가 사이에 들어가는 규칙이 접두사와 완전히 같아서 함께 다룬다.
  {
    id: 'teil', label: 'teil-', type: 'separable', level: 'A2',
    coreKo: '몫 · 부분',
    meaningsKo: ['몫', '부분', '참여'],
    predictability: 'high',
    noteKo: '접두사가 아니라 명사 Teil(부분)이 붙은 것입니다. 그래도 분리 규칙은 ' +
            '똑같습니다 — teilgenommen. teilnehmen an + 3격으로 씁니다.',
    warning: null
  },
  {
    id: 'statt', label: 'statt-', type: 'separable', level: 'B1',
    coreKo: '자리 · 장소',
    meaningsKo: ['자리', '장소'],
    predictability: 'medium',
    noteKo: '명사 Statt(자리)가 붙은 것입니다. 사실상 stattfinden(열리다) 하나만 ' +
            '쓰이므로 그 한 낱말로 외우면 됩니다.',
    warning: null
  },
  {
    id: 'kennen', label: 'kennen-', type: 'separable', level: 'A1',
    coreKo: '알다',
    meaningsKo: ['알다'],
    predictability: 'high',
    noteKo: '접두사가 아니라 동사 kennen 이 붙은 것입니다. kennenlernen(알게 되다) ' +
            '하나뿐이지만 아주 자주 씁니다.',
    warning: null
  },

  // ---------------------------------------------------------------- 비분리 (8)

  {
    id: 'be', label: 'be-', type: 'inseparable', level: 'A2',
    coreKo: '대상을 직접 건드림',
    meaningsKo: ['~을 대상으로 함', '자동사를 타동사로', '두루 미침'],
    predictability: 'medium',
    noteKo: '뜻을 더한다기보다 **문법을 바꿉니다.** antworten auf etwas → ' +
            'etwas beantworten 처럼 전치사가 사라지고 4격을 직접 받습니다. ' +
            '그래서 "뜻"보다 "격 지배"로 기억하는 편이 낫습니다.',
    warning: null
  },
  {
    id: 'ver', label: 'ver-', type: 'inseparable', level: 'B1',
    coreKo: '변화 · 소실 · 잘못 · 완료',
    meaningsKo: ['변화', '사라짐', '잘못함', '끝까지'],
    predictability: 'low',
    noteKo: '갈래가 너무 넓어 접두사만으로는 거의 예측할 수 없습니다. ' +
            'verstehen(이해하다) · vergehen(지나가다) · verlaufen(길을 잃다)이 ' +
            '전부 다른 갈래입니다. **개별 어휘로 외우세요.** ' +
            '단, sich ver-en 형태(sich verlaufen, sich versprechen)는 ' +
            '"잘못 ~하다"로 꽤 규칙적입니다.',
    warning: null
  },
  {
    id: 'er', label: 'er-', type: 'inseparable', level: 'A2',
    coreKo: '이루어냄 · 시작 · 도달',
    meaningsKo: ['해내어 얻음', '시작', '~하게 됨'],
    predictability: 'medium',
    noteKo: '"애써서 결과에 도달한다"가 중심입니다. erreichen(도달하다) · ' +
            'erfinden(발명하다). 죽음·소멸과 관련된 갈래(erfrieren 얼어 죽다)도 있습니다.',
    warning: null
  },
  {
    id: 'ent', label: 'ent-', type: 'inseparable', level: 'B1',
    coreKo: '떼어냄 · 벗어남 · 시작',
    meaningsKo: ['제거', '벗어남', '생겨남'],
    predictability: 'medium',
    noteKo: '"~에서 벗어난다"가 중심입니다. entstehen(생겨나다)은 예외적으로 ' +
            '"생성"쪽이라 따로 외워야 합니다.',
    warning: null
  },
  {
    id: 'miss', label: 'miss-', type: 'inseparable', level: 'B1',
    coreKo: '잘못 · 실패',
    meaningsKo: ['잘못', '실패', '부정'],
    predictability: 'high',
    noteKo: '영어 mis- 와 같습니다. missverstehen(오해하다) · misslingen(실패하다). ' +
            '뜻은 잘 보이지만 동사 수가 적습니다.',
    warning: null
  },
  {
    id: 'zer', label: 'zer-', type: 'inseparable', level: 'B2',
    coreKo: '산산이 부서짐',
    meaningsKo: ['파괴', '조각남', '흩어짐'],
    predictability: 'high',
    noteKo: '"부순다"로 거의 그대로 통합니다. zerstören(파괴하다) · ' +
            'zerbrechen(깨지다). 뜻은 쉽지만 자주 쓰이진 않습니다.',
    warning: null
  },
  {
    id: 'emp', label: 'emp-', type: 'inseparable', level: 'B2',
    coreKo: '받아들임 · 느낌',
    meaningsKo: ['받음', '느낌'],
    predictability: 'medium',
    noteKo: '동사가 셋뿐입니다 — empfangen(받다) · empfehlen(추천하다) · ' +
            'empfinden(느끼다). 그냥 이 셋을 외우면 끝입니다.',
    warning: null
  },
  {
    id: 'ge', label: 'ge-', type: 'inseparable', level: 'B2',
    coreKo: '(생산적이지 않음)',
    meaningsKo: ['옛 흔적'],
    predictability: 'low',
    noteKo: '지금은 새 동사를 만들지 않는 접두사입니다. gefallen(마음에 들다) · ' +
            'gehören(~의 것이다) · gestehen(고백하다) 처럼 남아 있는 몇 개를 ' +
            '**개별 어휘로** 외우면 됩니다. 과거분사의 ge- 와는 완전히 다릅니다.',
    warning: '과거분사 앞의 ge- 와 헷갈리지 마세요. gekommen 은 kommen 의 과거분사이지 ' +
             'ge- 가 붙은 새 동사가 아닙니다.'
  },

  // ---------------------------------------------------------------- 가변 (6)

  {
    id: 'um', label: 'um-', type: 'variable', level: 'B2',
    coreKo: '둘레로 / 바꿈',
    meaningsKo: ['둘레로', '방향을 돌림', '바꿈', '넘어뜨림'],
    predictability: 'low',
    noteKo: '분리하면 "방향을 바꾼다 / 넘어뜨린다", 비분리면 "둘러싼다"에 가깝습니다. ' +
            'umziehen(이사하다, 분리) / umgeben(둘러싸다, 비분리).',
    warning: '분리 여부로 뜻이 갈립니다. úmfahren(강세 앞 · 분리)은 "치고 지나가다", ' +
             'umfáhren(강세 뒤 · 비분리)은 "돌아서 가다" — 정반대에 가깝습니다.'
  },
  {
    id: 'über', label: 'über-', type: 'variable', level: 'B2',
    coreKo: '넘어서 / 위로',
    meaningsKo: ['건너', '지나침', '옮김', '빠뜨림'],
    predictability: 'low',
    noteKo: '비분리가 훨씬 많습니다 — übersetzen(번역하다) · übernehmen(넘겨받다) · ' +
            'übersehen(못 보고 지나치다). 분리형은 "넘쳐 흐른다"쪽입니다.',
    warning: '분리하면 물리적으로 "넘어간다", 비분리면 추상적으로 "건너/지나친다"가 ' +
             '되는 경향이 있습니다. 우리 단어장의 über- 동사는 대부분 비분리입니다.'
  },
  {
    id: 'unter', label: 'unter-', type: 'variable', level: 'B2',
    coreKo: '아래로 / 사이에',
    meaningsKo: ['아래로', '가라앉음', '중단', '사이에 넣음'],
    predictability: 'low',
    noteKo: 'untergehen(가라앉다, 분리) / unterschreiben(서명하다, 비분리) · ' +
            'unterhalten(즐겁게 하다, 비분리).',
    warning: '분리형은 "아래로 내려간다"는 물리적 뜻, 비분리형은 추상적인 뜻이 많습니다.'
  },
  {
    id: 'durch', label: 'durch-', type: 'variable', level: 'B2',
    coreKo: '관통 · 끝까지',
    meaningsKo: ['통과', '끝까지', '샅샅이'],
    predictability: 'medium',
    noteKo: 'durchhalten(버텨내다, 분리) / durchsuchen(샅샅이 뒤지다, 비분리).',
    warning: '분리형은 "물리적으로 뚫고 지나간다", 비분리형은 "구석구석 미친다"에 가깝습니다.'
  },
  {
    id: 'wieder', label: 'wieder-', type: 'variable', level: 'B2',
    coreKo: '다시',
    meaningsKo: ['다시', '되돌림', '반복'],
    predictability: 'medium',
    noteKo: '거의 다 분리형이고 "다시"로 그대로 읽힙니다. ' +
            'wiederholen(반복하다) 하나만 비분리라 예외로 외우면 됩니다.',
    warning: 'wiederholen(반복하다)은 **비분리**입니다 — ich wiederhole (o) / ' +
             'ich hole wieder (x). 반면 wiedersehen(다시 만나다)은 분리형입니다.'
  },
  {
    id: 'voll', label: 'voll-', type: 'variable', level: 'B2',
    coreKo: '가득 · 완전히',
    meaningsKo: ['가득', '완성', '수행'],
    predictability: 'medium',
    noteKo: '비분리면 "완수한다"(vollenden 완성하다), 분리면 "가득 채운다"(volltanken 만땅 넣다). ' +
            '동사 수가 적습니다.',
    warning: null
  }
];
