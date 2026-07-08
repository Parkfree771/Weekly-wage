import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { faqData } from './faq-data'

export const metadata: Metadata = {
  title: '지옥 보상 계산기',
  description: '로스트아크 시즌3 지옥/나락 보상을 단계별로 정리하고 실시간 시세 기반으로 골드 가치를 계산합니다.',
  keywords: '로아로골, 로아 지옥 보상, 로아 나락 보상, 지옥 보상 계산, 낙원 보상 정리, 로스트아크 지옥, 나락 보상표',
  openGraph: {
    title: '로아로골 | 지옥 보상 계산기',
    description: '로스트아크 지옥/나락 보상을 층수별로 정리하고 실시간 시세 기반으로 골드 가치를 계산합니다.',
    url: '/hell-reward',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/hell-reward',
  },
}

export default function HellRewardLayout({
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
            "name": "로아로골 - 지옥 보상 계산기",
            "url": `${SITE_URL}/hell-reward`,
            "description": "로스트아크 시즌3(1750) 지옥/나락 보상을 단계별로 정리하고 실시간 시세 기반으로 골드 가치를 계산",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "KRW"
            },
            "featureList": [
              "지옥/나락 단계별 보상 정리",
              "보상 항목별 실시간 거래소 시세 반영",
              "특수재련 재료 등 비거래 재화의 대체 가치 환산",
              "단계별 평균 기댓값 계산",
              "어빌리티스톤 제외 옵션"
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
