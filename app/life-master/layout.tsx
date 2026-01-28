import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '로아 벌목 계산기 | 로아 생활 효율 | 로아 융화재료 제작 | 로골로골',
  description: '로아 벌목 효율 계산기! 로아 생활 콘텐츠 효율, 로아 융화재료 제작 손익, 로아 생활의 가루 수익을 실시간 거래소 시세로 계산하세요. 로아 목재 시세도 확인 가능.',
  keywords: '로아 벌목, 로아 벌목 효율, 로아 벌목 계산기, 로아 생활, 로아 생활 효율, 로아 융화재료, 로아 융화재료 제작, 로아 생활의 가루, 로아 목재 시세, 로스트아크 벌목, 아비도스 융화재료, 로골로골',
  openGraph: {
    title: '로아 벌목 계산기 | 로아 생활 효율 | 로골로골',
    description: '로아 벌목 효율, 로아 생활 효율, 로아 융화재료 제작 손익을 실시간 시세로 계산하세요.',
    url: 'https://lostarkweeklygold.kr/life-master',
    siteName: '로골로골',
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
    title: '로아 벌목 계산기 | 로아 생활 효율 | 로골로골',
    description: '로아 벌목 효율, 로아 생활 효율, 로아 융화재료 제작 손익 계산',
    images: ['/og-image.png'],
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
            "name": "로아 벌목 계산기 - 로골로골",
            "url": "https://lostarkweeklygold.kr/life-master",
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
            "mainEntity": [
              {
                "@type": "Question",
                "name": "로아 벌목 효율은 어떻게 계산하나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 벌목 효율은 로아 목재 시세와 로아 융화재료 시세를 기준으로 계산됩니다. 로골로골에서 로아 벌목 손익을 실시간으로 확인하세요."
                }
              },
              {
                "@type": "Question",
                "name": "로아 융화재료 제작이 이득인가요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 융화재료 제작은 로아 생활 재료 시세에 따라 달라집니다. 로아 벌목 계산기에서 실시간 손익을 확인하고 효율적으로 제작하세요."
                }
              },
              {
                "@type": "Question",
                "name": "로아 생활의 가루는 어디에 사용하나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 생활의 가루는 로아 융화재료 제작에 필요합니다. 로아 생활 콘텐츠에서 획득하거나 로아 거래소에서 구매할 수 있습니다."
                }
              },
              {
                "@type": "Question",
                "name": "로아 생활 중 어떤 콘텐츠가 가장 효율적인가요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 생활 효율은 시세에 따라 달라집니다. 로아 벌목, 로아 채광, 로아 고고학 등 각 콘텐츠별 효율을 로골로골에서 비교해보세요."
                }
              }
            ]
          })
        }}
      />
    </>
  );
}
