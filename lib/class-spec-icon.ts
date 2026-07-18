// 아크패시브 "깨달음" 노드로 직업 스펙을 판별해 우리 커스텀 아이콘(class-icons)에 매핑.
//
// 핵심 원리: 직업마다 두 스펙은 상호배타라, 한쪽 스펙의 시그니처 깨달음 노드 하나만
// 정확히 알면 "있으면 A / 없으면 자동으로 B"로 안전하게 갈린다 (DB 185표본으로 검증).
// sig 는 부분일치(includes) 기준 — 노드명이 "절정 I/II/III"처럼 변주돼도 잡힌다.

import { TIER_ENTRIES } from './tier-entries.generated';

type SpecRule = {
  /** 시그니처 깨달음 노드 이름(부분일치). 이 노드가 있으면 withId, 없으면 elseId */
  sig: string;
  withId: string;
  elseId: string;
};

// className(로아 API CharacterClassName) → 판별 규칙
const SPEC_RULES: Record<string, SpecRule> = {
  // 전사
  '디스트로이어': { sig: '분노의 망치',      withId: '디트 분망',      elseId: '디트 중수' },
  '슬레이어':     { sig: '포식자',          withId: '슬레 포식',      elseId: '슬레 처단' },
  '워로드':       { sig: '고독한 기사',      withId: '워로드 고기',    elseId: '워로드 전태' },
  '가디언나이트': { sig: '업화의 계승자',    withId: '가나 업화',      elseId: '가나 드드' },
  '홀리나이트':   { sig: '축복의 오라',      withId: '홀나 축오',      elseId: '홀나 심판자' },
  '발키리':       { sig: '해방자',          withId: '발키리 해방자',  elseId: '발키리 빛의기사' },
  '버서커':       { sig: '광기',            withId: '버서커 광기',    elseId: '버서커 비기' },
  // 무도가
  '배틀마스터':   { sig: '초심',            withId: '배마 초심',      elseId: '배마 오의' },
  '인파이터':     { sig: '극의 : 체술',      withId: '인파 체술',      elseId: '인파 충단' },
  '기공사':       { sig: '역천지체',        withId: '기공 역천',      elseId: '기공 세맥' },
  '창술사':       { sig: '절정',            withId: '창술 절정',      elseId: '창술 절제' },
  '스트라이커':   { sig: '일격필살',        withId: '스커 일격',      elseId: '스커 난무' },
  '브레이커':     { sig: '권왕',            withId: '브커 권왕',      elseId: '브커 수라' },
  // 헌터
  '데빌헌터':     { sig: '전술 탄환',        withId: '데헌 전탄',      elseId: '데헌 핸건' },
  '호크아이':     { sig: '죽음의 습격',      withId: '호크 죽습',      elseId: '호크 두동' },
  '블래스터':     { sig: '포격 강화',        withId: '블래 포강',      elseId: '블래 화강' },
  '스카우터':     { sig: '진화의 유산',      withId: '스카 유산',      elseId: '스카 기술' },
  '건슬링어':     { sig: '피스메이커',      withId: '건슬 피메',      elseId: '건슬 사시' },
  // 마법사
  '바드':         { sig: '절실한 구원',      withId: '바드 절구',      elseId: '바드 진용' },
  '서머너':       { sig: '상급 소환사',      withId: '서머너 상소',    elseId: '서머너 교감' },
  // sig는 '황제'(부분일치)면 황후 트리의 "황제의 자비" 노드에도 걸려 오분류됨 → 황제 전용 노드로 한정
  '아르카나':     { sig: '황제의 칙령',      withId: '알카 황제',      elseId: '알카 황후' },
  '소서리스':     { sig: '점화',            withId: '소서 점화',      elseId: '소서 환류' },
  // 암살자
  '데모닉':       { sig: '멈출 수 없는 충동', withId: '데모닉 충동',    elseId: '데모닉 억제' },
  '블레이드':     { sig: '잔재된 기운',      withId: '블레 잔재',      elseId: '블레 버스트' },
  '리퍼':         { sig: '갈증',            withId: '리퍼 갈증',      elseId: '리퍼 달소' },
  '소울이터':     { sig: '만월의 집행자',    withId: '소울 만월',      elseId: '소울 그믐' },
  // 스페셜리스트
  '도화가':       { sig: '만개',            withId: '도화가 만개',    elseId: '도화가 회귀' },
  '기상술사':     { sig: '질풍노도',        withId: '기상 질풍',      elseId: '기상 이슬비' },
  '환수사':       { sig: '야성',            withId: '환수 야성',      elseId: '환수 각성' },
  // 신규 직업(차원술사): 깨달음 1티어 노드명이 스펙명과 동일해서 그대로 시그니처로 사용
  '차원술사':     { sig: '공간 검사',        withId: '차원 공간검사',  elseId: '차원 시간관리자' },
};

