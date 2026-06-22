import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '벨가르딘 보상',

  description: '로아로골 벨가르딘 보상 정리! 로아 그림자 레이드 벨가르딘 노말/하드/나메 난이도별 관문 클리어 골드와 코어 보상, 벨가르딘 정복전 진행과 무공/유물 칭호, 벨가르딘 상점 목록을 한눈에 확인하세요.',

  keywords: '로아로골, 로아 벨가르딘, 벨가르딘 보상, 벨가르딘 클리어 보상, 벨가르딘 클리어 골드, 벨가르딘 코어, 벨가르딘 정복전, 벨가르딘 칭호, 벨가르딘 무공 칭호, 벨가르딘 유물 칭호, 무공 칭호, 유물 칭호, 그림자 레이드, 로아 그림자 레이드, 벨가르딘 그림자 레이드, 벨가르딘 노말, 벨가르딘 하드, 벨가르딘 나메, 벨가르딘 상점, 로아 1750, 로아 1770, 로아 1780, 로스트아크 레이드 보상',

  openGraph: {
    title: '로아로골 | 벨가르딘 - 그림자 레이드 클리어 보상 & 정복전 칭호',
    description: '로아 그림자 레이드 벨가르딘 노말/하드/나메 난이도별 클리어 골드와 코어 보상, 정복전 무공/유물 칭호, 벨가르딘 상점을 확인하세요.',
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
            "description": "로아 그림자 레이드 벨가르딘 노말/하드/나메 난이도별 클리어 골드와 코어 보상, 정복전 무공/유물 칭호, 벨가르딘 상점 정리",
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
              "로아 벨가르딘 정복전 무공/유물 칭호 안내",
              "로아 벨가르딘 상점 교환 목록"
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
            "mainEntity": [
              {
                "@type": "Question",
                "name": "로아 벨가르딘은 어떤 레이드인가요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 벨가르딘은 그림자 레이드로, 노말(1750)/하드(1770)/나메(1780) 난이도로 나뉩니다. 난이도가 올라갈수록 클리어 골드와 코어 등 보상이 많아집니다. 로아로골에서 난이도별 관문 클리어 골드와 코어 보상을 정리해드립니다."
                }
              },
              {
                "@type": "Question",
                "name": "로아 벨가르딘 정복전 무공/유물 칭호는 무엇인가요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 벨가르딘은 정복전 콘텐츠로 진행 정도와 난이도에 따라 무공 칭호, 유물 칭호 등을 획득할 수 있습니다. 로아로골에서 벨가르딘 칭호 관련 정보를 함께 확인할 수 있습니다."
                }
              },
              {
                "@type": "Question",
                "name": "로아 벨가르딘 난이도별 클리어 골드는 얼마인가요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 벨가르딘은 노말/하드/나메 각 관문별로 클리어 골드가 다르게 지급됩니다. 로아로골에서 난이도별 관문 클리어 골드와 더보기 비용을 정리해 확인할 수 있습니다."
                }
              },
              {
                "@type": "Question",
                "name": "로아 벨가르딘에서 코어는 얼마나 얻나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 벨가르딘은 코어를 획득할 수 있는 그림자 레이드로, 난이도와 관문에 따라 코어 획득량이 달라집니다. 로아로골에서 벨가르딘 관문별 코어 획득량을 확인할 수 있습니다."
                }
              }
            ]
          })
        }}
      />
    </>
  )
}
