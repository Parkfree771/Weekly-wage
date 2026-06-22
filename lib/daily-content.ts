// 일일/주간 숙제(레이드 제외) 콘텐츠 재화 데이터.
// 수치/이미지는 마이페이지(app/mypage/page.tsx)의 콘텐츠 정의와 동일 기준.
// ※ 추후 마이페이지도 이 모듈을 import 하도록 정리하면 중복 제거 가능.

export type Material = { image: string; label: string; amount: number };

export type ContentTier = { minLevel: number; label: string; materials: Material[] };

// ── 1) 균열 / 전선 / 카던 — 1회(노휴게) 기준 재화 (레벨 내림차순) ──
export const RIFT_TIERS: ContentTier[] = [
  { minLevel: 1750, label: '1750 균열', materials: [
    { image: '/top-destiny-destruction-stone5.webp', label: '파괴석 결정', amount: 438.8 },
    { image: '/top-destiny-guardian-stone5.webp', label: '수호석 결정', amount: 1177.5 },
    { image: '/top-destiny-breakthrough-stone5.webp', label: '위대한 돌파석', amount: 18.8 },
    { image: '/destiny-shard-bag-large5.webp', label: '운명의 파편', amount: 54412.6 },
  ] },
  { minLevel: 1730, label: '1730 균열', materials: [
    { image: '/top-destiny-destruction-stone5.webp', label: '파괴석 결정', amount: 361.5 },
    { image: '/top-destiny-guardian-stone5.webp', label: '수호석 결정', amount: 1092.2 },
    { image: '/top-destiny-breakthrough-stone5.webp', label: '위대한 돌파석', amount: 17.7 },
    { image: '/destiny-shard-bag-large5.webp', label: '운명의 파편', amount: 43801.2 },
  ] },
  { minLevel: 1720, label: '1720 전선', materials: [
    { image: '/destiny-destruction-stone5-v2.webp', label: '파괴석', amount: 745.8 },
    { image: '/destiny-guardian-stone5-v2.webp', label: '수호석', amount: 2058.2 },
    { image: '/destiny-breakthrough-stone5.webp', label: '돌파석', amount: 47 },
    { image: '/destiny-shard-bag-large5.webp', label: '운명의 파편', amount: 40311.9 },
  ] },
  { minLevel: 1700, label: '1700 전선', materials: [
    { image: '/destiny-destruction-stone5-v2.webp', label: '파괴석', amount: 593.9 },
    { image: '/destiny-guardian-stone5-v2.webp', label: '수호석', amount: 1733.4 },
    { image: '/destiny-breakthrough-stone5.webp', label: '돌파석', amount: 41.3 },
    { image: '/destiny-shard-bag-large5.webp', label: '운명의 파편', amount: 33557 },
  ] },
  { minLevel: 1680, label: '1680 전선', materials: [
    { image: '/destiny-destruction-stone5-v2.webp', label: '파괴석', amount: 416.7 },
    { image: '/destiny-guardian-stone5-v2.webp', label: '수호석', amount: 1190.3 },
    { image: '/destiny-breakthrough-stone5.webp', label: '돌파석', amount: 36.2 },
    { image: '/destiny-shard-bag-large5.webp', label: '운명의 파편', amount: 32445.4 },
  ] },
];

// ── 2) 가디언 토벌 — 1회 기준 재화 ──
export const GUARDIAN_TIERS: ContentTier[] = [
  { minLevel: 1750, label: '1750 가토', materials: [{ image: '/1fpqrjqghk.webp', label: '1레벨 보석', amount: 11.9 }] },
  { minLevel: 1730, label: '1730 가토', materials: [{ image: '/1fpqrjqghk.webp', label: '1레벨 보석', amount: 10.5 }] },
  { minLevel: 1720, label: '1720 가토', materials: [{ image: '/1fpqrjqghk.webp', label: '1레벨 보석', amount: 6.4 }] },
  { minLevel: 1700, label: '1700 가토', materials: [{ image: '/1fpqrjqghk.webp', label: '1레벨 보석', amount: 5.3 }] },
  { minLevel: 1680, label: '1680 가토', materials: [{ image: '/1fpqrjqghk.webp', label: '1레벨 보석', amount: 5.2 }] },
];

