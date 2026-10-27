'use client';

import { usePathname } from 'next/navigation';
import AdSenseUnit from './AdSenseUnit';
import useIsMobileViewport from './useIsMobileViewport';
import {
  AD_PREVIEW, MOBILE_INCONTENT, ADSENSE_SLOTS, AD_SIZES, MOBILE_AD_ZOOM_COMPENSATE,
} from './adConfig';

interface AdBannerProps {
  className?: string;
}

export default function AdBanner({ className }: AdBannerProps) {
  const pathname = usePathname();
  const isMobile = useIsMobileViewport();

  if (!MOBILE_INCONTENT) return null;

  // 이 컴포넌트의 광고는 전부 모바일 자리(d-md-none 또는 d-lg-none)다 — 데스크톱에서는
  // CSS 로 숨겨질 뿐 마운트는 되어 광고 요청이 나가므로, 992px 미만이 확인될 때만 렌더한다.
  // (992 는 사용처 중 가장 넓은 숨김 기준(d-lg-none)에 맞춘 값 — 더 좁으면 노출 손실)
  // 미리보기는 위치 확인용이라 뷰포트와 상관없이 그린다.
  if (!AD_PREVIEW && !isMobile) return null;

  // key={pathname}: 페이지 이동마다 새 ins → 새 광고.
  // zoom 역보정 — 뷰포트가 0.8 로 축소 렌더되므로 그냥 두면 칸이 화면에서 0.8 배로 줄어든다.
  // 컨테이너에 1/0.8 을 걸어 실제 화면 px 를 칸 크기 그대로 복원한다(데스크톱 레일과 동일 방식).
  return (
    <div className={className} style={{ zoom: MOBILE_AD_ZOOM_COMPENSATE }}>
      <AdSenseUnit
        key={pathname}
        slot={ADSENSE_SLOTS.mobileInContent}
        size={AD_SIZES.mobileInContent}
        label="모바일 본문"
      />
    </div>
  );
}
