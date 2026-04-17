import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '익스트림 레이드 - 칭호 전투력 통계 & 보상 정리 | 홍염의 군주 · 혹한의 군주',

  description: '로아로골 익스트림 레이드 칭호 전투력·직업 통계와 보상 정리! 홍염의 군주, 혹한의 군주 클리어 유저의 전투력·레벨을 실시간 통계로 확인하세요. 익스트림 1막·2막 난이도별(노말·하드·나이트메어) 골드, 토큰, 최초 클리어 보상을 한눈에 정리합니다.',

  keywords: '로아로골, 익스트림, 익스트림 레이드, 로아 익스트림, 익스트림 보상, 익스트림 골드, 익스트림 토큰, 익스트림 칭호, 홍염의 군주, 혹한의 군주, 익스트림 전투력 통계, 익스트림 1막, 익스트림 2막, 익스트림 나이트메어, 익스트림 하드, 익스트림 노말, 익스트림 최초 클리어, 로스트아크 익스트림, 로아 익스트림 보상 정리, 익스트림 칭호 통계',

  openGraph: {
    title: '로아로골 | 익스트림 레이드 - 칭호 전투력 통계 & 보상 정리',
    description: '홍염의 군주·혹한의 군주 클리어 전투력 통계, 난이도별 골드·토큰·최초 클리어 보상을 확인하세요.',
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
  name: '익스트림 레이드 - 칭호 전투력 통계 & 보상 정리',
  description: '로스트아크 익스트림 레이드 칭호(홍염의 군주, 혹한의 군주) 전투력·직업 통계와 난이도별 보상 정리. 노말·하드·나이트메어 골드, 토큰, 최초 클리어 보상.',
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
