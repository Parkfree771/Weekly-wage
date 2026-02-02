import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '다시 생각해! - 핀볼 타워 미니게임',
  description: '로골로골 핀볼 타워 미니게임! 물리 엔진 기반의 핀볼 게임을 즐겨보세요. 열쇠를 선택하고 공을 발사해서 운명의 층에 도달하세요!',
  keywords: '로골로골, 핀볼, 미니게임, 물리 엔진, 타워, 로스트아크',
  openGraph: {
    title: '로골로골 | 다시 생각해! - 핀볼 타워 미니게임',
    description: '로골로골 핀볼 타워 미니게임! 물리 엔진 기반의 핀볼 게임을 즐겨보세요.',
    url: 'https://lostarkweeklygold.kr/think-again',
    siteName: '로골로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://lostarkweeklygold.kr/think-again',
  },
}

export default function ThinkAgainLayout({
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
            "name": "로골로골 - 핀볼 타워",
            "url": "https://lostarkweeklygold.kr/think-again",
            "description": "물리 엔진 기반의 핀볼 타워 미니게임",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "KRW"
            },
            "featureList": [
              "실시간 물리 시뮬레이션",
              "20층 핀볼 타워",
              "다양한 열쇠 시스템"
            ]
          })
        }}
      />
    </>
  )
}
