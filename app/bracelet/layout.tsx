import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '로아로골 | 팔찌 시뮬레이터 - 로아 팔찌 부여효과 시뮬',
  description: '로스트아크 팔찌 시뮬레이터! 전투 특성을 선택하고 부여 효과를 시뮬레이션하세요. 잠금과 재변환으로 최적의 팔찌를 만들어보세요!',
  keywords: '로아로골, 로아 팔찌, 로아 팔찌 시뮬, 팔찌 부여효과, 팔찌 시뮬레이터, 로스트아크 팔찌, 팔찌 재변환',
  openGraph: {
    title: '로아로골 | 팔찌 시뮬레이터 - 로아 팔찌 부여효과',
    description: '로스트아크 팔찌 시뮬레이터! 전투 특성을 선택하고 부여 효과를 시뮬레이션하세요.',
    url: 'https://lostarkweeklygold.kr/bracelet',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://lostarkweeklygold.kr/bracelet',
  },
}

export default function BraceletLayout({
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
            "name": "로아로골 - 팔찌 시뮬레이터",
            "url": "https://lostarkweeklygold.kr/bracelet",
            "description": "로스트아크 팔찌 부여효과 시뮬레이터. 전투 특성을 선택하고 최적의 팔찌를 만들어보세요.",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "KRW"
            },
            "featureList": [
              "팔찌 부여효과 시뮬레이션",
              "효과 잠금 시스템",
              "재변환 비교 선택",
              "실제 확률 기반 시뮬레이션"
            ]
          })
        }}
      />
    </>
  )
}
