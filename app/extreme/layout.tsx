import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: '익스트림 레이드 보상 정리 - 1막·2막 골드·토큰·최초 클리어 | 로아로골',

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
  mainEntity: [
    {
      '@type': 'Question',
      name: '익스트림 레이드 난이도별 골드와 토큰 보상은?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '노말(1720) 20,000G·토큰 150개, 하드(1750) 45,000G·토큰 200개, 나이트메어(1770) 45,000G·토큰 200개를 획득합니다. 토큰은 매주 한 번 보상으로 지급되며, 최초 클리어 1회 한정으로 전설 카드팩·영웅 젬·젬 가공 초기화권·불과 얼음의 주화 100개를 추가로 받습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '익스트림 토큰(불과 얼음의 주화)으로 무엇을 살 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '토큰 상점에서는 유물 전투 각인서 12종, 영웅 젬 6종(선택/랜덤), 젬 가공 초기화권, 어빌리티 스톤, 보석류, 정제 재료 등을 구매할 수 있습니다. 페이지 내 효율 계산기로 항목별 순골드 환산값을 비교해 어떤 항목이 가장 이득인지 확인할 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '익스트림 1막과 2막 일정은 어떻게 되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '총 8주간 진행되며 1막은 2026년 4월 22일~5월 19일(4주), 2막은 5월 20일~6월 16일(4주) 구성입니다. 1막은 "홍염의 군주", 2막은 "혹한의 군주" 전설 칭호를 나이트메어 최초 클리어 시 획득합니다.',
      },
    },
  ],
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
