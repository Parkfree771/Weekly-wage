import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'T4 재련 비용 계산 | 로아 주간 골드 계산',
  description: '로스트아크 T4 재련에 필요한 재료와 골드를 계산하세요. 목표 레벨까지 필요한 재련 재료, 골드, 명돌, 파괴강석, 수호강석 등을 실시간 거래소 가격으로 정확하게 계산합니다.',
  keywords: '로스트아크, T4재련, 재련계산기, 재련비용, 명돌, 파괴강석, 수호강석, 골드계산, 로아재련',
  openGraph: {
    title: 'T4 재련 비용 계산 | 로아 주간 골드 계산',
    description: 'T4 재련에 필요한 재료와 골드를 실시간 거래소 가격으로 계산',
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
      {/* SEO를 위한 JSON-LD 구조화된 데이터 */}
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
    </>
  )
}
