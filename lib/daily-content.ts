// 일일/주간 숙제(레이드 제외) 콘텐츠 재화 — 수치 원본은 data/rewardTable.ts 하나뿐이다.
// 이 파일은 기존 소비처가 쓰던 이름을 그대로 유지하기 위한 얇은 재수출 계층이다.
export {
  RIFT_TIERS,
  GUARDIAN_TIERS,
  EVENT_CONTENTS,
  SAND_TABLE,
  GUARDIAN_ROTATION,
  GUARDIAN_FIXED,
  GUARDIAN_REF_WEEK,
  RAID_CARD_IMAGES,
  findTier,
  eventTierOf,
  getSandMaterials,
  type ContentMaterial,
  type ContentMaterial as Material,
  type ContentTier,
  type EventContent,
  type EventTierKey,
  type SandRow,
} from '@/data/rewardTable';

import {
  GUARDIAN_FIXED,
  GUARDIAN_REF_WEEK,
  GUARDIAN_ROTATION,
} from '@/data/rewardTable';
import { getCurrentWeekStart } from '@/types/user';

// 이번 주 가디언 (1730+ 는 주간 로테이션, 그 아래는 레벨 고정)
export function getCurrentGuardian(itemLevel: number): { name: string; element: string; image: string } {
  if (itemLevel >= 1730) {
    const refDate = new Date(GUARDIAN_REF_WEEK + 'T00:00:00+09:00');
    const currentWeek = new Date(getCurrentWeekStart() + 'T00:00:00+09:00');
    const diffWeeks = Math.round((currentWeek.getTime() - refDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const index = ((diffWeeks % GUARDIAN_ROTATION.length) + GUARDIAN_ROTATION.length) % GUARDIAN_ROTATION.length;
    return GUARDIAN_ROTATION[index];
  }
  for (const g of GUARDIAN_FIXED) {
    if (itemLevel >= g.minLevel) return g;
  }
  return { name: '가디언 토벌', element: '', image: '' };
}
