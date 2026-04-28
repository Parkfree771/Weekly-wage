import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '이용약관',
  description: '로아로골의 이용약관입니다. 서비스 이용 시 권리와 의무, 면책조항, 데이터 출처 등을 안내합니다.',
  keywords: '로아로골, 이용약관, 서비스약관',
  openGraph: {
    title: '로아로골 | 이용약관',
    description: '로아로골의 이용약관 및 서비스 정책',
    url: '/terms',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/terms',
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
            "url": `${SITE_URL}/terms`,
            "description": "로스트아크 골드 계산기의 이용약관 및 서비스 정책",
            "publisher": {
              "@type": "Organization",
              "name": "로아로골"
            }
          })
        }}
      />
    </>
  )
}
