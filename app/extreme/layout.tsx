import { Metadata } from 'next'
import { SITE_URL, isNoindexed } from '@/lib/site-config'
import { faqData } from './faq-data'

export const metadata: Metadata = {
  title: '익스트림 3막·종막 보상 정리 (모르둠·카제로스)',

  description: '로스트아크 카제로스 레이드 익스트림 3막(모르둠)·종막(카제로스) 난이도별 클리어 보상 정리. 노말·하드·나이트메어 골드와 전용 주화, 최초 클리어 보상, 나이트메어 칭호(뇌전의 군주·파멸의 군주)와 20만 골드, 주화 제작소까지.',

  keywords: '익스트림, 익스트림 레이드, 익스트림 3막, 익스트림 종막, 익스트림 모르둠, 익스트림 카제로스, 카제로스 익스트림, 모르둠 익스트림, 익스트림 보상, 익스트림 나이트메어, 뇌전의 군주, 파멸의 군주, 뇌전의 주화, 빛과 어둠의 주화, 혼돈의 주화, 카제로스 익스트림 제작소, 로스트아크 익스트림, 로아 익스트림',

  openGraph: {
    images: ['/extreme-mordum-kazeroth.webp'],
    title: '로아로골 | 익스트림 3막·종막 보상 정리',
    description: '모르둠·카제로스 익스트림 난이도별 골드·주화·최초 클리어 보상과 나이트메어 칭호 정리.',
    url: '/extreme',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/extreme',
  },
  // NOINDEX_PATHS(lib/site-config) 에 들어 있을 때만 noindex — 2026-09-18 보상 공개로 색인 복귀.
  robots: isNoindexed('/extreme') ? { index: false, follow: true } : undefined,
}

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: '익스트림 3막·종막 보상 정리 (모르둠·카제로스)',
  description: '카제로스 레이드 익스트림 3막·종막 난이도별 클리어 보상, 최초 클리어 보상, 나이트메어 칭호, 주화 제작소 정리.',
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
