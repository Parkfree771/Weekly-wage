import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { faqData } from './faq-data'

export const metadata: Metadata = {
  title: '재련 시뮬레이터 - 로아 강화 시뮬, 재련 비용 계산',
  description: '로아 강화 시뮬(재련 시뮬레이터)로 실제 재련을 체험하세요! 로아 재련 비용 계산, 로아 장기백(장인의 기운) 평균 통계, 로아 상급재련/일반재련 확률을 실시간 거래소 시세로 분석합니다.',
  keywords: '로아 강화 시뮬, 로아 강화 시뮬레이터, 로아 강화 확률, 로아로골, 로골로골, 로아 재련, 로아 재련 시뮬, 로아 재련 비용, 로아 재련 계산기, 로아 장기백, 로아 장인의 기운, 로아 상급재련, 로아 재련 확률, 로아 재련 재료, 로아 재련 통계, 로스트아크 재련, 로스트아크 강화 시뮬, 재련 시뮬레이터, 전율 장비, 세르카 계승 장비',
  openGraph: {
    title: '로아로골 | 재련 시뮬레이터 - 재련 비용 계산, 장기백 평균',
    description: '로아로골 재련 시뮬레이터! 로아 재련 비용 계산, 로아 장기백 평균 통계, 로아 상급재련 확률을 확인하세요.',
    url: '/refining',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/refining',
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
            "name": "로아로골 - 재련 시뮬레이터",
            "url": `${SITE_URL}/refining`,
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
