/* ── Signal Survivors: 56 Skill Combination Definitions ── */

export type Element = '빛' | '암흑' | '흙' | '불' | '물' | '전기';
export type Tier = 'SS' | 'S' | 'A' | 'B' | 'C';

export interface SkillDef {
  id: number;
  name: string;
  elements: [Element, Element, Element] | [Element, Element];
  tier: Tier;
  effectType:
    | 'blackhole' | 'lightning' | 'wave' | 'explosion' | 'beam'
    | 'projectile' | 'aura' | 'field' | 'trap' | 'vortex'
    | 'rain' | 'summon' | 'chain' | 'shield';
  description: string;
}

export const ELEMENT_COLORS: Record<Element, { from: string; to: string }> = {
  '빛':   { from: '#fef08a', to: '#fbbf24' },
  '암흑': { from: '#7c3aed', to: '#1e1b4b' },
  '흙':   { from: '#a16207', to: '#65a30d' },
  '불':   { from: '#ef4444', to: '#f97316' },
  '물':   { from: '#3b82f6', to: '#06b6d4' },
  '전기': { from: '#a78bfa', to: '#38bdf8' },
};

export const ELEMENT_LIST: Element[] = ['빛', '암흑', '흙', '불', '물', '전기'];

export const TIER_ORDER: Tier[] = ['SS', 'S', 'A', 'B', 'C'];

export const TIER_COLORS: Record<Tier, string> = {
  'SS': '#ff2d55',
  'S':  '#ff9500',
  'A':  '#af52de',
  'B':  '#007aff',
  'C':  '#8e8e93',
};

/** Returns the primary (from) color hex for an element. */
export function getElementColor(el: Element): string {
  return ELEMENT_COLORS[el].from;
}

/* ── 56 Skills ── */

