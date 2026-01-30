import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '재련 시뮬레이터 - 재련 비용 계산, 장기백 평균',
  description: '로골로골 재련 시뮬레이터로 실제 재련을 체험하세요! 로아 재련 비용 계산, 로아 장기백(장인의 기운) 평균 통계, 로아 상급재련/일반재련 확률을 실시간 거래소 시세로 분석합니다.',
  keywords: '로골로골, 로아 재련, 로아 재련 시뮬, 로아 재련 비용, 로아 재련 계산기, 로아 장기백, 로아 장인의 기운, 로아 상급재련, 로아 재련 확률, 로아 재련 재료, 로아 재련 통계, 로스트아크 재련, 재련 시뮬레이터, 전율 장비, 세르카 계승 장비',
  openGraph: {
    title: '로골로골 | 재련 시뮬레이터 - 재련 비용 계산, 장기백 평균',
    description: '로골로골 재련 시뮬레이터! 로아 재련 비용 계산, 로아 장기백 평균 통계, 로아 상급재련 확률을 확인하세요.',
    url: 'https://lostarkweeklygold.kr/refining',
    siteName: '로골로골',
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
            "name": "로골로골 - 재련 시뮬레이터",
            "url": "https://lostarkweeklygold.kr/refining",
            "description": "로아 재련 시뮬레이터! 로아 재련 비용 계산, 로아 장기백 평균 통계, 로아 상급재련/일반재련 확률 확인",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "KRW"
            },
            "featureList": [
              "로아 재련 시뮬레이터 (실제 재련 체험)",
              "로아 장기백(장인의 기운) 평균 통계",
              "로아 상급재련/일반재련 비용 계산",
              "로아 재련 재료 실시간 시세 반영"
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
                  "text": "로아 재련 비용은 현재 레벨과 목표 레벨을 입력하면 자동으로 계산됩니다. 로아 재련 재료(운명의 파편, 파괴석, 수호석, 돌파석)와 골드 비용을 실시간 거래소 시세로 확인할 수 있습니다."
                }
              },
              {
                "@type": "Question",
                "name": "로아 장기백(장인의 기운) 평균은 얼마인가요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 장기백(장인의 기운) 평균 통계를 실제 재련 데이터로 제공합니다. 로아 재련 시뮬레이터에서 수천 건의 재련 통계를 확인하고 로아 재련 확률을 분석해보세요."
                }
              },
              {
                "@type": "Question",
                "name": "로아 상급재련과 일반재련 차이는 뭔가요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 상급재련은 14~25강 구간에서 사용하며, 로아 일반재련보다 재료 소모가 적지만 확률이 다릅니다. 로아 재련 시뮬레이터에서 두 방식의 비용과 확률을 비교해보세요."
                }
              },
              {
                "@type": "Question",
                "name": "로아 재련 재료 시세는 어디서 확인하나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로골로골에서 로아 재련 재료 시세를 실시간으로 확인할 수 있습니다. 로아 거래소 가격 차트로 과거 시세 변동도 확인 가능합니다."
                }
              }
            ]
          })
        }}
      />
    </>
  )
}
