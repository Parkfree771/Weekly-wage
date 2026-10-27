'use client';

// 데스크톱 전용 가로 띠 광고 공용 래퍼.
// - lg 미만에서는 숨긴다 (모바일은 각 페이지의 AdBanner 자리가 담당)
// - 슬롯 미발급이면 자리째 렌더하지 않는다
// - zoom 역보정·기준선 여백 제거는 모듈 CSS(.slot)가 담당

import AdSenseUnit from './AdSenseUnit';
import useIsMobileViewport from './useIsMobileViewport';
import { AD_PREVIEW, ADSENSE_SLOTS, AD_SIZES } from './adConfig';
import styles from './DesktopBannerAd.module.css';

type Props = {
  /** 페이지 전환 등으로 새 광고를 받고 싶을 때 바꾸는 리마운트 키 */
  refreshKey?: string | number;
};

export default function DesktopBannerAd({ refreshKey }: Props) {
  // d-none d-lg-block 은 "보이지만 않을 뿐" 마운트는 그대로다 — 모바일에서도 요청이 나가
  // 아무도 못 보는 임프레션이 쌓인다. 숨김 기준(lg=992)과 같은 폭으로 렌더 자체를 막는다.
  const isMobile = useIsMobileViewport(991.98);

  if (!AD_PREVIEW && !ADSENSE_SLOTS.desktopHorizontal) return null;
  if (isMobile !== false) return null;

  return (
    <div className={`d-none d-lg-block ${styles.slot}`}>
      <AdSenseUnit
        key={refreshKey}
        slot={ADSENSE_SLOTS.desktopHorizontal}
        size={AD_SIZES.desktopHorizontal}
        label="PC 가로"
      />
    </div>
  );
}
