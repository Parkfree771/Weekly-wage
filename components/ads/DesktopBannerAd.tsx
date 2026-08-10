'use client';

// 데스크톱 전용 가로 배너(728×90 등) 공용 래퍼.
// - lg 미만에서는 숨긴다 (모바일은 각 페이지의 띠배너 자리가 담당)
// - 단위 미발급(unit 빈 문자열)이면 자리째 렌더하지 않는다
// - zoom 역보정·기준선 여백 제거는 모듈 CSS(.slot)가 담당

import AdFitUnit from './AdFitUnit';
import { ADFIT_ENABLED } from './adConfig';
import styles from './DesktopBannerAd.module.css';

type Props = {
  adfit: { unit: string; width: number; height: number };
  /** 페이지 전환 등으로 새 광고를 받고 싶을 때 바꾸는 리마운트 키 */
  refreshKey?: string | number;
};

export default function DesktopBannerAd({ adfit, refreshKey }: Props) {
  if (!ADFIT_ENABLED || !adfit.unit) return null;

  return (
    <div className={`d-none d-lg-block ${styles.slot}`}>
      <AdFitUnit key={refreshKey} unit={adfit.unit} width={adfit.width} height={adfit.height} />
    </div>
  );
}
