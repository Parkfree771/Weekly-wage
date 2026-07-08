import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { faqData } from './faq-data'

export const metadata: Metadata = {
  title: '익스트림 보상',

  description: '로스트아크 익스트림 레이드 보상 완전 정리. 노말(1720)·하드(1750)·나이트메어(1770) 난이도별 골드, 토큰(xhzms), 최초 클리어 전설 카드팩·영웅 젬·젬 가공 초기화권 획득량. 1막 홍염의 군주, 2막 혹한의 군주 일정과 입장 조건을 한눈에 확인하세요.',

  keywords: '익스트림 레이드 보상, 익스트림 보상 정리, 익스트림 골드, 익스트림 토큰, 익스트림 1막, 익스트림 2막, 익스트림 노말, 익스트림 하드, 익스트림 나이트메어, 익스트림 최초 클리어, 익스트림 입장 조건, 익스트림 일정, 익스트림 1720, 익스트림 1750, 익스트림 1770, 홍염의 군주 보상, 혹한의 군주 보상, 로스트아크 익스트림, 로아 익스트림',

  openGraph: {
    title: '로아로골 | 익스트림 레이드 보상 정리',
    description: '노말·하드·나이트메어 난이도별 골드·토큰·최초 클리어 보상을 한눈에.',
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
  name: '익스트림 레이드 보상 정리',
  description: '로스트아크 익스트림 레이드 난이도별 보상 정리. 노말·하드·나이트메어 골드, 토큰, 최초 클리어 보상.',
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