// ── 3) 카오스 게이트 / 필드보스 — 1회 기준 + 주간 발생 횟수 ──
export type EventContent = {
  key: string;
  name: string;
  image: string;
  perWeek: number; // 주간 발생 횟수
  days: number[];  // 발생 요일 (0=일 ~ 6=토, KST 6시 리셋 기준)
  byTier: Record<'1730' | '1750', Material[]>;
};
export const EVENT_CONTENTS: EventContent[] = [
  {
    key: 'gate', name: '카오스 게이트', image: '/chaos-gate.webp', perWeek: 4, days: [1, 4, 6, 0],
    byTier: {
      '1730': [
        { image: '/breath-lava5.webp', label: '용숨', amount: 6 },
        { image: '/breath-glacier5.webp', label: '빙숨', amount: 6 },
        { image: '/gold.webp', label: '귀속골드', amount: 3500 },
        { image: '/destiny-shard-bag-large5.webp', label: '운명의 파편', amount: 12000 },
        { image: '/1fpqrjqghk.webp', label: '1레벨 보석', amount: 6 },
      ],
      '1750': [
        { image: '/breath-lava5.webp', label: '용숨', amount: 7 },
        { image: '/breath-glacier5.webp', label: '빙숨', amount: 7 },
        { image: '/gold.webp', label: '귀속골드', amount: 5000 },
        { image: '/destiny-shard-bag-large5.webp', label: '운명의 파편', amount: 13200 },
        { image: '/1fpqrjqghk.webp', label: '1레벨 보석', amount: 7 },
      ],
    },
  },
  {
    key: 'boss', name: '필드보스', image: '/field-boss.webp', perWeek: 3, days: [2, 5, 0],
    byTier: {
      '1730': [
        { image: '/top-destiny-destruction-stone5.webp', label: '파괴석 결정', amount: 486.3 },
        { image: '/top-destiny-guardian-stone5.webp', label: '수호석 결정', amount: 1484.4 },
        { image: '/top-destiny-breakthrough-stone5.webp', label: '위대한 돌파석', amount: 41.1 },
        { image: '/breath-lava5.webp', label: '용숨', amount: 3 },
        { image: '/breath-glacier5.webp', label: '빙숨', amount: 3 },
        { image: '/1fpqrjqghk.webp', label: '1레벨 보석', amount: 21 },
        { image: '/cjstkd.webp', label: '천상의 가호', amount: 0.6 },
      ],
      '1750': [
        { image: '/top-destiny-destruction-stone5.webp', label: '파괴석 결정', amount: 699.3 },
        { image: '/top-destiny-guardian-stone5.webp', label: '수호석 결정', amount: 2077.3 },
        { image: '/top-destiny-breakthrough-stone5.webp', label: '위대한 돌파석', amount: 51 },
        { image: '/breath-lava5.webp', label: '용숨', amount: 3 },
        { image: '/breath-glacier5.webp', label: '빙숨', amount: 3 },
        { image: '/1fpqrjqghk.webp', label: '1레벨 보석', amount: 21 },
        { image: '/cjstkd.webp', label: '천상의 가호', amount: 0.5 },
      ],
    },
  },
];

// ── 4) 할의 모래시계 — 주간 1회, 보상강화 0~5 (레벨 1730/1750) ──
type SandRow = { gems: number; stones: number; lavaBreath: number; glacierBreath: number };
const SAND_1750: SandRow[] = [
  { gems: 6, stones: 12, lavaBreath: 12, glacierBreath: 12 },
  { gems: 12, stones: 24, lavaBreath: 24, glacierBreath: 24 },
  { gems: 18, stones: 36, lavaBreath: 36, glacierBreath: 36 },
  { gems: 24, stones: 48, lavaBreath: 48, glacierBreath: 48 },
  { gems: 30, stones: 60, lavaBreath: 60, glacierBreath: 60 },
  { gems: 36, stones: 72, lavaBreath: 72, glacierBreath: 72 },
];
const SAND_1730: SandRow[] = [
  { gems: 15, stones: 30, lavaBreath: 10, glacierBreath: 10 },
  { gems: 30, stones: 36, lavaBreath: 20, glacierBreath: 20 },
  { gems: 45, stones: 42, lavaBreath: 30, glacierBreath: 30 },
  { gems: 60, stones: 48, lavaBreath: 40, glacierBreath: 40 },
  { gems: 75, stones: 54, lavaBreath: 50, glacierBreath: 50 },
  { gems: 90, stones: 60, lavaBreath: 60, glacierBreath: 60 },
];

// 보상강화 레벨(0~5)의 모래시계 1회 보상을 Material[] 로 변환
export function getSandMaterials(level1750: boolean, enhance: number): Material[] {
  const rows = level1750 ? SAND_1750 : SAND_1730;
  const r = rows[Math.max(0, Math.min(5, enhance))];
  // 모래시계 보석은 상위 레벨(1750=3레벨/1730=2레벨)이라 1레벨로 환산(×9 / ×3)
  const gemTo1Lv = level1750 ? 9 : 3;
  return [
    { image: '/1fpqrjqghk.webp', label: '1레벨 보석', amount: r.gems * gemTo1Lv },
    { image: '/top-destiny-breakthrough-stone5.webp', label: '위대한 돌파석', amount: r.stones },
    { image: '/breath-lava5.webp', label: '용숨', amount: r.lavaBreath },
    { image: '/breath-glacier5.webp', label: '빙숨', amount: r.glacierBreath },
  ];
}

// ── 가디언 토벌 주간 로테이션 (히어로 이미지/이름용) ──
import { getCurrentWeekStart } from '@/types/user';

const GUARDIAN_ROTATION = [
  { name: '베스칼', element: '화구', image: '/qptm.webp' },
  { name: '루멘칼리고', element: '암구', image: '/fnaps.webp' },
  { name: '가르가디스', element: '토구', image: '/rkfm.webp' },
  { name: '스콜라키아', element: '토구', image: '/tmzhf.webp' },
  { name: '크라티오스', element: '뇌구', image: '/zmfk.webp' },
  { name: '아게오로스', element: '세구', image: '/dkrp.webp' },
  { name: '드렉탈라스', element: '화구', image: '/emfpr.webp' },
  { name: '소나벨', element: '암구', image: '/thsk.webp' },
];
const GUARDIAN_FIXED = [
  { minLevel: 1720, name: '크라티오스', element: '뇌구', image: '/zmfk.webp' },
  { minLevel: 1700, name: '드렉탈라스', element: '화구', image: '/emfpr.webp' },
  { minLevel: 1680, name: '스콜라키아', element: '토구', image: '/tmzhf.webp' },
];
const GUARDIAN_REF_WEEK = '2026-02-25'; // 기준주(수) = 베스칼(인덱스 0)

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
  return { name: '가디언 토벌', element: '', image: '/qptm.webp' };
}

// 선택 레벨에 맞는 티어 찾기 (가장 높은 minLevel ≤ level)
export function findTier(tiers: ContentTier[], level: number): ContentTier {
  return tiers.find(t => level >= t.minLevel) || tiers[tiers.length - 1];
}

// 전체 레벨 선택지 (높은 순)
export const LEVEL_OPTIONS = [1750, 1730, 1720, 1700, 1680];
