/*
 * pronouns.js — 대명사 격변화 (손으로 작성)
 *
 * Goethe 단어장에는 대명사가 표제어로만 들어 있고 격변화표가 없다.
 * 목차 Part 3(대명사와 기본 품사)과 Part 11(관계절)에 해당한다.
 *
 * 표 형식은 참고 페이지와 빈칸 채우기 연습 모드가 함께 쓴다.
 */

/* 인칭대명사 (목차 3-1) — 1·3·4격. 2격은 현대 독일어에서 거의 안 쓴다. */
window.PRONOUN_PERSONAL = {
  title: '인칭대명사',
  part: '3-1 인칭대명사',
  cols: ['1격 (Nom.)', '4격 (Akk.)', '3격 (Dat.)'],
  rows: [
    { label: 'ich (나)',        cells: ['ich', 'mich', 'mir'] },
    { label: 'du (너)',         cells: ['du', 'dich', 'dir'] },
    { label: 'er (그, 남성)',   cells: ['er', 'ihn', 'ihm'] },
    { label: 'sie (그녀, 여성)', cells: ['sie', 'sie', 'ihr'] },
    { label: 'es (그것, 중성)', cells: ['es', 'es', 'ihm'] },
    { label: 'wir (우리)',      cells: ['wir', 'uns', 'uns'] },
    { label: 'ihr (너희)',      cells: ['ihr', 'euch', 'euch'] },
    { label: 'sie (그들)',      cells: ['sie', 'sie', 'ihnen'] },
    { label: 'Sie (당신, 존칭)', cells: ['Sie', 'Sie', 'Ihnen'] }
  ],
  note: 'er 의 4격만 ihn 으로 따로 있고, 나머지 남성 3격은 ihm 이다. ' +
        '존칭 Sie 는 언제나 대문자.'
};

/* 재귀대명사 (목차 4-3) — 3인칭은 전부 sich 하나로 끝난다 */
window.PRONOUN_REFLEXIVE = {
  title: '재귀대명사',
  part: '4-3 재귀동사',
  cols: ['4격 (Akk.)', '3격 (Dat.)'],
  rows: [
    { label: 'ich', cells: ['mich', 'mir'] },
    { label: 'du',  cells: ['dich', 'dir'] },
    { label: 'er / sie / es', cells: ['sich', 'sich'] },
    { label: 'wir', cells: ['uns', 'uns'] },
    { label: 'ihr', cells: ['euch', 'euch'] },
    { label: 'sie / Sie', cells: ['sich', 'sich'] }
  ],
  note: '1·2인칭 단수만 3격과 4격이 다르다 (mich/mir, dich/dir). ' +
        'Ich wasche mich. ↔ Ich wasche mir die Hände.'
};

/* 소유관사 (목차 3-2) — 어간만 다르고 어미는 ein- 과 완전히 같다 */
window.PRONOUN_POSSESSIVE = {
  title: '소유관사 어간',
  part: '3-2 소유관사',
  cols: ['소유자', '어간'],
  rows: [
    { label: 'ich',       cells: ['나의', 'mein-'] },
    { label: 'du',        cells: ['너의', 'dein-'] },
    { label: 'er / es',   cells: ['그의', 'sein-'] },
    { label: 'sie (단수)', cells: ['그녀의', 'ihr-'] },
    { label: 'wir',       cells: ['우리의', 'unser-'] },
    { label: 'ihr',       cells: ['너희의', 'euer-'] },
    { label: 'sie (복수)', cells: ['그들의', 'ihr-'] },
    { label: 'Sie',       cells: ['당신의', 'Ihr-'] }
  ],
  note: '어미는 부정관사 ein- 과 똑같다. euer 는 어미가 붙으면 e 가 떨어진다 (euer → eure, eurem).'
};

/* 관계대명사 (목차 11-1) — 정관사와 거의 같고 2격·3격 복수만 다르다 */
window.PRONOUN_RELATIVE = {
  title: '관계대명사',
  part: '11-1 관계절',
  cols: ['남성', '여성', '중성', '복수'],
  rows: [
    { label: '1격 (Nom.)', cells: ['der', 'die', 'das', 'die'] },
    { label: '4격 (Akk.)', cells: ['den', 'die', 'das', 'die'] },
    { label: '3격 (Dat.)', cells: ['dem', 'der', 'dem', 'denen'] },
    { label: '2격 (Gen.)', cells: ['dessen', 'deren', 'dessen', 'deren'] }
  ],
  note: '정관사와 같지만 두 곳만 다르다: 3격 복수 denen, 2격 dessen/deren. ' +
        '격은 관계절 안에서 하는 역할이 정하고, 성·수는 선행사가 정한다.'
};

/* 의문대명사 (목차 3-4) */
window.PRONOUN_INTERROGATIVE = {
  title: '의문대명사',
  part: '3-4 관계대명사와 의문대명사',
  cols: ['사람', '사물'],
  rows: [
    { label: '1격 (Nom.)', cells: ['wer', 'was'] },
    { label: '4격 (Akk.)', cells: ['wen', 'was'] },
    { label: '3격 (Dat.)', cells: ['wem', '—'] },
    { label: '2격 (Gen.)', cells: ['wessen', '—'] }
  ],
  note: '사물은 3·4격에서 전치사와 붙어 wo(r)- 형태가 된다: ' +
        'Worauf wartest du? (was + auf), Womit? (was + mit).'
};

/* 지시대명사 (목차 3-2) */
window.PRONOUN_DEMONSTRATIVE = {
  title: '지시대명사 dieser',
  part: '3-2 지시대명사',
  cols: ['남성', '여성', '중성', '복수'],
  rows: [
    { label: '1격 (Nom.)', cells: ['dieser', 'diese', 'dieses', 'diese'] },
    { label: '4격 (Akk.)', cells: ['diesen', 'diese', 'dieses', 'diese'] },
    { label: '3격 (Dat.)', cells: ['diesem', 'dieser', 'diesem', 'diesen'] },
    { label: '2격 (Gen.)', cells: ['dieses', 'dieser', 'dieses', 'dieser'] }
  ],
  note: 'jener·jeder·welcher·mancher·solcher 도 어미가 같다. ' +
        '정관사와 어미가 거의 일치한다 (der → dieser, dem → diesem).'
};

window.PRONOUN_TABLES = [
  window.PRONOUN_PERSONAL,
  window.PRONOUN_REFLEXIVE,
  window.PRONOUN_POSSESSIVE,
  window.PRONOUN_RELATIVE,
  window.PRONOUN_INTERROGATIVE,
  window.PRONOUN_DEMONSTRATIVE
];
