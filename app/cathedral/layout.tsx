import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '로아 지평의 성당 보상 · 교환 효율',

  description: '지평의 성당 1~3단계 클리어 보상과 더보기 손익, 은총의 파편 교환 상점의 품목별 효율을 실시간 거래소 시세로 계산합니다.',

  keywords: '로아 지평의 성당 보상, 로아 지평의 성당 더보기, 로아 은총의 파편 교환, 로아로골',

  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 로아 지평의 성당 보상 · 교환 효율',
    description: '지평의 성당 1~3단계 클리어 보상과 더보기 손익, 은총의 파편 교환 상점의 품목별 효율을 실시간 거래소 시세로 계산합니다.',
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
    </>
  )
}
