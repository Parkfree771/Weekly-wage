import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '혹한의 군주 칭호 전투력 통계 & 명예의 전당 | 로아로골',

  description: '로스트아크 익스트림 2막 전설 칭호 "혹한의 군주"(Lord of Frozen Tundra) 전투력 실시간 통계와 명예의 전당. 칭호 획득자의 전투력·아이템 레벨·직업 평균을 한눈에 확인하고, 가장 먼저 칭호를 각인한 5공대 40명의 순위와 등록한 모든 칭호 보유자의 캐릭터를 한 페이지에서 확인하세요.',

  keywords: '혹한의 군주, 혹한의 군주 통계, 혹한의 군주 전투력, 혹한의 군주 명예의 전당, 혹한의 군주 1등, 혹한의 군주 최초, 혹한의 군주 칭호, 혹한의 군주 보상, Lord of Frozen Tundra, 익스트림 2막, 익스트림 2막 칭호, 익스트림 2막 보상, 익스트림 2막 일정, 익스트림 칭호 통계, 익스트림 칭호 전투력, 칭호 전투력, 로아 칭호 통계, 로스트아크 칭호 통계, 로아로골 칭호',

  openGraph: {
    title: '로아로골 | 혹한의 군주 칭호 전투력 통계',
    description: '익스트림 2막 "혹한의 군주" 칭호 보유자 전투력 통계와 5공대 40명 명예의 전당, 모든 등록자 캐릭터 명단.',
    url: 'https://lostarkweeklygold.kr/title-stats/frost',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://lostarkweeklygold.kr/title-stats/frost',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: '혹한의 군주 칭호 전투력 통계 & 명예의 전당',
  description: '로스트아크 익스트림 2막 전설 칭호 "혹한의 군주" 보유자의 전투력·레벨·직업 실시간 통계와 가장 먼저 칭호를 각인한 5공대 40명의 명예의 전당, 등록한 모든 보유자의 캐릭터 명단.',
  url: 'https://lostarkweeklygold.kr/title-stats/frost',
  isPartOf: {
    '@type': 'WebSite',
    name: '로아로골',
    url: 'https://lostarkweeklygold.kr',
  },
  mainEntity: {
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '명예의 전당은 어떻게 올라가나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '익스트림 레이드 2막 나이트메어 난이도 최초 클리어 시 전설 칭호 "혹한의 군주(Lord of Frozen Tundra)"를 획득합니다. 칭호를 착용한 상태에서 공대 단위(8인)로 등록하면 명예의 전당에 기록됩니다. 5공대 40명이 채워진 이후에는 개인 등록으로 자동 전환됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '칭호 전투력 통계는 어떻게 집계되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '"혹한의 군주" 칭호를 획득하고 등록한 모든 캐릭터의 전투력·아이템 레벨을 날짜별/직업별로 집계하여 평균 전투력 추이, 직업별 평균, 딜러/서포터 비율을 실시간으로 제공합니다. 등록자 전체 명단은 등록순/전투력순/레벨순 정렬과 딜러·서포터 필터로 확인할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '본캐와 부캐 모두 등록할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '한 원정대(계정)당 한 캐릭터만 등록 가능합니다. 본캐 등록 후 부캐로 재등록하거나 다른 공대에 추가하려 하면 자동으로 차단됩니다.',
        },
      },
    ],
  },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  )
}
