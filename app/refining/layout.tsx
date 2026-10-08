import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '로아 재련 시뮬레이터 · 재련 비용 계산',
  description: 'T4 재련을 실제 확률과 장인의 기운 그대로 시뮬레이션하고, 목표 레벨까지의 예상 재료와 골드 비용을 실시간 거래소 시세로 계산합니다.',
  keywords: '로아 재련 시뮬, 로아 강화 시뮬, 로아 재련 비용, 로아 장인의 기운, 로아로골',
  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 로아 재련 시뮬레이터 · 재련 비용 계산',
    description: 'T4 재련을 실제 확률과 장인의 기운 그대로 시뮬레이션하고, 목표 레벨까지의 예상 재료와 골드 비용을 실시간 거래소 시세로 계산합니다.',
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
    </>
  )
}
