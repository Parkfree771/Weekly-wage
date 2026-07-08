import { Metadata } from 'next'
import { faqData } from './faq-data'

export const metadata: Metadata = {
  title: '일일/주간 숙제 정리',

  description: '로아로골 일일/주간 숙제 정리! 레이드 제외 — 균열·전선, 가디언 토벌(가토), 카오스 게이트, 필드보스, 할의 모래시계의 레벨별 재화 보상을 하루/일주일/한달 기준으로 쌓이는 양까지 한눈에 확인하세요.',

  keywords: '로아로골, 로아 일일 숙제, 로아 주간 숙제, 균열 보상, 전선 보상, 가디언 토벌 보상, 가토 보상, 카오스 게이트 보상, 필드보스 보상, 할의 모래시계 보상, 로아 재화 계산, 카오스던전 보상, 레벨별 보상',

  openGraph: {
    title: '로아로골 | 일일/주간 숙제 정리 - 균열·가토·카게·필보·모래시계 재화',
    description: '레이드 제외 일일/주간 콘텐츠의 레벨별 재화 보상을 기간별 누적으로 정리.',
    url: '/homework',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/homework',
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

export default function HomeworkLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  )
}
