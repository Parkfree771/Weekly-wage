import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'

// layout.tsx

export const metadata: Metadata = {
  title: '로아 주간 골드 계산기',

  description: '원정대 캐릭터별 주간 레이드 클리어 골드와 더보기 손익을 실시간 거래소 시세로 계산해 원정대 주급을 한 번에 확인합니다.',

  keywords: '로아 주간 골드, 로아 주급 계산, 로아 골드 계산기, 로아 원정대 주급, 로아로골',

  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 로아 주간 골드 계산기',
    description: '원정대 캐릭터별 주간 레이드 클리어 골드와 더보기 손익을 실시간 거래소 시세로 계산해 원정대 주급을 한 번에 확인합니다.',
    url: '/weekly-gold',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/weekly-gold',
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
            "name": "로아로골 - 주간 골드 계산기",
            "url": `${SITE_URL}/weekly-gold`,
            "description": "로아 주간 골드 계산기! 로아 더보기 효율, 로아 레이드 보상, 로아 지평의 성당/세르카/카제로스 골드 수익을 실시간 시세로 계산",
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
              "로아 캐릭터별 골드 수익 확인",
              "로아 벨가르딘 레이드 보상 분석",
              "로아 지평의 성당 보상 분석"
            ]
          })
        }}
      />
    </>
  )
}
