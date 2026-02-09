import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '패키지 효율 계산기 - 로스트아크 패키지 효율 비교',
  description:
    '로스트아크 캐시샵 패키지의 효율을 계산하고 비교하세요. 실시간 시세를 반영한 골드 가치와 로열 크리스탈 대비 효율을 한눈에 확인할 수 있습니다.',
  keywords:
    '로아 패키지, 로스트아크 패키지, 로아 패키지 효율, 로아 캐시샵, 로아 로열 크리스탈, 로골로골',
  openGraph: {
    title: '로골로골 | 패키지 효율 계산기',
    description:
      '로스트아크 캐시샵 패키지의 효율을 계산하고 비교하세요. 실시간 시세 반영.',
    url: 'https://lostarkweeklygold.kr/package',
    siteName: '로골로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://lostarkweeklygold.kr/package',
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
            name: '로골로골 - 패키지 효율 계산기',
            url: 'https://lostarkweeklygold.kr/package',
            description:
              '로스트아크 캐시샵 패키지의 효율을 계산하고 비교하는 게시판',
            isPartOf: {
              '@type': 'WebSite',
              name: '로골로골',
              url: 'https://lostarkweeklygold.kr',
            },
          }),
        }}
      />
    </>
  );
}
