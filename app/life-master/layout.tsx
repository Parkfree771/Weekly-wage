import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import { faqData } from './faq-data';

export const metadata: Metadata = {
  title: '벌목 계산기',
  description: '로아로골 벌목 효율 계산기! 로아 생활 콘텐츠 효율, 로아 융화재료 제작 손익, 로아 생활의 가루 수익을 실시간 거래소 시세로 계산하세요. 로아 목재 시세도 확인 가능.',
  keywords: '로아로골, 로아 벌목, 로아 벌목 효율, 로아 벌목 계산기, 로아 생활, 로아 생활 효율, 로아 융화재료, 로아 융화재료 제작, 로아 생활의 가루, 로아 목재 시세, 로스트아크 벌목, 아비도스 융화재료',
  openGraph: {
    title: '로아로골 | 벌목 계산기 - 생활 효율, 융화재료 제작',
    description: '로아로골 벌목 효율, 로아 생활 효율, 로아 융화재료 제작 손익을 실시간 시세로 계산하세요.',
    url: '/life-master',
    siteName: '로아로골',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '로아로골 - 벌목 계산기'
      }
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '로아로골 | 벌목 계산기 - 생활 효율, 융화재료 제작',
    description: '로아로골 벌목 효율, 로아 생활 효율, 로아 융화재료 제작 손익 계산',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/life-master',
  },
};

export default function LifeMasterLayout({
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
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "로아로골 - 벌목 계산기",
            "url": `${SITE_URL}/life-master`,
            "description": "로아 벌목 효율, 로아 생활 효율, 로아 융화재료 제작 손익을 실시간 거래소 가격으로 분석",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "KRW"
            },
            "featureList": [
              "로아 벌목 효율 계산",
              "로아 융화재료 제작 손익 분석",
              "로아 거래소 실시간 가격 반영",
              "로아 생활 콘텐츠 효율 비교"
            ]
          })
        }}
      />
      {/* SEO를 위한 JSON-LD 구조화된 데이터 - FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqData.map((item) => ({
              "@type": "Question",
              "name": item.q,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": item.a,
              },
            })),
          })
        }}
      />
    </>
  );
}
