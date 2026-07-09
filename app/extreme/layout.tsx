import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { faqData } from './faq-data'

export const metadata: Metadata = {
  title: '익스트림 3막·종막 (모르둠·카제로스) - 코밍순',

  description: '로스트아크 익스트림 레이드 3막(모르둠)·종막(카제로스) 코밍순 안내. 출시 예정일, 난이도별 보상, 토큰 상점 정보를 공개되는 대로 가장 빠르게 업데이트합니다.',

  keywords: '익스트림, 익스트림 레이드, 익스트림 3막, 익스트림 종막, 익스트림 모르둠, 익스트림 카제로스, 모르둠, 카제로스, 카제로스 레이드, 카제로스 익스트림, 모르둠 익스트림, 익스트림 출시일, 익스트림 코밍순, 로스트아크 익스트림, 로아 익스트림',

  openGraph: {
    title: '로아로골 | 익스트림 3막·종막 (모르둠·카제로스)',
    description: '익스트림 3막 모르둠·종막 카제로스 코밍순 — 출시 예정일과 보상 정보를 확인하세요.',
    url: '/extreme',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/extreme',
  },
}

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: '익스트림 3막·종막 (모르둠·카제로스) 코밍순',
  description: '로스트아크 익스트림 레이드 3막(모르둠)·종막(카제로스) 코밍순 안내. 출시 예정일과 난이도별 보상 정보.',
  url: `${SITE_URL}/extreme`,
  isPartOf: {
    '@type': 'WebSite',
    name: '로아로골',
    url: SITE_URL,
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqData.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.a,
    },
  })),
}

export default function ExtremeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  )
}
