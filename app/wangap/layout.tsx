import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '로아 완갑 재련 시뮬레이터',
  description: '벨가르딘 완갑을 영웅부터 고대 승급까지 실제 확률로 강화해 보고, 재련 견적·비용과 숨결 최적 투입량을 실시간 시세로 계산합니다.',
  keywords: '로아 완갑 재련 시뮬, 로아 완갑 강화, 로아 완갑 재련 비용, 로아 벨가르딘 완갑, 로아로골',
  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 로아 완갑 재련 시뮬레이터',
    description: '벨가르딘 완갑을 영웅부터 고대 승급까지 실제 확률로 강화해 보고, 재련 견적·비용과 숨결 최적 투입량을 실시간 시세로 계산합니다.',
    url: '/wangap',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '로아로골 | 로아 완갑 재련 시뮬레이터',
    description: '벨가르딘 완갑을 영웅부터 고대 승급까지 실제 확률로 강화해 보고, 재련 견적·비용과 숨결 최적 투입량을 실시간 시세로 계산합니다.',
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
            "description": "로아 벨가르딘 완갑 재련 시뮬레이터. 완갑 재련 견적·비용 계산, 완갑 재료(파괴석 결정·수호석 결정 동시 소모), 영웅-전설-유물-고대 승급, 보조재료 최적화 재현",
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
              "영웅-전설-유물-고대 등급 승급 (사령의 잔영·죽음의 손)",
              "용암·빙하의 숨결 보조재료 시세 기반 최적화"
            ]
          })
        }}
      />
    </>
  )
}
