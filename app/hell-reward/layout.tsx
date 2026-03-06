import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '로아로골 | 지옥 보상 계산기 - 나락/낙원 보상 정리',
  description: '로스트아크 지옥/나락 보상을 층수별로 정리하고 실시간 시세 기반으로 골드 가치를 계산합니다. 1700/1730 레벨별 보상을 비교해보세요.',
  keywords: '로아로골, 로아 지옥 보상, 로아 나락 보상, 지옥 보상 계산, 낙원 보상 정리, 로스트아크 지옥, 나락 보상표',
  openGraph: {
    title: '로아로골 | 지옥 보상 계산기',
    description: '로스트아크 지옥/나락 보상을 층수별로 정리하고 실시간 시세 기반으로 골드 가치를 계산합니다.',
    url: 'https://lostarkweeklygold.kr/hell-reward',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://lostarkweeklygold.kr/hell-reward',
  },
}

export default function HellRewardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
