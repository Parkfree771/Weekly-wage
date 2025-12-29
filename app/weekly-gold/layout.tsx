import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '로아 주간 골드 계산 | 세르카 더보기 효율 | 세르카 클리어 골드',
  description: '로스트아크 원정대의 주간 골드 수익을 계산하고 세르카 레이드 더보기 보상의 손익을 실시간 거래소 가격으로 분석하세요. 세르카 클리어 골드, 세르카 더보기 효율, 카제로스 레이드(종막, 4막, 3막, 2막, 1막), 그림자 레이드(세르카, 고통의 마녀) 지원.',
  keywords: '세르카 골드, 세르카 클리어 골드, 세르카 더보기 효율, 세르카 레이드, 세르카 손익, 세르카 업데이트, 로아 주간 골드, 로아 아이템 시세, 로스트아크, 주간 골드, 골드 계산기, 원정대 주급, 더보기 손익, 더보기 보상, 레이드 수익, 골드 파밍, 로아 골드, 로아 거래소, 거래소 가격, 거래소 시세, 로아 시세, 종막, 카제로스, 4막, 3막, 2막, 1막, 세르카, 그림자 레이드, 고통의 마녀, 에스더 무기, 마석, 돌파석, 오레하, 엘릭서',
  openGraph: {
    title: '로아 주간 골드 계산 | 세르카 더보기 효율 | 세르카 클리어 골드',
    description: '세르카 레이드 클리어 골드와 더보기 효율을 실시간 거래소 가격으로 계산. 원정대 주간 골드 수익 분석. 카제로스 레이드(종막, 4막, 3막, 2막, 1막), 그림자 레이드(세르카, 고통의 마녀) 지원',
    url: 'https://lostarkweeklygold.kr/weekly-gold',
    siteName: '로아 주간 골드 계산',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://lostarkweeklygold.kr/weekly-gold',
  },
}

export default function WeeklyGoldLayout({
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
            "name": "로스트아크 주간 골드 계산기",
            "url": "https://lostarkweeklygold.kr/weekly-gold",
            "description": "로스트아크 원정대의 주간 골드 수익을 계산하고 레이드 더보기 보상의 손익을 실시간 거래소 가격으로 분석하는 도구",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "KRW"
            },
            "featureList": [
              "원정대 주간 골드 수익 자동 계산",
              "레이드 더보기 보상 손익 분석",
              "실시간 거래소 가격 반영",
              "캐릭터별 골드 수익 상세 보기"
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
                "name": "주간 골드는 어떻게 계산하나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "원정대의 캐릭터들이 클리어한 레이드를 선택하면 자동으로 주간 골드 수익을 계산합니다. 기본 골드 보상과 더보기 보상을 선택했을 때의 손익을 실시간 거래소 가격으로 분석하여 보여줍니다."
                }
              },
              {
                "@type": "Question",
                "name": "로아 아이템 시세는 어떻게 확인하나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "본 사이트에서 로스트아크 거래소의 실시간 아이템 시세를 확인할 수 있습니다. 재련 재료, 각인서, 보석 등 다양한 아이템의 가격 추이를 그래프로 확인하고, 더보기 보상 손익 계산에 활용됩니다."
                }
              },
              {
                "@type": "Question",
                "name": "더보기 보상은 언제 선택하는 게 이득인가요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "각 레이드의 더보기 보상 아이템(오레하 융화 재료, 돌파석, 엘릭서 등)의 거래소 시세를 계산하여 손익을 표시합니다. 초록색(이득)으로 표시되면 더보기를 선택하는 것이 유리하고, 빨간색(손해)으로 표시되면 기본 골드를 받는 것이 좋습니다."
                }
              },
              {
                "@type": "Question",
                "name": "거래소 가격은 실시간으로 업데이트되나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "네, 로스트아크 공식 API를 통해 매시 정각에 거래소 가격을 업데이트합니다. 재련 재료, 각인서, 보석, 오레하 융화 재료 등 모든 아이템의 최신 시세를 반영하여 정확한 손익 계산을 제공합니다."
                }
              },
              {
                "@type": "Question",
                "name": "원정대 주급은 최대 얼마까지 벌 수 있나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "원정대 캐릭터 수와 레이드 난이도에 따라 다릅니다. 6캐릭터로 고난이도 레이드를 모두 클리어하면 수십만 골드까지 벌 수 있으며, 더보기 보상을 효율적으로 선택하면 추가 수익을 얻을 수 있습니다."
                }
              },
              {
                "@type": "Question",
                "name": "종막, 카제로스, 4막 등 모든 레이드를 지원하나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "네, 카제로스 레이드(종막, 4막, 3막, 2막, 1막)와 그림자 레이드(세르카, 고통의 마녀)를 지원합니다. 각 레이드의 주간 골드 수익과 더보기 보상 손익을 정확하게 계산할 수 있습니다."
                }
              },
              {
                "@type": "Question",
                "name": "세르카 레이드 클리어 골드와 더보기 효율은 어떻게 계산하나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "세르카 레이드의 클리어 골드는 난이도별로 자동 계산되며, 세르카 더보기 보상(오레하 융화 재료, 엘릭서 등)의 손익을 실시간 거래소 가격으로 분석합니다. 세르카 더보기 효율이 초록색으로 표시되면 더보기 선택이 이득이며, 빨간색이면 기본 골드를 받는 것이 유리합니다."
                }
              }
            ]
          })
        }}
      />
    </>
  )
}
