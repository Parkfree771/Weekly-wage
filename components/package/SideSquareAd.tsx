'use client';

// 패키지 상세 PC 좌측 칼럼(340px) 계산 결과 아래 250×250 애드핏.
// 일반 상세(PackageDetailClient)와 아제나 전용 상세(AzenaBlessingDetail)가 공용으로 쓴다.

import AdFitUnit from '@/components/ads/AdFitUnit';
import AdPlaceholder from '@/components/ads/AdPlaceholder';
import { AD_PREVIEW, ADFIT_ENABLED, ADFIT_UNITS } from '@/components/ads/adConfig';
import useIsMobileViewport from '@/components/ads/useIsMobileViewport';
import styles from '@/app/package/package.module.css';

/**
 * ≤900px 에서는 .sideAdSlot 이 display:none — CSS 숨김만으로는 스크립트·광고 요청이
 * 그대로 나가므로, 900px 초과가 확인될 때만 렌더한다 (숨김 브레이크포인트와 동일 기준).
 * key={postId}: 글 사이를 클라이언트 이동해도 애드핏 스캔이 다시 돌게 한다.
 */
export default function SideSquareAd({ postId }: { postId: string }) {
  const adfit = ADFIT_UNITS.packageDetailSquare;
  const isNarrow = useIsMobileViewport(900);

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
  if (isNarrow !== false) return null;

  return (
    // minHeight: 채워질 때 아래 콘텐츠(댓글 등)가 밀리지 않게 규격 높이를 미리 예약 (CLS 방지)
    <div className={styles.sideAdSlot} style={{ minHeight: adfit.height }}>
      <AdFitUnit key={postId} unit={adfit.unit} width={adfit.width} height={adfit.height} />
    </div>
  );
}