// 서포터 스펙 4종(전부 시그니처 보유 스펙). 딜러/서포터 역할 필터용.
// 바드 절구 / 발키리 해방자 / 홀나 축오 / 도화가 만개
const SUPPORT_CLASSES = ['바드', '발키리', '홀리나이트', '도화가'] as const;

/** 서포터 스펙 id 4종 — DB spec_id 컬럼 기반 역할 필터용 */
export const SUPPORT_SPEC_IDS: string[] = SUPPORT_CLASSES.map(c => SPEC_RULES[c].withId);

const ICON_BY_ID = new Map(TIER_ENTRIES.map(e => [e.id, e]));

export type SpecIcon = { id: string; name: string; icon: string };

// 스펙 id → 필터 조건 역매핑 (랭킹 스펙 필터용)
// requireSig=true  → 깨달음에 sig 노드가 있는 스펙(withId)
// requireSig=false → 깨달음 데이터는 있으나 sig 노드가 없는 스펙(elseId)
const SPEC_FILTER_BY_ID = new Map<string, { className: string; sig: string; requireSig: boolean }>();
for (const [className, rule] of Object.entries(SPEC_RULES)) {
  SPEC_FILTER_BY_ID.set(rule.withId, { className, sig: rule.sig, requireSig: true });
  SPEC_FILTER_BY_ID.set(rule.elseId, { className, sig: rule.sig, requireSig: false });
}

export type SpecFilter = { className: string; sig: string; requireSig: boolean };

/** 직업(class_name)의 스펙 판별 규칙. 스펙 비교 통계·직업 단위 필터용 */
export function classRuleFor(className: string | null | undefined): (SpecRule & { className: string }) | null {
  if (!className) return null;
  const rule = SPEC_RULES[className];
  return rule ? { ...rule, className } : null;
}

/** 판별 규칙이 있는 전체 직업명 목록 (로아 API CharacterClassName 기준) */
export const ALL_CLASS_NAMES: string[] = Object.keys(SPEC_RULES);

/** 스펙 id(예: "디트 분망")로 랭킹 필터 조건을 얻는다. 알 수 없는 id면 null */
export function specFilterFor(specId: string | null | undefined): SpecFilter | null {
  if (!specId) return null;
  return SPEC_FILTER_BY_ID.get(specId) || null;
}

/** 스펙 id로 아이콘 엔트리 조회 (DB spec_id 컬럼 → 표시용). 알 수 없는 id면 null */
export function specEntryById(specId: string | null | undefined): SpecIcon | null {
  if (!specId) return null;
  const entry = ICON_BY_ID.get(specId);
  return entry ? { id: entry.id, name: entry.name, icon: entry.icon } : null;
}

/** 깨달음 노드 이름 배열로 스펙 아이콘 판별. 매칭 불가/데이터 없으면 null */
export function resolveSpecIcon(
  className: string | null | undefined,
  enlightenmentNodeNames: string[]
): SpecIcon | null {
  if (!className) return null;
  const rule = SPEC_RULES[className];
  if (!rule) return null;
  // 깨달음 데이터 자체가 없으면(저레벨 등) 추정하지 않음
  if (!enlightenmentNodeNames || enlightenmentNodeNames.length === 0) return null;

  const hasSig = enlightenmentNodeNames.some(n => !!n && n.includes(rule.sig));
  const id = hasSig ? rule.withId : rule.elseId;
  const entry = ICON_BY_ID.get(id);
  if (!entry) return null;
  return { id: entry.id, name: entry.name, icon: entry.icon };
}

/** 파싱된 arkPassive에서 깨달음 노드 이름만 추출 */
export function enlightenmentNodeNames(
  arkPassive: { effects?: { category?: string; name?: string }[] } | null | undefined
): string[] {
  if (!arkPassive?.effects) return [];
  return arkPassive.effects
    .filter(e => e?.category === '깨달음')
    .map(e => e?.name || '')
    .filter(Boolean);
}
