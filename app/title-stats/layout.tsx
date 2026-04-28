import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '홍염의 군주 · 혹한의 군주 칭호 전투력 통계 & 명예의 전당 | 로아로골',

  description: '로스트아크 익스트림 레이드 칭호(홍염의 군주 · 혹한의 군주) 전투력 실시간 통계와 명예의 전당. 칭호 획득자의 전투력·아이템레벨·직업 평균을 한눈에 확인하고, 가장 먼저 칭호를 각인한 10공대 80명의 순위를 명예의 전당에서 확인하세요.',

  keywords: '홍염의 군주 통계, 혹한의 군주 통계, 홍염의 군주 전투력, 혹한의 군주 전투력, 칭호 전투력, 익스트림 칭호 통계, 익스트림 칭호 전투력, 명예의 전당, 홍염의 군주 명예의 전당, 홍염의 군주 1등, 홍염의 군주 최초, 익스트림 레이드 전투력, 로아 칭호 통계, 로스트아크 칭호 통계, 로아로골 칭호',

  openGraph: {
    title: '로아로골 | 홍염의 군주 · 혹한의 군주 칭호 전투력 통계',
    description: '칭호 획득자 전투력·직업 통계와 가장 빠른 10공대 80명 명예의 전당.',
    url: '/title-stats',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/title-stats',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: '홍염의 군주 · 혹한의 군주 칭호 전투력 통계 & 명예의 전당',
  description: '로스트아크 익스트림 레이드 칭호 획득자의 전투력·레벨·직업 실시간 통계와, 가장 먼저 칭호를 각인한 10공대 80명의 명예의 전당.',
  url: `${SITE_URL}/title-stats`,
  isPartOf: {
    '@type': 'WebSite',
    name: '로아로골',
    url: SITE_URL,
  },
  mainEntity: {
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '명예의 전당은 어떻게 올라가나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '익스트림 레이드 나이트메어 난이도 최초 클리어 시 전설 칭호(1막: 홍염의 군주, 2막: 혹한의 군주)를 얻고, 해당 칭호를 착용한 상태에서 공대 단위(8인)로 등록하면 명예의 전당에 기록됩니다. 10공대 80명이 채워진 이후에는 개인 등록으로 전환됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '칭호 전투력 통계는 어떻게 집계되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '칭호를 획득하고 등록한 모든 캐릭터의 전투력·아이템 레벨을 날짜별/직업별로 집계하여 평균 전투력 추이, 직업별 평균, 딜러/서포터 비율을 실시간으로 제공합니다.',
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

export default function TitleStatsLayout({
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
