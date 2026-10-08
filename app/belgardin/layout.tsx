import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '로아 벨가르딘 보상 정리',

  description: '그림자 레이드 벨가르딘의 노말·하드·나메 관문별 클리어 골드와 코어·재련 재료 보상, 상점 교환 목록을 실시간 시세로 정리했습니다.',

  keywords: '로아 벨가르딘 보상, 로아 벨가르딘 클리어 골드, 로아 그림자 레이드, 로아로골',

  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 로아 벨가르딘 보상 정리',
    description: '그림자 레이드 벨가르딘의 노말·하드·나메 관문별 클리어 골드와 코어·재련 재료 보상, 상점 교환 목록을 실시간 시세로 정리했습니다.',
    url: '/belgardin',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/belgardin',
  },
}

export default function BelgardinLayout({
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
            "name": "로아로골 - 벨가르딘",
            "url": `${SITE_URL}/belgardin`,
            "description": "로아 그림자 레이드 벨가르딘 노말/하드/나메 난이도별 클리어 골드와 코어·재련 재료 보상, 벨가르딘 상점 정리",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "KRW"
            },
            "featureList": [
              "로아 벨가르딘 난이도별 클리어 골드 정리",
              "로아 벨가르딘 관문별 코어 획득량 정리",
              "로아 벨가르딘 상점 교환 목록"
            ]
          })
        }}
      />
    </>
  )
}
