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
            "name": "로스트아크 생활의 달인 효율 계산기",
            "url": "https://lostarkweeklygold.kr/life-master",
            "description": "로스트아크 생활 콘텐츠 효율을 계산하고 아비도스 융화재료 제작 손익을 실시간 거래소 가격으로 분석하는 도구",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "KRW"
            },
            "featureList": [
              "상급 아비도스 융화재료 제작 효율 계산",
              "생활의 가루 수익 분석",
              "실시간 거래소 가격 반영",
              "벌목, 채광, 낚시, 수렵, 고고학 효율 비교"
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
                "name": "아비도스 융화재료 제작이 이득인가요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "생활 재료 시세와 융화재료 시세에 따라 다릅니다. 본 계산기에서 실시간 시세를 반영하여 제작 손익을 확인할 수 있습니다. 일반적으로 생활 레벨이 높을수록 효율이 좋습니다."
                }
              },
              {
                "@type": "Question",
                "name": "극한 합성과 일반 합성 중 뭐가 나은가요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "극한 합성은 더 많은 골드가 들지만 더 많은 융화재료를 얻습니다. 시세에 따라 효율이 달라지므로 계산기에서 두 방식의 손익을 비교해보세요."
                }
              },
              {
                "@type": "Question",
                "name": "생활의 가루는 어디에 사용하나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "생활의 가루는 융화재료 제작에 필요한 재료입니다. 생활 콘텐츠를 하면서 자연스럽게 획득되며, 부족하면 거래소에서 구매할 수 있습니다."
                }
              },
              {
                "@type": "Question",
                "name": "어떤 생활 콘텐츠가 가장 효율적인가요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "시세에 따라 달라집니다. 일반적으로 고고학이 가장 효율이 좋지만, 벌목이나 채광도 시세에 따라 효율적일 수 있습니다. 계산기에서 각 콘텐츠별 효율을 비교해보세요."
                }
              }
            ]
          })
        }}
      />
    </>
  );
}
