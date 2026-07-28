'use client';

import { usePathname } from 'next/navigation';
import AdPlaceholder from './AdPlaceholder';
import AdUnit from './AdUnit';
import AdFitUnit from './AdFitUnit';
import { AD_PREVIEW, MOBILE_INCONTENT, ADFIT_ENABLED, ADFIT_UNITS, MOBILE_AD_ZOOM_COMPENSATE } from './adConfig';

interface AdBannerProps {
  slot: string;
  className?: string;
  /**
   * 애드핏 광고단위 선택. 같은 320×100 이라도 자리마다 단위가 달라야 한다
   * (본문 광고와 드로어 광고는 드로어를 열면 한 페이지에 같이 존재한다).
   */
  placement?: 'inContent' | 'drawer';
}

export default function AdBanner({ slot, className, placement = 'inContent' }: AdBannerProps) {
  const pathname = usePathname();

  // 모바일 인-콘텐츠 끔 → 모바일은 하단 앵커만 사용
  if (!MOBILE_INCONTENT) return null;

  const adfit = placement === 'drawer' ? ADFIT_UNITS.mobileDrawer : ADFIT_UNITS.mobileInContent;

  // 미리보기 모드: 실제 광고 대신 자리(크기)만 표시.
  // 애드핏은 고정 규격이라 실제로 차지할 320×100 을 그대로 그린다.
  if (AD_PREVIEW) {
    const useAdfit = ADFIT_ENABLED && !!adfit.unit;
    return (
      <AdPlaceholder
        className={className}
        label={placement === 'drawer' ? '광고 · 모바일 드로어' : '광고 · 모바일 인-콘텐츠'}
        sub={useAdfit ? `애드핏 ${adfit.width}×${adfit.height} · ${adfit.unit}` : `애드센스 반응형 · slot ${slot}`}
        style={
          useAdfit
            ? { width: `${adfit.width}px`, height: `${adfit.height}px`, minHeight: `${adfit.height}px`, margin: '0 auto' }
            : { minHeight: '100px' }
        }
      />
    );
  }

  // 애드핏 우선 — 애드센스는 미승인 상태라 켜져 있어도 채워지지 않는다.
  // key={pathname}: 페이지 이동마다 새 인스턴스 → 애드핏 스크립트가 다시 스캔한다.
  if (ADFIT_ENABLED && adfit.unit) {
    // zoom 역보정 — 뷰포트가 0.8 로 축소 렌더되므로 그냥 두면 320×100 이 화면에서 256×80 이 된다.
    // 컨테이너에 1/0.8 을 걸어 실제 화면 px 를 선언한 규격 그대로 복원한다(데스크톱 레일과 동일 방식).
    return (
      <div className={className} style={{ zoom: MOBILE_AD_ZOOM_COMPENSATE }}>
        <AdFitUnit
          key={pathname}
          unit={adfit.unit}
          width={adfit.width}
          height={adfit.height}
          style={{ textAlign: 'center' }}
        />
      </div>
    );
  }

  if (!slot) return null;

  // 실제 광고. key={pathname}으로 페이지 이동 시 새 광고로 갱신.
  return (
    <AdUnit
      key={pathname}
      slot={slot}
      format="auto"
      responsive
      className={className}
      style={{ minHeight: '100px' }}
    />
  );
}
