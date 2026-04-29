import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '혹한의 군주 칭호 전투력 통계 & 명예의 전당 | 로아로골',

  description: '로스트아크 익스트림 2막 전설 칭호 "혹한의 군주"(Lord of Frozen Tundra) 전투력 실시간 통계와 명예의 전당. 칭호 획득자의 전투력·아이템 레벨·직업 평균을 한눈에 확인하고, 가장 먼저 칭호를 각인한 5공대 40명의 순위와 등록한 모든 칭호 보유자의 캐릭터를 한 페이지에서 확인하세요.',

  keywords: '혹한의 군주, 혹한의 군주 통계, 혹한의 군주 전투력, 혹한의 군주 명예의 전당, 혹한의 군주 1등, 혹한의 군주 최초, 혹한의 군주 칭호, Lord of Frozen Tundra, 익스트림 2막, 익스트림 2막 칭호, 익스트림 2막 통계, 익스트림 2막 명예의 전당, 익스트림 2막 일정, 혹한의 군주 등록, 혹한의 군주 직업, 로아 2막 통계, 로스트아크 2막 통계',

  openGraph: {
    title: '로아로골 | 혹한의 군주 칭호 전투력 통계',
    description: '익스트림 2막 "혹한의 군주" 칭호 보유자 전투력 통계와 5공대 40명 명예의 전당, 모든 등록자 캐릭터 명단.',
    url: '/title-stats/frost',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/title-stats/frost',
  },
}

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: '혹한의 군주 칭호 전투력 통계 & 명예의 전당',
  description: '로스트아크 익스트림 2막 전설 칭호 "혹한의 군주" 보유자의 전투력·레벨·직업 실시간 통계와 가장 먼저 칭호를 각인한 5공대 40명의 명예의 전당, 등록한 모든 보유자의 캐릭터 명단.',
  url: `${SITE_URL}/title-stats/frost`,
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
      name: '혹한의 군주 칭호는 언제 획득할 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '익스트림 2막은 2026년 5월 20일 오전 10시에 오픈되어 6월 16일까지 진행됩니다. 2막 나이트메어 난이도(레벨 1770) 최초 클리어 시 전설 칭호 "혹한의 군주(Lord of Frozen Tundra)"를 획득합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '혹한의 군주와 홍염의 군주 명예의 전당은 분리되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '두 명예의 전당은 완전히 분리 운영됩니다. "홍염의 군주"는 1막(/title-stats), "혹한의 군주"는 2막(/title-stats/frost) 페이지에서 각각 5공대 40명을 따로 모집하며, 1막에 등록했더라도 2막 칭호 획득 후 별도로 등록해야 합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '혹한의 군주 통계 페이지에서 무엇을 볼 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '2막 등록자만의 전투력·아이템 레벨을 날짜별/직업별로 집계해, 1막과는 별개의 평균 전투력 추이, 직업별 평균, 딜러/서포터 비율을 실시간으로 제공합니다. 등록자 전체 명단은 등록순·전투력순·레벨순 정렬과 딜러/서포터 필터로 확인할 수 있고, 한 원정대(계정)당 한 캐릭터만 등록 가능합니다.',
      },
    },
  ],
}

export default function FrostLayout({
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