export const SKILLS: SkillDef[] = [
  // ━━ SS (6) ━━
  { id: 1,  name: '심판의 뇌격',   elements: ['빛', '암흑', '전기'],   tier: 'SS', effectType: 'explosion',  description: '거대 구체 + 전기 방전 전방위' },
  { id: 2,  name: '종말의 일식',   elements: ['빛', '암흑', '불'],     tier: 'SS', effectType: 'rain',       description: '화면 전체 흑염 비' },
  { id: 3,  name: '심연의 조류',   elements: ['빛', '암흑', '물'],     tier: 'SS', effectType: 'vortex',     description: '차원 균열 흡인 + 충격파' },
  { id: 4,  name: '프리즘 증기',   elements: ['불', '물', '빛'],       tier: 'SS', effectType: 'beam',       description: '무지개 7색 광선 방사' },
  { id: 5,  name: '독무의 늪',     elements: ['불', '물', '암흑'],     tier: 'SS', effectType: 'field',      description: '독안개 전체 지속딜' },
  { id: 6,  name: '천둥벽력',       elements: ['전기', '흙', '빛'],     tier: 'SS', effectType: 'lightning',  description: '빛기둥 3개 + 전류 연결 삼각형' },

  // ━━ S (6) ━━
  { id: 7,  name: '영겁의 광휘',   elements: ['빛', '빛', '빛'],       tier: 'S',  effectType: 'aura',       description: '빛 오오라 + 적 투사체 소멸' },
  { id: 8,  name: '특이점',         elements: ['암흑', '암흑', '암흑'], tier: 'S',  effectType: 'blackhole',  description: '블랙홀 흡인 + 즉사 + 폭발' },
  { id: 9,  name: '대지의 심장',   elements: ['흙', '흙', '흙'],       tier: 'S',  effectType: 'summon',     description: '진동 + 돌기둥 8개 원형' },
  { id: 10, name: '업화연옥',       elements: ['불', '불', '불'],       tier: 'S',  effectType: 'vortex',     description: '불기둥 회오리 나선 확장' },
  { id: 11, name: '대해일',         elements: ['물', '물', '물'],       tier: 'S',  effectType: 'wave',       description: '거대 파도 밀어냄' },
  { id: 12, name: '테슬라 필드',   elements: ['전기', '전기', '전기'], tier: 'S',  effectType: 'aura',       description: '전자기장 자동 번개' },

  // ━━ A (12) ━━
  { id: 13, name: '황혼의 창',     elements: ['빛', '빛', '암흑'],     tier: 'A',  effectType: 'projectile', description: '빛 창 투척 + 암흑 잔상 폭발' },
  { id: 14, name: '이클립스 오브', elements: ['암흑', '암흑', '빛'],   tier: 'A',  effectType: 'blackhole',  description: '검은 구체 공전 + 빛 폭발' },
  { id: 15, name: '혼돈의 고리',   elements: ['빛', '암흑'],           tier: 'A',  effectType: 'aura',       description: '빛암흑 나선 링 회전' },
  { id: 16, name: '흑요석 폭격',   elements: ['불', '불', '물'],       tier: 'A',  effectType: 'projectile', description: '흑요석 파편 산탄' },
  { id: 17, name: '열수 간헐천',   elements: ['물', '물', '불'],       tier: 'A',  effectType: 'summon',     description: '뜨거운 물기둥 랜덤 분출' },
  { id: 18, name: '증기 폭발',     elements: ['불', '물'],             tier: 'A',  effectType: 'explosion',  description: '전방 부채꼴 증기' },
  { id: 19, name: '지진 방전',     elements: ['흙', '흙', '전기'],     tier: 'A',  effectType: 'lightning',  description: '균열 + 전류 질주' },
  { id: 20, name: '자기 폭풍',     elements: ['전기', '전기', '흙'],   tier: 'A',  effectType: 'vortex',     description: '전자기 흡인 + 돌기둥' },
  { id: 21, name: '뇌석',           elements: ['흙', '전기'],           tier: 'A',  effectType: 'projectile', description: '전기 바위 투사체 + 연쇄' },

  // ━━ B (18) ━━
  { id: 22, name: '마그마 분출',   elements: ['불', '불', '흙'],       tier: 'B',  effectType: 'projectile', description: '용암 덩어리 + 장판' },
  { id: 23, name: '화산탄',         elements: ['흙', '흙', '불'],       tier: 'B',  effectType: 'projectile', description: '불타는 바위 포물선' },
  { id: 24, name: '용암류',         elements: ['불', '흙'],             tier: 'B',  effectType: 'field',      description: '이동 흔적 용암 장판' },
  { id: 25, name: '감전 해류',     elements: ['물', '물', '전기'],     tier: 'B',  effectType: 'chain',      description: '물줄기 + 감전 전이' },
  { id: 26, name: '번개 폭우',     elements: ['전기', '전기', '물'],   tier: 'B',  effectType: 'rain',       description: '전기 물방울 폭격' },
  { id: 27, name: '전기 수구',     elements: ['물', '전기'],           tier: 'B',  effectType: 'projectile', description: '물 구체 + 전기 투사체' },
  { id: 28, name: '섬광탄',         elements: ['빛', '빛', '전기'],     tier: 'B',  effectType: 'explosion',  description: '빛 폭발 + 전기 충격파 스턴' },
  { id: 29, name: '플라즈마 아크', elements: ['전기', '전기', '빛'],   tier: 'B',  effectType: 'chain',      description: '적 3체 아크 연결' },
  { id: 30, name: '광속 방전',     elements: ['빛', '전기'],           tier: 'B',  effectType: 'lightning',  description: '즉시 착탄 볼트' },
  { id: 31, name: '심연의 수렁',   elements: ['암흑', '암흑', '흙'],   tier: 'B',  effectType: 'trap',       description: '검은 수렁 흡인 + 침하' },
  { id: 32, name: '묘비석',         elements: ['흙', '흙', '암흑'],     tier: 'B',  effectType: 'summon',     description: '검은 돌기둥 소환' },
  { id: 33, name: '암석 함정',     elements: ['암흑', '흙'],           tier: 'B',  effectType: 'trap',       description: '보이지 않는 함정' },
  { id: 34, name: '성화',           elements: ['불', '불', '빛'],       tier: 'B',  effectType: 'projectile', description: '금빛 불꽃 + 정화 폭발' },
  { id: 35, name: '태양의 화살',   elements: ['빛', '빛', '불'],       tier: 'B',  effectType: 'beam',       description: '태양광 집중 빔' },
  { id: 36, name: '점화광',         elements: ['불', '빛'],             tier: 'B',  effectType: 'aura',       description: '빛 구슬 공전 + 화염빔' },
  { id: 37, name: '저주의 조류',   elements: ['물', '물', '암흑'],     tier: 'B',  effectType: 'wave',       description: '검은 물결 저주' },
  { id: 38, name: '칠흑의 촉수',   elements: ['암흑', '암흑', '물'],   tier: 'B',  effectType: 'summon',     description: '촉수 3개 소환 속박' },
  { id: 39, name: '독수',           elements: ['물', '암흑'],           tier: 'B',  effectType: 'projectile', description: '독 물방울 투사체' },

  // ━━ C (14) ━━
  { id: 40, name: '플레어 스파크', elements: ['불', '불', '전기'],     tier: 'C',  effectType: 'projectile', description: '불 + 전기 스파크' },
  { id: 41, name: '아크 플레임',   elements: ['전기', '전기', '불'],   tier: 'C',  effectType: 'chain',      description: '전기 체인 + 화상' },
  { id: 42, name: '전열탄',         elements: ['불', '전기'],           tier: 'C',  effectType: 'projectile', description: '화상+감전 투사체' },
  { id: 43, name: '흑염탄',         elements: ['불', '불', '암흑'],     tier: 'C',  effectType: 'projectile', description: '검은 불 투사체' },
  { id: 44, name: '지옥불 오브',   elements: ['암흑', '암흑', '불'],   tier: 'C',  effectType: 'aura',       description: '암흑 구체 + 화염 오오라' },
  { id: 45, name: '저주화염',       elements: ['불', '암흑'],           tier: 'C',  effectType: 'projectile', description: '화염 + 암흑 파편' },
  { id: 46, name: '진흙 파도',     elements: ['물', '물', '흙'],       tier: 'C',  effectType: 'wave',       description: '탁한 물결 둔화' },
  { id: 47, name: '머드 트랩',     elements: ['흙', '흙', '물'],       tier: 'C',  effectType: 'trap',       description: '진흙 장판 극둔화' },
  { id: 48, name: '점토탄',         elements: ['물', '흙'],             tier: 'C',  effectType: 'projectile', description: '무거운 점토 투사체' },
  { id: 49, name: '성수 세례',     elements: ['물', '물', '빛'],       tier: 'C',  effectType: 'field',      description: '빛나는 물 장판 회복' },
  { id: 50, name: '무지개 광선',   elements: ['빛', '빛', '물'],       tier: 'C',  effectType: 'beam',       description: '7색 부채꼴 빔' },
  { id: 51, name: '성수탄',         elements: ['물', '빛'],             tier: 'C',  effectType: 'projectile', description: '빛나는 물방울' },
  { id: 52, name: '수정 방벽',     elements: ['흙', '흙', '빛'],       tier: 'C',  effectType: 'shield',     description: '수정 기둥 3개 방어' },
  { id: 53, name: '광석 산탄',     elements: ['빛', '빛', '흙'],       tier: 'C',  effectType: 'projectile', description: '보석 파편 부채꼴' },
  { id: 54, name: '보석탄',         elements: ['흙', '빛'],             tier: 'C',  effectType: 'projectile', description: '금빛 돌 반사' },
  { id: 55, name: '암석 지뢰',     elements: ['흙', '암흑'],           tier: 'C',  effectType: 'trap',       description: '검은 돌 매설 폭발' },
  { id: 56, name: '암전 펄스',     elements: ['전기', '암흑'],         tier: 'C',  effectType: 'explosion',  description: '보라 전기 파동 정전' },
];
