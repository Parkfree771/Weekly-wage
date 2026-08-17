'use client';

import { usePathname } from 'next/navigation';
import AdPlaceholder from './AdPlaceholder';
import AdUnit from './AdUnit';
import AdFitUnit from './AdFitUnit';
import useIsMobileViewport from './useIsMobileViewport';
import {
  AD_PREVIEW, MOBILE_INCONTENT, ADFIT_ENABLED, ADFIT_UNITS,
  ADFIT_INCONTENT_UNITS, MOBILE_AD_ZOOM_COMPENSATE,
} from './adConfig';

interface AdBannerProps {
  slot: string;
  className?: string;
  /**
   * 애드핏 광고단위 선택. 같은 320×100 이라도 자리마다 단위가 달라야 한다
   * (본문 광고와 드로어 광고는 드로어를 열면 한 페이지에 같이 존재한다).
   */
  placement?: 'inContent' | 'drawer';
  /**
   * 한 페이지에 인-콘텐츠 광고가 여러 개 들어갈 때의 순번(0부터).
   * 넘기면 ADFIT_INCONTENT_UNITS(320×50 띠배너)에서 그 번째 단위를 꺼내 쓰고,
   * 단위가 모자라면 그 자리는 렌더하지 않는다.
   *
   * 넘기지 않으면 기존 단일 광고 단위(320×100)를 쓴다 — 페이지에 광고가 하나뿐이면
   * 같은 단위가 중복될 일이 없으므로 규격을 바꿀 이유도 없다.
   */
  index?: number;
}

export default function AdBanner({ slot, className, placement = 'inContent', index }: AdBannerProps) {
  const pathname = usePathname();
  const isMobile = useIsMobileViewport();

  // 모바일 인-콘텐츠 끔 → 모바일은 하단 앵커만 사용
  if (!MOBILE_INCONTENT) return null;

  // index 를 넘긴 자리(= 한 페이지에 광고가 여럿인 곳)만 띠배너 배열에서 꺼낸다.
  // 순번만큼 단위를 못 받으면 그 자리는 통째로 비운다 — 같은 단위를 재사용하면
  // 애드핏이 채우지 않아 빈 자리만 남는다.
  const adfit =
    placement === 'drawer' ? ADFIT_UNITS.mobileDrawer
      : index === undefined ? ADFIT_UNITS.mobileInContent
        : ADFIT_INCONTENT_UNITS[index];
  if (!adfit) return null;

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

  // 이 컴포넌트의 실 광고는 전부 모바일 자리(d-md-none 또는 d-lg-none)다 — 데스크톱에서는
  // CSS 로 숨겨질 뿐 마운트는 되어 스크립트 실행·광고 요청이 나가므로, 992px 미만이 확인될 때만
  // 렌더한다. (992 는 사용처 중 가장 넓은 숨김 기준(d-lg-none)에 맞춘 값 — 더 좁으면 노출 손실)
  if (!isMobile) return null;

  // 애드핏 우선 — 애드센스는 미승인 상태라 켜져 있어도 채워지지 않는다.
  // key={pathname}: 페이지 이동마다 새 인스턴스 → 애드핏 스크립트가 다시 스캔한다.
  if (ADFIT_ENABLED && adfit.unit) {
    // zoom 역보정 — 뷰포트가 0.8 로 축소 렌더되므로 그냥 두면 320×100 이 화면에서 256×80 이 된다.
    // 컨테이너에 1/0.8 을 걸어 실제 화면 px 를 선언한 규격 그대로 복원한다(데스크톱 레일과 동일 방식).
    // minHeight: 광고가 채워지는 순간 0 → 규격 높이로 늘며 아래 콘텐츠를 밀던 CLS 를 없앤다
    // (zoom 컨테이너 안이라 규격 px 그대로 적으면 화면 px 도 광고와 같이 보정된다).
    // 미충전이면 그 높이만큼 빈 공간이 남는 트레이드오프 — 밀림 제거를 우선한 선택.
    return (
      <div className={className} style={{ zoom: MOBILE_AD_ZOOM_COMPENSATE, minHeight: adfit.height }}>
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
