import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { faqData } from './faq-data'

export const metadata: Metadata = {
  title: '원정대 수급 골드 시뮬 - 레벨업하면 주급이 얼마나 오를까',
  description:
    '로스트아크 원정대 수급 골드 시뮬레이터. 캐릭터명만 검색하면 지금 주급과 목표 레벨 달성 후 주급을 비교해 레벨업 이득을 계산합니다. 상위 3레이드·상위 6캐릭터 제한과 귀속·유통 골드 구분을 그대로 반영하고, 균열·가디언 토벌·모래시계 재련 재료 수급 변화까지 실시간 거래소 시세로 환산해 보여줍니다.',
  keywords:
    '로아 원정대 수급 골드, 로스트아크 레벨업 골드, 로아 주급 계산, 원정대 주간 골드, 로아 레벨업 이득, 로아 상위 3레이드, 로아 골드 인정 6캐릭, 로아 귀속골드 유통골드, 로아 재련 재료 수급, 로아 레벨업 시뮬레이터, 로아 주간 클리어 골드, 로아로골',
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
