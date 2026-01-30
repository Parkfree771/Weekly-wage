import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: '로골로골의 개인정보처리방침입니다. 개인정보 수집 및 이용, 보유기간, 제3자 제공, 쿠키 사용 등에 대한 정책을 안내합니다.',
  keywords: '로골로골, 개인정보처리방침, 개인정보보호, 프라이버시정책',
  openGraph: {
    title: '로골로골 | 개인정보처리방침',
    description: '로골로골의 개인정보처리방침 및 데이터 보호 정책',
    url: 'https://lostarkweeklygold.kr/privacy',
    siteName: '로골로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://lostarkweeklygold.kr/privacy',
  },
}

export default function PrivacyLayout({
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
            "name": "개인정보처리방침",
            "url": "https://lostarkweeklygold.kr/privacy",
            "description": "로스트아크 골드 계산기의 개인정보 처리방침, 데이터 수집 및 보호 정책",
            "publisher": {
              "@type": "Organization",
              "name": "로골로골"
            }
          })
        }}
      />
    </>
  )
}
