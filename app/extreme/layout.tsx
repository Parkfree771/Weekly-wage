import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '익스트림 레이드 보상 정리 - 1막·2막 골드·토큰·최초 클리어 | 로아로골',

  description: '로스트아크 익스트림 레이드 보상 완전 정리. 노말(1720)·하드(1750)·나이트메어(1770) 난이도별 골드, 토큰(xhzms), 최초 클리어 전설 카드팩·영웅 젬·젬 가공 초기화권 획득량. 1막 홍염의 군주, 2막 혹한의 군주 일정과 입장 조건을 한눈에 확인하세요.',

  keywords: '익스트림 레이드 보상, 익스트림 보상 정리, 익스트림 골드, 익스트림 토큰, 익스트림 1막, 익스트림 2막, 익스트림 노말, 익스트림 하드, 익스트림 나이트메어, 익스트림 최초 클리어, 익스트림 입장 조건, 익스트림 일정, 익스트림 1720, 익스트림 1750, 익스트림 1770, 홍염의 군주 보상, 혹한의 군주 보상, 로스트아크 익스트림, 로아 익스트림',

  openGraph: {
    title: '로아로골 | 익스트림 레이드 보상 정리',
    description: '노말·하드·나이트메어 난이도별 골드·토큰·최초 클리어 보상을 한눈에.',
    url: 'https://lostarkweeklygold.kr/extreme',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://lostarkweeklygold.kr/extreme',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: '익스트림 레이드 보상 정리',
  description: '로스트아크 익스트림 레이드 난이도별 보상 정리. 노말·하드·나이트메어 골드, 토큰, 최초 클리어 보상.',
  url: 'https://lostarkweeklygold.kr/extreme',
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
        name: '익스트림 레이드 보상은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '노말(1720) 20,000G·토큰 150개, 하드(1750) 45,000G·토큰 200개, 나이트메어(1770) 45,000G·토큰 200개. 최초 클리어 시 전설 카드팩, 영웅 젬, 젬 가공 초기화권, 불과 얼음의 주화 100개를 획득합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '익스트림 레이드 칭호는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '나이트메어 최초 클리어 시 전설 칭호를 획득합니다. 1막: 홍염의 군주, 2막: 혹한의 군주.',
        },
      },
      {
        '@type': 'Question',
        name: '익스트림 레이드 기간은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2026년 4월 22일부터 6월 16일까지 총 8주간 진행. 1막(4주) + 2막(4주) 구성입니다.',
        },
      },
    ],
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  )
}
