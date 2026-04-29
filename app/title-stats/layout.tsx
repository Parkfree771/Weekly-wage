import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '홍염의 군주 칭호 전투력 통계 & 명예의 전당 | 로아로골',

  description: '로스트아크 익스트림 1막 전설 칭호 "홍염의 군주(Lord of Crimson Flame)" 전투력 실시간 통계와 명예의 전당. 칭호 획득자의 전투력·아이템 레벨·직업 평균을 확인하고, 가장 먼저 1막을 각인한 5공대 40명의 순위를 한 페이지에서 확인하세요.',

  keywords: '홍염의 군주, 홍염의 군주 통계, 홍염의 군주 전투력, 홍염의 군주 명예의 전당, 홍염의 군주 1등, 홍염의 군주 최초, 홍염의 군주 칭호, Lord of Crimson Flame, 익스트림 1막, 익스트림 1막 칭호, 익스트림 1막 통계, 익스트림 1막 명예의 전당, 칭호 전투력 통계, 로아 칭호 통계, 로스트아크 칭호 통계, 로아로골 칭호',

  openGraph: {
    title: '로아로골 | 홍염의 군주 칭호 전투력 통계',
    description: '익스트림 1막 "홍염의 군주" 칭호 보유자 전투력 통계와 5공대 40명 명예의 전당.',
    url: '/title-stats',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/title-stats',
  },
}

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: '홍염의 군주 칭호 전투력 통계 & 명예의 전당',
  description: '로스트아크 익스트림 1막 전설 칭호 "홍염의 군주" 보유자의 전투력·레벨·직업 실시간 통계와 가장 먼저 1막을 각인한 5공대 40명의 명예의 전당.',
  url: `${SITE_URL}/title-stats`,
  isPartOf: {
    '@type': 'WebSite',
    name: '로아로골',
    url: SITE_URL,
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '홍염의 군주 칭호는 어떻게 획득하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '익스트림 레이드 1막 나이트메어 난이도(레벨 1770) 최초 클리어 시 전설 칭호 "홍염의 군주(Lord of Crimson Flame)"를 획득합니다. 1막은 2026년 4월 22일부터 5월 19일까지 4주간 진행됩니다.',
      },
    },
    {
      '@type': 'Question',
      name: '홍염의 군주 명예의 전당 등록 방식은?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '"홍염의 군주" 칭호를 착용한 상태에서 공대 단위(8인) 또는 개인으로 등록할 수 있습니다. 5공대 40명이 채워질 때까지 공대 등록이 우선이며, 이후에는 개인 등록으로 자동 전환됩니다. 한 원정대(계정)당 한 캐릭터만 등록 가능합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '홍염의 군주 통계는 어떤 데이터를 제공하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '"홍염의 군주" 등록자의 평균 전투력·아이템 레벨 추이를 날짜별로 보여주며, 직업별 평균 전투력과 딜러/서포터 비율을 실시간으로 제공합니다. 등록자 전체 명단은 등록순/전투력순/레벨순 정렬과 딜러·서포터 필터로 확인할 수 있습니다.',
      },
    },
  ],
}

export default function TitleStatsLayout({
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
