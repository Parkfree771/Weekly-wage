import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '아크패스 효율 - 창공의 안내자',
  description:
    '로스트아크 아크패스 「창공의 안내자」 보상을 1~30레벨까지 정리했습니다. 달성·프리미엄·슈퍼 프리미엄 보상을 한눈에 보고, 실시간 시세 기반으로 현금 가격 대비 골드 효율을 계산하세요.',
  keywords: [
    '아크패스',
    '아크패스 효율',
    '창공의 안내자',
    '창공의 안내자 아크패스',
    '로아 아크패스',
    '로스트아크 아크패스',
    '아크패스 보상',
    '아크패스 슈퍼 프리미엄',
    '아크패스 프리미엄',
    '아크패스 가격',
    '시즌 패스 효율',
    '로아로골',
  ].join(', '),
  alternates: {
    canonical: '/arkpass',
  },
  openGraph: {
    title: '아크패스 효율 「창공의 안내자」 | 로아로골',
    description:
      '아크패스 창공의 안내자 1~30레벨 보상 정리 + 현금 대비 골드 효율 계산기. 달성·프리미엄·슈퍼 프리미엄 보상을 한눈에.',
    url: '/arkpass',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: '/arkpass-avatar.webp',
        width: 792,
        height: 586,
        alt: '아크패스 창공의 안내자 아바타',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '아크패스 효율 「창공의 안내자」 | 로아로골',
    description: '아크패스 창공의 안내자 1~30레벨 보상 정리 + 현금 대비 골드 효율 계산기.',
    images: ['/arkpass-avatar.webp'],
  },
}

export default function ArkPassLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
