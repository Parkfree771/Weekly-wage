import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '마이페이지 - 원정대 관리, 주간 골드 기록',
  description: '로골로골 마이페이지에서 원정대를 등록하고 주간 레이드 체크리스트를 관리하세요. 캐릭터별 골드 수입을 추적하고, 주간 골드 기록 차트로 수입 추이를 확인할 수 있습니다.',
  keywords: '로골로골, 로아 마이페이지, 로아 원정대, 로아 주간 체크리스트, 로아 골드 기록, 로아 레이드 체크, 로스트아크 원정대 관리',
  openGraph: {
    title: '로골로골 | 마이페이지 - 원정대 관리, 주간 골드 기록',
    description: '원정대를 등록하고 주간 레이드 체크리스트를 관리하세요. 주간 골드 기록 차트로 수입 추이를 확인할 수 있습니다.',
    url: 'https://lostarkweeklygold.kr/mypage',
    siteName: '로골로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://lostarkweeklygold.kr/mypage',
  },
}

export default function MyPageLayout({
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
            "name": "로골로골 - 마이페이지",
            "url": "https://lostarkweeklygold.kr/mypage",
            "description": "로스트아크 원정대 등록, 주간 레이드 체크리스트, 골드 기록 관리 서비스",
            "applicationCategory": "GameApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "KRW"
            },
            "featureList": [
              "원정대 캐릭터 등록 및 관리",
              "주간 레이드 체크리스트",
              "더보기 비용 관리",
              "주간 골드 기록 차트",
              "자동 주간 초기화"
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
            "mainEntity": [
              {
                "@type": "Question",
                "name": "마이페이지는 어떻게 이용하나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Google 계정으로 로그인한 후 캐릭터 이름을 검색하면 원정대가 자동으로 등록됩니다. 최대 6캐릭터의 주간 레이드를 체크하고 골드 수입을 관리할 수 있습니다."
                }
              },
              {
                "@type": "Question",
                "name": "주간 골드 기록은 자동 저장되나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "네, 매주 수요일 오전 6시 이후 첫 접속 시 이전 주의 골드 기록이 자동으로 저장됩니다. 다만 레이드 체크 변경 후에는 저장하기 버튼을 눌러야 합니다."
                }
              },
              {
                "@type": "Question",
                "name": "다른 기기에서도 데이터가 유지되나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "네, 같은 Google 계정으로 로그인하면 PC, 모바일 등 어떤 기기에서든 동일한 데이터를 확인하고 관리할 수 있습니다."
                }
              }
            ]
          })
        }}
      />
    </>
  )
}
