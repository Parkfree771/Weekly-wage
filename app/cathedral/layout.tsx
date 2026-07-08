import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { faqData } from './faq-data'

export const metadata: Metadata = {
  title: '지평의 성당 보상',

  description: '로아로골 지평의 성당 보상 정리! 로아 지평의 성당 1단계/2단계/3단계 클리어 보상, 더보기 손익, 은총의 파편 교환 상점 목록과 교환 효율을 실시간 시세로 확인하세요. 코어, 젬, 야금술, 재봉술, 재련 재료 상자 구성 요소와 가격까지 한눈에.',

  keywords: '로아로골, 로아 지평의 성당, 지평의 성당 보상, 지평의 성당 클리어 보상, 지평의 성당 더보기, 은총의 파편, 은총의 파편 상점, 은총의 파편 교환, 은총의 파편 효율, 지평의 성당 1단계, 지평의 성당 2단계, 지평의 성당 3단계, 로스트아크 어비스 던전, 고대 코어, 유물 코어, 영웅 젬, 야금술 상자, 재봉술 상자, 재련 재료 상자, 로아 어비스 던전 보상',

  openGraph: {
    title: '로아로골 | 지평의 성당 - 클리어 보상 & 은총의 파편 교환 상점',
    description: '로아 지평의 성당 1~3단계 클리어 보상, 더보기 손익, 은총의 파편 교환 상점 효율을 실시간 시세로 확인하세요.',
    url: '/cathedral',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/cathedral',
  },
}

export default function CathedralLayout({
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
            "name": "로아로골 - 지평의 성당 보상 계산기",
            "url": `${SITE_URL}/cathedral`,
            "description": "지평의 성당 1~3단계 클리어 보상과 더보기 손익, 은총의 파편 교환 상점 효율을 실시간 시세로 계산",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "KRW"
            },
            "featureList": [
              "지평의 성당 단계별 클리어 보상 정리",
              "더보기 재료 가치와 손익 실시간 계산",
              "은총의 파편 교환 상점 효율 분석",
              "은총의 파편 주간 수급·교환 계획 달력"
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
