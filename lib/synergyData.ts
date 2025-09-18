export interface SynergyEffect {
  type: '피해 증가' | '방어력 감소' | '치명타 적중률 증가' | '치명타 피해 증가' | '백/헤드 피해 증가' | '공/이속 증가' | '공격력 증가';
  value: number;
}

export interface ClassInfo {
  name: string;
  category: '전사' | '무도가' | '헌터' | '마법사' | '암살자' | '스페셜리스트';
  synergies: SynergyEffect[];
  isSupporter?: boolean;
}

export interface PartyMember {
  position: number;
  class: string | null;
}

export interface RaidComposition {
  party1: PartyMember[];
  party2: PartyMember[];
}

export interface SynergyAnalysis {
  type: string;
  currentValue: number;
  maxEffectiveValue: number;
  efficiency: number;
  status: 'optimal' | 'excessive' | 'insufficient';
  providedBy: string[];
}

export interface SwapRecommendation {
  party1Position: number;
  party2Position: number;
  party1Class: string;
  party2Class: string;
  efficiencyGain: number;
  reason: string;
}

export const SYNERGY_DATA: { [key: string]: ClassInfo } = {
  // 전사
  '워로드': {
    name: '워로드',
    category: '전사',
    synergies: [
      { type: '방어력 감소', value: 12 },
      { type: '피해 증가', value: 4 },
      { type: '백/헤드 피해 증가', value: 5 }
    ]
  },
  '슬레이어': {
    name: '슬레이어',
    category: '전사',
    synergies: [{ type: '피해 증가', value: 6 }]
  },
  '디스트로이어': {
    name: '디스트로이어',
    category: '전사',
    synergies: [{ type: '방어력 감소', value: 12 }]
  },
  '딜키리': {
    name: '딜키리',
    category: '전사',
    synergies: [{ type: '치명타 피해 증가', value: 8 }]
  },
  '버서커': {
    name: '버서커',
    category: '전사',
    synergies: [{ type: '피해 증가', value: 6 }]
  },
  '홀리나이트': {
    name: '홀리나이트',
    category: '전사',
    synergies: [],
    isSupporter: true
  },
  '폿키리': {
    name: '폿키리',
    category: '전사',
    synergies: [],
    isSupporter: true
  },

  // 무도가
  '기공사': {
    name: '기공사',
    category: '무도가',
    synergies: [{ type: '공격력 증가', value: 6 }]
  },
  '배틀마스터': {
    name: '배틀마스터',
    category: '무도가',
    synergies: [{ type: '치명타 적중률 증가', value: 10 }]
  },
  '브레이커': {
    name: '브레이커',
    category: '무도가',
    synergies: [{ type: '피해 증가', value: 6 }]
  },
  '스트라이커': {
    name: '스트라이커',
    category: '무도가',
    synergies: [{ type: '치명타 적중률 증가', value: 10 }]
  },
  '인파이터': {
    name: '인파이터',
    category: '무도가',
    synergies: [{ type: '피해 증가', value: 6 }]
  },
  '창술사': {
    name: '창술사',
    category: '무도가',
    synergies: [{ type: '치명타 피해 증가', value: 8 }]
  },

  // 헌터
  '건슬링어': {
    name: '건슬링어',
    category: '헌터',
    synergies: [{ type: '치명타 적중률 증가', value: 10 }]
  },
  '데빌헌터': {
    name: '데빌헌터',
    category: '헌터',
    synergies: [{ type: '치명타 적중률 증가', value: 10 }]
  },
  '블래스터': {
    name: '블래스터',
    category: '헌터',
    synergies: [{ type: '방어력 감소', value: 12 }]
  },
  '호크아이': {
    name: '호크아이',
    category: '헌터',
    synergies: [{ type: '피해 증가', value: 6 }]
  },
  '스카우터': {
    name: '스카우터',
    category: '헌터',
    synergies: [{ type: '공격력 증가', value: 6 }]
  },

  // 마법사
  '서머너': {
    name: '서머너',
    category: '마법사',
    synergies: [{ type: '방어력 감소', value: 12 }]
  },
  '아르카나': {
    name: '아르카나',
    category: '마법사',
    synergies: [{ type: '치명타 적중률 증가', value: 10 }]
  },
  '소서리스': {
    name: '소서리스',
    category: '마법사',
    synergies: [{ type: '피해 증가', value: 6 }]
  },
  '환수사': {
    name: '환수사',
    category: '마법사',
    synergies: [{ type: '방어력 감소', value: 12 }]
  },
  '바드': {
    name: '바드',
    category: '마법사',
    synergies: [],
    isSupporter: true
  },

  // 암살자
  '블레이드': {
    name: '블레이드',
    category: '암살자',
    synergies: [
      { type: '공/이속 증가', value: 12.8 },
      { type: '피해 증가', value: 4 },
      { type: '백/헤드 피해 증가', value: 5 }
    ]
  },
  '데모닉': {
    name: '데모닉',
    category: '암살자',
    synergies: [{ type: '피해 증가', value: 6 }]
  },
  '리퍼': {
    name: '리퍼',
    category: '암살자',
    synergies: [{ type: '방어력 감소', value: 12 }]
  },
  '소울이터': {
    name: '소울이터',
    category: '암살자',
    synergies: [{ type: '피해 증가', value: 6 }]
  },

  // 스페셜리스트
  '기상술사': {
    name: '기상술사',
    category: '스페셜리스트',
    synergies: [{ type: '치명타 적중률 증가', value: 10 }]
  },
  '도화가': {
    name: '도화가',
    category: '스페셜리스트',
    synergies: [],
    isSupporter: true
  }
};

export const CLASS_LIST = Object.keys(SYNERGY_DATA);

export const SYNERGY_CATEGORIES = [
  '전사', '무도가', '헌터', '마법사', '암살자', '스페셜리스트'
] as const;

export const SYNERGY_WEIGHTS = {
  '방어력 감소': 1.0,
  '치명타 적중률 증가': 0.9,
  '백/헤드 피해 증가': 0.8,
  '피해 증가': 0.7,
  '치명타 피해 증가': 0.6,
  '공/이속 증가': 0.5,
  '공격력 증가': 0.4
};

export const CLASS_PRIORITY = {
  // Tier S
  '워로드': 100,
  '블레이드': 95,
  
  // Tier A
  '배틀마스터': 90,
  '스트라이커': 90,
  '서머너': 88,
  
  // Tier B
  '디스트로이어': 85,
  '블래스터': 85,
  '리퍼': 85,
  '환수사': 85,
  
  // Tier C
  '건슬링어': 80,
  '데빌헌터': 80,
  '아르카나': 80,
  '기상술사': 80,
  '창술사': 75,
  '딜키리': 75,
  
  // Tier D
  '슬레이어': 70,
  '버서커': 70,
  '브레이커': 70,
  '인파이터': 70,
  '호크아이': 70,
  '소서리스': 70,
  '데모닉': 70,
  '소울이터': 70,
  '기공사': 65,
  '스카우터': 65,
  
  // 서포터
  '홀리나이트': 95,
  '바드': 95,
  '도화가': 95,
  '폿키리': 95
};