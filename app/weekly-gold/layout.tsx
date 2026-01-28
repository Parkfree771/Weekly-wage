import { Metadata } from 'next'

// layout.tsx

export const metadata: Metadata = {
  title: '로아 주간 골드 계산 | 로아 더보기 효율 | 로아 레이드 보상 | 로골로골',

  description: '로아 주간 골드 계산기! 로아 더보기 효율, 로아 레이드 보상을 실시간 거래소 가격으로 계산하세요. 로아 세르카, 로아 카제로스 레이드 골드 수익과 더보기 손익을 한눈에.',

  keywords: '로아 주간 골드, 로아 골드 계산, 로아 더보기, 로아 더보기 효율, 로아 레이드 보상, 로아 세르카, 로아 카제로스, 로아 주급, 로아 골드 수익, 로스트아크 주간 골드, 세르카 보상, 더보기 손익, 원정대 주급, 로골로골',

  openGraph: {
    title: '로아 주간 골드 계산 | 로아 더보기 효율 | 로골로골',
    description: '로아 주간 골드 계산기! 로아 더보기 효율, 로아 레이드 보상, 로아 세르카/카제로스 골드 수익을 확인하세요.',
    url: 'https://lostarkweeklygold.kr/weekly-gold',
    siteName: '로골로골',
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
            "name": "로아 주간 골드 계산기 - 로골로골",
            "url": "https://lostarkweeklygold.kr/weekly-gold",
            "description": "로아 주간 골드 계산기! 로아 더보기 효율, 로아 레이드 보상, 로아 세르카/카제로스 골드 수익을 실시간 시세로 계산",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "KRW"
            },
            "featureList": [
              "로아 주간 골드 수익 자동 계산",
              "로아 더보기 보상 손익 분석",
              "로아 거래소 실시간 가격 반영",
              "로아 캐릭터별 골드 수익 확인"
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
                "name": "로아 주간 골드는 어떻게 계산하나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 주간 골드는 캐릭터별 클리어 레이드를 선택하면 자동으로 계산됩니다. 로아 더보기 보상의 손익을 로아 거래소 실시간 시세로 분석해드립니다."
                }
              },
              {
                "@type": "Question",
                "name": "로아 더보기는 언제 선택하는 게 이득인가요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 더보기 효율은 로아 거래소 시세에 따라 달라집니다. 초록색이면 로아 더보기가 이득, 빨간색이면 기본 골드가 유리합니다. 로골로골에서 실시간으로 확인하세요."
                }
              },
              {
                "@type": "Question",
                "name": "로아 세르카 더보기 효율은 어떻게 확인하나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 세르카 더보기 효율은 로골로골에서 실시간 거래소 가격으로 자동 계산됩니다. 로아 세르카 보상과 더보기 손익을 한눈에 확인할 수 있습니다."
                }
              },
              {
                "@type": "Question",
                "name": "로아 주급은 최대 얼마까지 벌 수 있나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 주급은 캐릭터 수와 레이드 난이도에 따라 다릅니다. 6캐릭터로 로아 카제로스, 로아 세르카 레이드를 클리어하면 수십만 골드까지 가능합니다."
                }
              },
              {
                "@type": "Question",
                "name": "로아 카제로스, 로아 세르카 레이드를 지원하나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "네, 로아 카제로스(종막, 4막, 3막, 2막, 1막)와 로아 세르카, 로아 고통의 마녀 레이드를 모두 지원합니다. 각 로아 레이드의 골드 수익과 더보기 손익을 계산할 수 있습니다."
                }
              }
            ]
          })
        }}
      />
    </>
  )
}
