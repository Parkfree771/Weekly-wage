// 홈 맨 위 띠의 "판매 중 패키지" (서버 전용).
//
// 최근 글 몇 개만 읽어 판매 중인 것만 남긴다 — 판매 중인 패키지는 거의 항상 최근 글이다.
// 홈은 시세 크론이 올릴 때만 재생성되므로(app/page.tsx) 읽기는 "재생성 1회당 SCAN 건"이고 방문자 수와 무관하다.
// 효율 계산은 시세가 필요해 브라우저에서 한다(HeroPackageCard) — 여기서는 글만 넘긴다.

import { getAdminFirestore } from '@/lib/firebase-admin';
import { renewPostIcons } from '@/lib/package-shared';
import { isSaleEnded } from '@/lib/package-sale';
import type { PackagePost } from '@/types/package';

const SCAN = 10;

/** Firestore Timestamp → ISO 문자열 (서버→클라이언트 prop은 직렬화 가능해야 함) */
function toISO(value: unknown): string | null {
  const v = value as { toDate?: () => Date } | null | undefined;
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  return null;
}

export async function loadOnSalePackages(limit = 3): Promise<PackagePost[]> {
  try {
    const snap = await getAdminFirestore()
      .collection('packagePosts')
      .orderBy('createdAt', 'desc')
      .limit(SCAN)
      .get();
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          createdAt: toISO(data.createdAt),
          updatedAt: toISO(data.updatedAt),
          saleStartAt: toISO(data.saleStartAt),
          saleEndAt: toISO(data.saleEndAt),
        } as PackagePost;
      })
      .map(renewPostIcons)
      .filter((p) => !isSaleEnded(p))
      .slice(0, limit);
  } catch (err) {
    // 띠의 곁다리라 실패해도 홈 전체를 막지 않는다 — 카드 없이 그림만 나간다
    console.error('홈 판매 중 패키지 조회 실패:', err);
    return [];
  }
}
