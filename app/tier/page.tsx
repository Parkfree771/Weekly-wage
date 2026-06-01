import { getTierStats } from '@/lib/tier-server';
import TierResults from '@/components/tier/TierResults';
import type { TierStats } from '@/lib/tier-server';

// 30분마다 재생성(ISR) → 통계 스냅샷 캐시와 함께 DB 부담 최소화
export const revalidate = 1800;

export default async function TierPage() {
  let stats: TierStats | null = null;
  try {
    stats = await getTierStats();
  } catch {
    stats = null;
  }
  return <TierResults stats={stats} />;
}
