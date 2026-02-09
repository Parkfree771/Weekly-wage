import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '아바타 갤러리 - 로스트아크 아바타 염색 공유',
  description:
    '로스트아크 아바타 갤러리 - 다른 플레이어들의 아바타 염색 코드를 확인하고, 나만의 아바타 조합을 공유하세요. 부위별 염색 색상, 광택, 패턴 정보를 한눈에 볼 수 있습니다.',
  keywords:
    '로아 아바타, 로스트아크 아바타, 로아 염색, 로아 아바타 염색, 로아 아바타 코드, 로아 아바타 갤러리, 로골로골',
  openGraph: {
    title: '로골로골 | 아바타 갤러리',
    description:
      '로스트아크 아바타 염색 코드를 공유하고 확인하세요. 부위별 색상, 광택, 패턴 정보까지.',
    url: 'https://lostarkweeklygold.kr/avatar',
    siteName: '로골로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://lostarkweeklygold.kr/avatar',
  },
};

export default function AvatarLayout({
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
            name: '로골로골 - 아바타 갤러리',
            url: 'https://lostarkweeklygold.kr/avatar',
            description:
              '로스트아크 아바타 염색 코드를 공유하고 확인하는 갤러리',
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
