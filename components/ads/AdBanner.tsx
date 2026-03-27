'use client';

interface AdBannerProps {
  slot: string;
  className?: string;
}

export default function AdBanner({ slot, className }: AdBannerProps) {
  // 애드센스 슬롯 자리 (나중에 광고 코드 삽입)
  return (
    <div className={className || ''} data-ad-slot={slot} />
  );
}
