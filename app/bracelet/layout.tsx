import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '로아 팔찌 시뮬레이터',
  description: '전투 특성을 고르고 잠금·재변환을 반복하며 원하는 부여 효과가 나올 때까지 실제 확률로 팔찌를 굴려 보는 로스트아크 팔찌 시뮬레이터입니다.',
  keywords: '로아 팔찌 시뮬, 로아 팔찌 부여효과, 로아 팔찌 재변환, 로아로골',
  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 로아 팔찌 시뮬레이터',
    description: '전투 특성을 고르고 잠금·재변환을 반복하며 원하는 부여 효과가 나올 때까지 실제 확률로 팔찌를 굴려 보는 로스트아크 팔찌 시뮬레이터입니다.',
    url: '/bracelet',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/bracelet',
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
            "url": `${SITE_URL}/bracelet`,
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
