import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { faqData } from './faq-data'

export const metadata: Metadata = {
  title: '완갑 재련 시뮬레이터 - 벨가르딘 완갑 강화 시뮬, 재련 견적·비용',
  description:
    '로아 완갑 재련·강화 시뮬레이터! 벨가르딘 완갑을 전설-유물-고대 승급까지 미리 강화해보세요. 완갑 재련 견적과 완갑 재련 비용, 완갑 재료(파괴석 결정·수호석 결정 동시 소모)를 실시간 거래소 시세로 계산하고, 용암·빙하의 숨결 보조재료 최적화와 장인의 기운까지 실제 그대로 재현합니다.',
  keywords:
    '완갑, 로아 완갑, 벨가르딘 완갑, 완갑 재련 시뮬, 완갑 재련 견적, 완갑 재련 비용, 완갑 재료, 로아 완갑 재련, 완갑 재련, 완갑 강화, 완갑 강화 시뮬, 로아 완갑 강화, 완갑 시뮬, 완갑 승급, 완갑 확률, 로아 강화 시뮬, 로아 재련 시뮬, 로스트아크 완갑, 벨가르딘 장비, 로아 강화 확률, 장인의 기운, 로아로골, 로골로골',
  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 완갑 재련 시뮬레이터 - 벨가르딘 완갑',
    description: '벨가르딘 완갑 재련 시뮬! 전설-유물-고대 승급, 완갑 재련 견적·비용, 보조재료 최적화까지 미리 체험하세요.',
    url: '/wangap',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '로아로골 | 완갑 재련 시뮬레이터 - 벨가르딘 완갑',
    description: '벨가르딘 완갑 재련을 전설-유물-고대 승급까지 미리 체험하고 재련 견적·비용을 계산하세요.',
  },
  alternates: {
    canonical: '/wangap',
  },
}

export default function WangapLayout({
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
            "name": "로아로골 - 완갑 재련 시뮬레이터 (벨가르딘 완갑)",
            "url": `${SITE_URL}/wangap`,
            "description": "로아 벨가르딘 완갑 재련 시뮬레이터. 완갑 재련 견적·비용 계산, 완갑 재료(파괴석 결정·수호석 결정 동시 소모), 전설-유물-고대 승급, 보조재료 최적화 재현",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "KRW"
            },
            "featureList": [
              "완갑 실제 재련 시뮬레이션 (로아 강화 시뮬)",
              "완갑 재련 견적·비용 실시간 시세 계산",
              "전설-유물-고대 등급 승급 (벨가르딘 특수 재료)",
              "용암·빙하의 숨결 보조재료 시세 기반 최적화"
            ]
          })
        }}
      />
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
