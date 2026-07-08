import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { faqData } from './faq-data'

export const metadata: Metadata = {
  title: '세르카 보상',

  description: '로아로골 세르카 보상 정리! 로아 세르카 노말/하드/나메 클리어 보상, 더보기 손익, 고통의 가시 교환 상점 목록과 교환 효율을 실시간 시세로 확인하세요. 야금술/재봉술 업화, 고통의 재련 재료 상자, 보조 재료 주머니, 영웅~고급 젬 랜덤 상자까지 한눈에.',

  keywords: '로아로골, 로아 세르카, 세르카 보상, 세르카 클리어 보상, 세르카 더보기, 세르카 노말, 세르카 하드, 세르카 나메, 고통의 가시, 고통의 가시 상점, 고통의 가시 교환, 고통의 가시 효율, 고통의 재련 재료 상자, 고통의 재련 보조 재료 주머니, 야금술 업화, 재봉술 업화, 영웅 젬 랜덤 상자, 로아 세르카 군단장, 로아 세르카 레이드, 로아 1740, 로아 1730, 로아 1710, 로아 카제로스 군단장',

  openGraph: {
    title: '로아로골 | 세르카 - 클리어 보상 & 고통의 가시 교환 상점',
    description: '로아 세르카 노말/하드/나메 클리어 보상, 더보기 손익, 고통의 가시 교환 상점 효율을 실시간 시세로 확인하세요.',
    url: '/cerka',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/cerka',
  },
}

export default function CerkaLayout({
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
            "name": "로아로골 - 세르카 계산",
            "url": `${SITE_URL}/cerka`,
            "description": "로아 세르카 노말/하드/나메 클리어 보상, 더보기 손익, 고통의 가시 교환 상점 효율을 실시간 시세로 계산",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "KRW"
            },
            "featureList": [
              "로아 세르카 클리어 보상 자동 계산",
              "로아 세르카 더보기 손익 분석",
              "로아 거래소 실시간 가격 반영",
              "로아 고통의 가시 교환 효율 계산",
              "로아 야금술/재봉술 업화 교환 효율 분석",
              "로아 고통의 재련 재료 상자 기댓값 계산"
            ]
          })
        }}
      />
      {/* SEO를 위한 JSON-LD 구조화된 데이터 - FAQPage (화면에 렌더링되는 faq-data.ts와 동일한 소스 사용) */}
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
                "text": item.a,
              },
            })),
          })
        }}
      />
    </>
  )
}
