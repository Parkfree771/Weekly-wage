import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: '로아 더보기 효율 · 클골 계산기',
  description: '벨가르딘·세르카·지평의 성당·카제로스 등 레이드 관문별 더보기 비용과 보상을 실시간 시세로 환산해 더보기 손익과 클리어 골드를 계산합니다.',
  keywords: '로아 더보기 효율, 로아 더보기 손익, 로아 클골 계산기, 로아 레이드 클리어 보상, 로아로골',
  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 로아 더보기 효율 · 클골 계산기',
    description: '벨가르딘·세르카·지평의 성당·카제로스 등 레이드 관문별 더보기 비용과 보상을 실시간 시세로 환산해 더보기 손익과 클리어 골드를 계산합니다.',
    url: `${SITE_URL}/more-reward`,
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '로아로골 | 로아 더보기 효율 · 클골 계산기',
    description: '벨가르딘·세르카·지평의 성당·카제로스 등 레이드 관문별 더보기 비용과 보상을 실시간 시세로 환산해 더보기 손익과 클리어 골드를 계산합니다.',
  },
  alternates: {
    canonical: '/more-reward',
  },
};

export default function MoreRewardLayout({
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
            name: '로아로골 - 더보기 효율 & 레이드 보상 정리 (클골 계산기)',
            url: `${SITE_URL}/more-reward`,
            description:
              '벨가르딘, 세르카, 지평의 성당, 카제로스 종막·4막·3막·2막·1막 에기르·서막, 베히모스 등 로아 레이드 관문별 더보기 비용과 보상 재료를 실시간 거래소 시세로 환산해 더보기 손익과 레이드 클리어 골드(클골) 보상을 계산하는 도구',
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
