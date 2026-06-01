import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: '직업 티어표',
  description:
    '로스트아크 직업 티어표! 유저 투표로 만드는 실시간 직업 티어리스트. 레이드에서 만나본 체감 기준으로 직업 간 강함을 1~5티어로 정리합니다. 내 직업으로 직접 투표하고 티어 변동을 확인하세요.',
  keywords:
    '로아 직업 티어, 로스트아크 직업 티어, 로아 티어표, 로아 딜러 티어, 로아 직업 순위, 로아 직업 추천, 로아 1티어 직업, 로아 직업별 딜, 로아로골, 로스트아크 티어리스트',
  openGraph: {
    title: '로아로골 | 직업 티어표 - 유저 투표 기반 실시간 티어리스트',
    description:
      '레이드 체감 기준 유저 투표로 만드는 로스트아크 직업 티어표. 내 직업으로 투표하고 티어 변동을 확인하세요.',
    url: '/tier',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/tier',
  },
};

export default function TierLayout({
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
            '@type': 'WebApplication',
            name: '로아로골 - 직업 티어표',
            url: `${SITE_URL}/tier`,
            description:
              '유저 투표로 만드는 로스트아크 직업 티어리스트. 레이드 체감 기준 직업 간 강함을 1~5티어로 정리.',
            applicationCategory: 'GameApplication',
            operatingSystem: 'Any',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'KRW',
            },
          }),
        }}
      />
    </>
  );
}
