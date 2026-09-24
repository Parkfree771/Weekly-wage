// 직업(각인) 티어 데이터 레이어. 엔트리는 자동 생성(scripts/gen-tier-icons.mjs).
// 집계: "남들이 그 직업을 못 이긴다고 한 정도"를 표 수로 정규화한 평균 → 1~5티어.
// 표 없는 초기에는 SEED(통념 메타 placeholder)를 prior로 사용.

import { TIER_ENTRIES, type TierEntry } from './tier-entries.generated';

export type { TierEntry };
export type TierClass = TierEntry;

export const TIER_CLASSES: TierClass[] = TIER_ENTRIES;

// '기타'(신규 직업)는 맨 앞에 노출
export const GROUP_ORDER = ['기타', '전사', '무도가', '헌터', '마법사', '암살자', '스페셜리스트'];

// compareTo: 직전 시즌 id. 지정하면 그 시즌 대비 티어가 오른 직업에 '상승' 표식.
export type Season = { id: string; label: string; basis: string; compareTo?: string };

// 서포터 직업각인 스펙. 딜러와 1:1 딜 비교가 무의미하므로 티어표를 분리한다.
// (바드=절실한 구원, 도화가=만개, 홀나=축복, 발키리=해방자 → 전부 서포터)
// 나머지는 전부 딜러. (도화가 회귀는 딜러)
export const SUPPORT_IDS = new Set<string>([
  '바드 절구',
  '도화가 만개',
  '홀나 축오',
  '발키리 해방자',
]);

export type TierRole = 'dealer' | 'support';

export function roleOf(id: string): TierRole {
  return SUPPORT_IDS.has(id) ? 'support' : 'dealer';
}
