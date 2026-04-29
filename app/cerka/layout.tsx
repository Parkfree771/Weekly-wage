import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '세르카 클리어 보상 & 고통의 가시 교환 상점 - 교환 효율 계산',

  description: '로아로골 세르카 보상 정리! 로아 세르카 노말/하드/나메 클리어 보상, 더보기 손익, 고통의 가시 교환 상점 목록과 교환 효율을 실시간 시세로 확인하세요. 야금술/재봉술 업화, 고통의 재련 재료 상자, 보조 재료 주머니, 영웅~고급 젬 랜덤 상자까지 한눈에.',

  keywords: '로아로골, 로아 세르카, 세르카 보상, 세르카 클리어 보상, 세르카 더보기, 세르카 노말, 세르카 하드, 세르카 나메, 고통의 가시, 고통의 가시 상점, 고통의 가시 교환, 고통의 가시 효율, 고통의 재련 재료 상자, 고통의 재련 보조 재료 주머니, 야금술 업화, 재봉술 업화, 영웅 젬 랜덤 상자, 로아 세르카 군단장, 로아 세르카 레이드, 로아 1740, 로아 1730, 로아 1710, 로아 카제로스 군단장',

  openGraph: {
    title: '로아로골 | 세르카 - 클리어 보상 & 고통의 가시 교환 상점',
    description: '로아 세르카 노말/하드/나메 클리어 보상, 더보기 손익, 고통의 가시 교환 상점 효율을 실시간 시세로 확인하세요.',
    url: '/cerka',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/cerka',
  },
}

export default function CerkaLayout({
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
            "name": "로아로골 - 세르카 계산",
            "url": `${SITE_URL}/cerka`,
            "description": "로아 세르카 노말/하드/나메 클리어 보상, 더보기 손익, 고통의 가시 교환 상점 효율을 실시간 시세로 계산",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "KRW"
            },
            "featureList": [
              "로아 세르카 클리어 보상 자동 계산",
              "로아 세르카 더보기 손익 분석",
              "로아 거래소 실시간 가격 반영",
              "로아 고통의 가시 교환 효율 계산",
              "로아 야금술/재봉술 업화 교환 효율 분석",
              "로아 고통의 재련 재료 상자 기댓값 계산"
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
                "name": "로아 세르카 더보기는 언제 선택하는 게 이득인가요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 세르카 더보기 효율은 로아 거래소 시세에 따라 달라집니다. 로아로골에서 세르카 노말/하드/나메 각 관문별 더보기 손익을 실시간 시세로 자동 계산해드립니다."
                }
              },
              {
                "@type": "Question",
                "name": "로아 고통의 가시 1개 가치는 어떻게 계산하나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 고통의 가시 1개 가치는 고통의 재련 재료 상자 기댓값을 5로 나눈 값입니다. 25% 확률로 운명의 파편 6000, 위대한 운명의 돌파석 3, 운명의 파괴석 결정 100, 운명의 수호석 결정 300 중 하나가 나오므로 실시간 시세로 자동 계산됩니다."
                }
              },
              {
                "@type": "Question",
                "name": "로아 세르카 야금술/재봉술 업화 교환은 이득인가요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 세르카 야금술 업화 [19-20]은 거래가능 버전(가시 20 + 3000G, 주간 2회)과 원정대 귀속 버전(가시 20, 원정대 주간 1회)이 있습니다. 로아로골에서 거래소 시세 기준 실시간 효율을 확인할 수 있습니다."
                }
              },
              {
                "@type": "Question",
                "name": "로아 세르카 노말, 하드, 나메 차이가 뭔가요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 세르카는 노말(1710), 하드(1730), 나메(1740) 세 단계로 나뉩니다. 난이도가 올라갈수록 클리어 골드와 보상 재료가 많아지며, 하드/나메는 운명의 파괴석 결정 같은 계승 재료와 고통의 가시를 추가로 획득합니다."
                }
              },
              {
                "@type": "Question",
                "name": "로아 영웅~고급 젬 랜덤 상자 기댓값은 얼마인가요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "로아 영웅~고급 젬 랜덤 상자는 영웅 등급이 5% 확률로 나옵니다(안정/침식 1.5%, 견고/왜곡 0.75%, 불변/붕괴 0.25%). 로아로골에서 거래소 시세 기준 기댓값과 가시 5개 교환 효율을 실시간 계산해드립니다."
                }
              }
            ]
          })
        }}
      />
    </>
  )
}
