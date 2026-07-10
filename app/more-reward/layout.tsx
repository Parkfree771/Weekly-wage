import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import { faqData } from './faq-data';

export const metadata: Metadata = {
  title: '더보기 효율 계산기 - 벨가르딘 세르카 지평의 성당 종막 더보기 손익',
  description:
    '로아 더보기 효율 & 레이드 클리어 보상 실시간 정리! 벨가르딘 나메·하드·노말, 세르카 나메·하드·노말, 지평의 성당 1~3단계, 카제로스 종막·4막·3막·2막·1막·서막, 베히모스까지 레이드 관문별 더보기 비용과 보상 재료를 거래소 시세로 환산해 더보기 손익을 계산합니다. 클리어 골드와 클리어 보상 재료까지 레이드 보상 정보를 한 페이지에서 확인하세요.',
  keywords:
    '로아 더보기 효율, 더보기 효율, 더보기 계산기, 더보기 손익, 로아 더보기, 레이드 클리어 보상, 클리어 골드 계산기, 벨가르딘 더보기, 벨가르딘 나메 더보기, 벨가르딘 하드 더보기, 벨가르딘 노말 더보기, 세르카 더보기, 세르카 나메 더보기, 세르카 하드 더보기, 지평의 성당 더보기, 성당 3단계 더보기, 성당 2단계 더보기, 카제로스 종막 더보기, 종막 더보기, 4막 더보기, 3막 더보기, 2막 더보기, 1막 더보기, 서막 더보기, 베히모스 더보기, 로아 레이드 보상, 로아 레이드 골드, 로스트아크 더보기 효율, 로스트아크 레이드 클리어 보상, 로아로골',
  openGraph: {
    title: '로아로골 | 더보기 효율 계산기 - 벨가르딘·세르카·지평의 성당·종막 더보기 손익',
    description:
      '벨가르딘, 세르카, 지평의 성당, 카제로스 종막까지 레이드 관문별 더보기 비용 대비 보상 재료 가치를 실시간 시세로 계산. 어느 레이드 더보기가 이득인지 한눈에 확인하세요.',
    url: `${SITE_URL}/more-reward`,
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '로아로골 | 더보기 효율 계산기 - 벨가르딘·세르카·지평의 성당·종막',
    description: '벨가르딘, 세르카, 지평의 성당, 카제로스 종막 등 레이드별 더보기 손익과 클리어 보상을 실시간 시세로 확인하세요.',
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
            name: '로아로골 - 더보기 효율 계산기',
            url: `${SITE_URL}/more-reward`,
            description:
              '벨가르딘, 세르카, 지평의 성당, 카제로스 종막·4막·3막·2막·1막·서막, 베히모스 등 로아 레이드 관문별 더보기 비용과 보상 재료를 실시간 거래소 시세로 환산해 더보기 손익과 레이드 클리어 보상을 계산하는 도구',
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
      {/* SEO를 위한 JSON-LD 구조화된 데이터 - FAQPage (하단 FAQ와 동일 배열 공유) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqData.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />
    </>
  );
}
