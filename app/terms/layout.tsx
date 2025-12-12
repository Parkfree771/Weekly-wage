import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '이용약관 | 로아 주간 골드 계산',
  description: '로스트아크 골드 계산기의 이용약관입니다. 서비스 이용 시 권리와 의무, 면책조항, 데이터 출처 등을 안내합니다.',
  keywords: '로스트아크, 이용약관, 서비스약관, 골드계산기약관',
  openGraph: {
    title: '이용약관 | 로아 주간 골드 계산',
    description: '로스트아크 골드 계산기의 이용약관 및 서비스 정책',
    url: 'https://lostarkweeklygold.kr/terms',
    siteName: '로아 주간 골드 계산',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://lostarkweeklygold.kr/terms',
  },
}

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      {/* SEO를 위한 JSON-LD 구조화된 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "이용약관",
            "url": "https://lostarkweeklygold.kr/terms",
            "description": "로스트아크 골드 계산기의 이용약관 및 서비스 정책",
            "publisher": {
              "@type": "Organization",
              "name": "로아 주간 골드 계산"
            }
          })
        }}
      />
    </>
  )
}
