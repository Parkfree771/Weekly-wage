import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '주간 골드 계산 | 로아 주간 골드 계산',
  description: '로스트아크 원정대의 주간 골드 수익을 계산하고 레이드 더보기 보상의 손익을 실시간 거래소 가격으로 분석하세요. 효율적인 골드 파밍 전략을 세워보세요.',
  keywords: '로스트아크, 주간골드, 골드계산기, 원정대주급, 더보기손익, 레이드수익, 골드파밍, 로아골드',
  openGraph: {
    title: '주간 골드 계산 | 로아 주간 골드 계산',
    description: '원정대 주간 골드 수익과 더보기 보상 손익을 실시간 거래소 가격으로 계산',
    url: 'https://lostarkweeklygold.kr/weekly-gold',
    siteName: '로아 주간 골드 계산',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://lostarkweeklygold.kr/weekly-gold',
  },
}

export default function WeeklyGoldLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
