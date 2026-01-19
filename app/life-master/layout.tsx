import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '생활의 달인 효율 계산기 | 상급 아비도스 융화재료 제작',
  description: '로스트아크 생활의 달인 효율 계산기. 상급 아비도스 융화재료 제작 효율, 생활의 가루 수익, 벌목 목재(부드러운 목재, 아비도스 목재) 채집 효율을 실시간 시세로 계산합니다.',
  keywords: '생활의 달인, 상급 아비도스 융화재료, 아비도스 융화재료 제작, 생활의 가루, 벌목, 목재, 부드러운 목재, 아비도스 목재, 로스트아크 생활, 채집 효율, 제작 효율',
  openGraph: {
    title: '생활의 달인 효율 계산기 | 상급 아비도스 융화재료',
    description: '상급 아비도스 융화재료 제작 효율, 생활의 가루 수익을 실시간 시세로 계산하세요.',
    url: 'https://lostarkweeklygold.kr/life-master',
    siteName: '로아 주간 골드 계산',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '생활의 달인 효율 계산기'
      }
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '생활의 달인 효율 계산기 | 상급 아비도스 융화재료',
    description: '상급 아비도스 융화재료 제작 효율, 생활의 가루 수익 계산',
    images: ['/og-image.png'],
  },
};

export default function LifeMasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
