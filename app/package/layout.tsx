import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: '로아 패키지 효율 계산기 · PC방 효율',
  description: '로스트아크 캐시샵·PC방 패키지 구성품을 거래소 실시간 시세로 골드 환산해 효율을 비교합니다. 새로 나온 패키지와 아제나의 축복 효율도 바로 확인하세요.',
  keywords: '로아 패키지 효율, 로아 PC방 효율, 로아 캐시샵 패키지, 로아 아제나의 축복 효율, 로아로골',
  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 로아 패키지 효율 계산기 · PC방 효율',
    description: '로스트아크 캐시샵·PC방 패키지 구성품을 거래소 실시간 시세로 골드 환산해 효율을 비교합니다. 새로 나온 패키지와 아제나의 축복 효율도 바로 확인하세요.',
    url: '/package',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/package',
  },
};

export default function PackageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: '로아로골 - 로아 패키지 효율 · PC방 효율 계산기',
            url: `${SITE_URL}/package`,
            description:
              '로아 패키지 효율과 PC방 효율을 비교하는 로스트아크 캐시샵 계산기',
            isPartOf: {
              '@type': 'WebSite',
              name: '로아로골',
              url: SITE_URL,
            },
          }),
        }}
      />
    </>
  );
}
