import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';

const DESCRIPTION = '캐릭터를 검색하면 원정대 주간 골드를, 레벨을 고르면 상위 3개 레이드를 자동으로 계산합니다. 벨가르딘·세르카·지평의 성당·카제로스 난이도별 클리어 골드를 유통·귀속으로 나눠 보고, 더보기 효율과 재료 가치까지 한 화면에서 비교합니다.';

export const metadata: Metadata = {
  title: '로아 레이드 클골 정리 · 주간 골드 · 더보기 효율',
  description: DESCRIPTION,
  keywords: '로아 클골, 로아 주간 골드, 로아 골드 계산기, 로아 더보기 효율, 로아 더보기 손익, 로아 레이드 보상, 로아 귀속 골드, 로아로골',
  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 로아 레이드 클골 정리',
    description: DESCRIPTION,
    url: `${SITE_URL}/raid-gold`,
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '로아로골 | 로아 레이드 클골 정리',
    description: DESCRIPTION,
  },
  alternates: {
    canonical: '/raid-gold',
  },
};

export default function RaidGoldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      {/* SEO를 위한 JSON-LD 구조화된 데이터 - WebApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: '로아로골 - 레이드 클골 정리',
            url: `${SITE_URL}/raid-gold`,
            description: DESCRIPTION,
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
