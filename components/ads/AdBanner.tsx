'use client';

import { usePathname } from 'next/navigation';
import AdPlaceholder from './AdPlaceholder';
import AdUnit from './AdUnit';
import { AD_PREVIEW, MOBILE_INCONTENT } from './adConfig';

interface AdBannerProps {
  slot: string;
  className?: string;
}

export default function AdBanner({ slot, className }: AdBannerProps) {
  const pathname = usePathname();

  // 모바일 인-콘텐츠 끔 → 모바일은 하단 앵커만 사용
  if (!MOBILE_INCONTENT) return null;

  // 미리보기 모드: 실제 광고 대신 자리(크기)만 표시 (모바일 인-콘텐츠 위치)
  if (AD_PREVIEW) {
    return (
      <AdPlaceholder
        className={className}
        label="광고 영역 · 모바일 인-콘텐츠"
        sub={`반응형 가로 · slot ${slot}`}
        style={{ minHeight: '100px' }}
      />
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
