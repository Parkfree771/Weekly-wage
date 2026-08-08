'use client';

// 패키지 상세 PC 좌측 칼럼(340px) 계산 결과 아래 250×250 애드핏.
// 일반 상세(PackageDetailClient)와 아제나 전용 상세(AzenaBlessingDetail)가 공용으로 쓴다.

import AdFitUnit from '@/components/ads/AdFitUnit';
import AdPlaceholder from '@/components/ads/AdPlaceholder';
import { AD_PREVIEW, ADFIT_ENABLED, ADFIT_UNITS } from '@/components/ads/adConfig';
import styles from '@/app/package/package.module.css';

/**
 * 모바일에서는 .sideAdSlot 이 display:none 이라 렌더돼도 보이지 않는다.
 * key={postId}: 글 사이를 클라이언트 이동해도 애드핏 스캔이 다시 돌게 한다.
 */
export default function SideSquareAd({ postId }: { postId: string }) {
  const adfit = ADFIT_UNITS.packageDetailSquare;

  if (AD_PREVIEW) {
    return (
      <AdPlaceholder
        className={styles.sideAdSlot}
        label="광고 · 패키지 상세 좌측"
        sub={`애드핏 ${adfit.width}×${adfit.height}\n${adfit.unit}`}
        style={{ height: `${adfit.height}px`, whiteSpace: 'pre-line' }}
      />
    );
  }

  if (!ADFIT_ENABLED || !adfit.unit) return null;

  return (
    <div className={styles.sideAdSlot}>
      <AdFitUnit key={postId} unit={adfit.unit} width={adfit.width} height={adfit.height} />
    </div>
  );
}
