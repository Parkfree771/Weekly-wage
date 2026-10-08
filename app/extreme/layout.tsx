import { Metadata } from 'next'
import { SITE_URL, isNoindexed } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '로아 익스트림 보상 정리 (3막·종막)',

  description: '카제로스 익스트림 3막(모르둠)·종막(카제로스)의 난이도별 클리어 골드와 주화, 최초 클리어 보상, 나이트메어 칭호와 주화 제작소를 정리했습니다.',

  keywords: '로아 익스트림, 로아 익스트림 보상, 로아 익스트림 종막, 로아 카제로스 익스트림, 로아로골',

  openGraph: {
    images: ['/extreme-mordum-kazeroth.webp'],
    title: '로아로골 | 로아 익스트림 보상 정리 (3막·종막)',
    description: '카제로스 익스트림 3막(모르둠)·종막(카제로스)의 난이도별 클리어 골드와 주화, 최초 클리어 보상, 나이트메어 칭호와 주화 제작소를 정리했습니다.',
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
      {children}
    </>
  )
}
