import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '원정대 수급 골드 시뮬',
  description: '로스트아크 원정대 수급 골드 시뮬레이터! 캐릭터 레벨업 시 원정대 주간 클리어 골드와 재련 재료 수급이 얼마나 늘어나는지 미리 계산해보세요.',
  keywords: '로아로골, 로아 주간 골드, 원정대 골드, 레벨업 골드, 골드 시뮬, 로스트아크 주급, 재련 재료 수급, 클리어 골드',
  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 원정대 수급 골드 시뮬 - 레벨업 골드·재료 변화',
    description: '캐릭터 레벨업 시 원정대 주간 클리어 골드와 재련 재료 수급 변화를 미리 계산해보세요.',
    url: '/expedition-gold',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/expedition-gold',
  },
}

export default function ExpeditionGoldLayout({
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
            "name": "로아로골 - 원정대 수급 골드 시뮬",
            "url": `${SITE_URL}/expedition-gold`,
            "description": "로스트아크 캐릭터 레벨업 시 원정대 주간 클리어 골드와 재련 재료 수급 변화를 계산하는 시뮬레이터.",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "KRW"
            },
            "featureList": [
              "캐릭터명 검색으로 원정대 아이템 레벨 자동 불러오기",
              "레벨업 목표별 주간 클리어 골드 변화 계산",
              "유통·귀속 골드 구분 및 상위 3레이드 자동 선정",
              "재련 재료 수급 증가량 계산 (골드+재련 재료 탭)"
            ]
          })
        }}
      />
    </>
  )
}
