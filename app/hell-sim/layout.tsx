import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '로아로골 | 지옥 시뮬레이터 - 로아 나락/낙원 시뮬',
  description: '로스트아크 지옥 시뮬레이터! 열쇠를 선택하고 지하 100층까지 도전하세요. 히든층 보상, 로켓점프, 풍요 시스템으로 운명의 보상을 획득하세요!',
  keywords: '로아로골, 로아 지옥, 로아 나락, 로아 낙원, 지옥 시뮬, 지옥 보상 정리, 로스트아크 시뮬레이터, 로아 이벤트, 낙원 시뮬, 나락 시뮬',
  openGraph: {
    title: '로아로골 | 지옥 시뮬레이터 - 로아 나락/낙원',
    description: '로스트아크 지옥 시뮬레이터! 열쇠를 선택하고 지하 100층까지 도전하세요. 히든층 보상과 다양한 보상을 획득하세요!',
    url: 'https://lostarkweeklygold.kr/hell-sim',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://lostarkweeklygold.kr/hell-sim',
  },
}

export default function HellSimLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "로아로골 - 지옥 시뮬레이터",
            "url": "https://lostarkweeklygold.kr/hell-sim",
            "description": "로스트아크 지옥/나락/낙원 시뮬레이터. 열쇠를 선택하고 지하 100층까지 도전하세요.",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "KRW"
            },
            "featureList": [
              "지하 100층 도전",
              "희귀/영웅/전설 열쇠 시스템",
              "히든층 보상 (11의 배수)",
              "로켓점프, 풍요 시스템",
              "실시간 시뮬레이션"
            ]
          })
        }}
      />
    </>
  )
}
