import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '로아 재련 비용 계산 | 전율 장비 재련 | 세르카 계승 장비 | 재련 계산기',
  description: '로스트아크 T4 재련 비용 계산기. 전율 장비(세르카 계승 장비) 재련 비용과 재련 확률을 정확하게 계산합니다. 목표 레벨까지 필요한 재련 재료와 골드를 실시간 거래소 시세로 확인하세요.',
  keywords: '전율 장비, 전율 장비 재련, 세르카 계승 장비, 세르카 장비 계승, 세르카 장비 재련, 세르카 재련 확률, 로아 재련 비용, 로아 재련 재료, 로스트아크, T4 재련, 재련 계산기, 재련 비용, 운명의 파편, 운명의 파괴석 결정, 운명의 수호석 결정, 위대한 운명의 돌파석, 상급 아비도스 융화 재료, 재련 재료 시세, 재련 재료 가격, 골드 계산, 로아 시세',
  openGraph: {
    title: '로아 재련 비용 계산 | 전율 장비 재련 | 세르카 계승 장비 | 재련 계산기',
    description: '전율 장비(세르카 계승 장비) 재련에 필요한 재료와 골드를 실시간 거래소 시세로 정확하게 계산. 운명의 파편, 운명의 파괴석 결정, 운명의 수호석 결정, 위대한 운명의 돌파석, 상급 아비도스 융화 재료 가격 확인',
    url: 'https://lostarkweeklygold.kr/refining',
    siteName: '로아 주간 골드 계산',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://lostarkweeklygold.kr/refining',
  },
}

export default function RefiningLayout({
  children,
}: {
  children: React.ReactNode
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
            "name": "로스트아크 T4 재련 비용 계산기",
            "url": "https://lostarkweeklygold.kr/refining",
            "description": "로스트아크 T4 장비 재련에 필요한 재료와 골드를 실시간 거래소 가격으로 정확하게 계산하는 도구",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "KRW"
            },
            "featureList": [
              "T4 재련 재료 자동 계산",
              "실시간 거래소 가격 반영",
              "총 골드 비용 계산",
              "명예의 파편, 파괴강석, 수호강석, 돌파석 계산"
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
                "name": "로아 재련 비용은 어떻게 계산하나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "현재 레벨과 목표 레벨을 입력하면 필요한 재련 재료(명예의 파편, 파괴강석, 수호강석, 돌파석)와 골드 비용을 자동으로 계산합니다. 실시간 거래소 시세를 반영하여 정확한 비용을 확인할 수 있습니다."
                }
              },
              {
                "@type": "Question",
                "name": "로아 재련 재료 가격은 실시간으로 업데이트되나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "네, 로스트아크 공식 API를 통해 실시간 거래소 가격을 매시 정각에 업데이트합니다. 명예의 파편, 파괴강석, 수호강석, 돌파석 등 모든 재련 재료의 최신 시세를 확인할 수 있습니다."
                }
              },
              {
                "@type": "Question",
                "name": "T4 재련에 필요한 재료는 무엇인가요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "T4 재련에는 명예의 파편, 찬란한 명예의 파괴강석, 찬란한 명예의 수호강석, 명예의 돌파석, 운명의 파편이 필요합니다. 레벨에 따라 필요한 재료의 양이 달라지며, 본 계산기에서 정확한 수량을 확인할 수 있습니다."
                }
              },
              {
                "@type": "Question",
                "name": "재련 재료 시세는 어디서 확인하나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "본 사이트에서 실시간 재련 재료 시세를 확인할 수 있습니다. 거래소 가격 추이 그래프를 통해 과거 가격 변동도 함께 확인 가능하며, 효율적인 재련 타이밍을 계획할 수 있습니다."
                }
              }
            ]
          })
        }}
      />
    </>
  )
}
