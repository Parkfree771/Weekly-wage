'use client';

// 패키지 상세 PC 좌측 칼럼(340px) 계산 결과 아래 250×250 칸.
// 일반 상세(PackageDetailClient)와 아제나 전용 상세(AzenaBlessingDetail)가 공용으로 쓴다.
// 칼럼 340px 에 zoom 역보정(1.1765)이 걸리면 300 폭 칸은 넘친다 — 250 칸이 들어가는 최대치.

import AdSenseUnit from '@/components/ads/AdSenseUnit';
import { AD_PREVIEW, ADSENSE_SLOTS, AD_SIZES } from '@/components/ads/adConfig';
import useIsMobileViewport from '@/components/ads/useIsMobileViewport';
import styles from '@/app/package/package.module.css';

/**
 * ≤900px 에서는 .sideAdSlot 이 display:none — CSS 숨김만으로는 광고 요청이
 * 그대로 나가므로, 900px 초과가 확인될 때만 렌더한다 (숨김 브레이크포인트와 동일 기준).
 * key={postId}: 글 사이를 클라이언트 이동해도 새 광고를 받게 한다.
 */
export default function SideSquareAd({ postId }: { postId: string }) {
  const isNarrow = useIsMobileViewport(900);

  if (!AD_PREVIEW && !ADSENSE_SLOTS.desktopSquare) return null;
  if (isNarrow !== false) return null;

  return (
    <div className={styles.sideAdSlot}>
      <AdSenseUnit
        key={postId}
        slot={ADSENSE_SLOTS.desktopSquare}
        size={AD_SIZES.desktopSideSquare}
        label="패키지 상세 좌측"
      />
    </div>
  );
}
