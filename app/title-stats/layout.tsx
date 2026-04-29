import { Metadata } from 'next'

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

export default function TitleStatsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
