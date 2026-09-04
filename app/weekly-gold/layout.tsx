import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { faqData } from './faq-data'

// layout.tsx

export const metadata: Metadata = {
  title: '주간골드 계산기',

  description: '원정대 캐릭터별 주간 레이드 골드 수익과 더보기 손익을 실시간 거래소 시세로 계산합니다. 벨가르딘, 지평의 성당, 세르카, 카제로스 등 현재 레이드의 클리어 골드와 더보기 보상 가치를 한 번에 비교할 수 있습니다.',

  keywords: '로아로골, 로아 주간 골드, 로아 골드 계산, 로아 더보기, 로아 더보기 효율, 로아 레이드 보상, 로아 벨가르딘, 벨가르딘, 벨가르딘 골드, 벨가르딘 보상, 벨가르딘 더보기, 로아 지평의 성당, 지평의 성당 골드, 지평의 성당 더보기, 지평의 성당 보상, 로아 세르카, 로아 카제로스, 로아 주급, 로아 골드 수익, 로스트아크 주간 골드, 더보기 손익, 원정대 주급',

  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 주간 골드 계산기 - 벨가르딘, 더보기 효율, 레이드 보상',
    description: '원정대 주간 레이드 골드 수익과 더보기 손익을 실시간 시세로 계산하는 주간 골드 계산기입니다.',
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
      {/* SEO를 위한 JSON-LD 구조화된 데이터 - FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqData.map((item) => ({
              "@type": "Question",
              "name": item.q,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": item.a
              }
            }))
          })
        }}
      />
    </>
  )
}
