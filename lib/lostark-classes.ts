// 로스트아크 전체 직업 (한국 서버 기준)
// LostArk Armory API의 CharacterClassName 필드와 동일한 표기

export const LOSTARK_CLASS_GROUPS: { group: string; classes: string[] }[] = [
  {
    group: '전사',
    classes: ['버서커', '디스트로이어', '워로드', '홀리나이트', '슬레이어', '가디언나이트'],
  },
  {
    group: '무도가',
    classes: ['배틀마스터', '인파이터', '기공사', '창술사', '스트라이커', '브레이커'],
  },
  {
    group: '헌터',
    classes: ['데빌헌터', '호크아이', '블래스터', '스카우터', '건슬링어'],
  },
  {
    group: '마법사',
    classes: ['바드', '서머너', '아르카나', '소서리스'],
  },
  {
    group: '암살자',
    classes: ['데모닉', '블레이드', '리퍼', '소울이터'],
  },
  {
    group: '스페셜리스트',
    classes: ['도화가', '기상술사', '환수사'],
  },
];

export const ALL_LOSTARK_CLASSES: string[] = LOSTARK_CLASS_GROUPS.flatMap(g => g.classes);
