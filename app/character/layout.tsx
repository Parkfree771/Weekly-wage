import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { faqData } from './faq-data'

export const metadata: Metadata = {
  // 루트 layout의 title.template('로아로골 | %s')이 자동으로 접두어를 붙이므로
  // 여기서는 접두어 없이 작성한다 (접두어를 넣으면 '로아로골 | 로아로골 |'로 중복됨)
  title: '캐릭터 조회',
  description:
    '로스트아크 캐릭터 조회! 캐릭터 이름만 입력하면 전투력, 아이템레벨, 전투정보, 장비, 각인, 보석, 팔찌, 악세서리, 보주, 초월, 카드, 칭호(혹한의 군주·홍염의 군주·심연의 군주)까지 한눈에. 전투력·아이템레벨 기준 캐릭터 랭킹과 랭커도 확인하세요. 2026 로아온 썸머 신규 패치 대비 내 캐릭터 스펙을 점검하세요.',
  keywords:
    '로아로골, 로아 캐릭터 조회, 로아 전투정보실, 로스트아크 캐릭터 검색, 로아 전투력, 로아 아이템레벨, 로아 캐릭터 랭킹, 로아 랭커, 로아 랭킹, 로아 스펙 조회, 로아 각인 조회, 로아 보석 조회, 로아 칭호, 혹한의 군주, 홍염의 군주, 심연의 군주, 군주 칭호, 로아 캐릭터 검색기, 로아온, 로아온 썸머, 로아온 썸머 2026, 2026 로아온, 로아 신규 패치',
  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 캐릭터 조회 - 로아 전투정보실 장비·각인·보석·랭킹',
    description:
      '로스트아크 캐릭터 조회! 캐릭터 이름만 입력하면 전투정보, 장비, 각인, 보석, 팔찌, 악세, 칭호, 랭킹까지 한눈에 확인하세요.',
    url: '/character',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/character',
  },
}

export default function CharacterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: '로아로골 - 캐릭터 조회',
            url: `${SITE_URL}/character`,
            description:
              '로스트아크 캐릭터 조회 도구. 캐릭터 이름으로 전투정보, 장비, 각인, 보석, 팔찌, 악세서리, 칭호, 랭킹을 확인하세요.',
            applicationCategory: 'GameApplication',
            operatingSystem: 'Any',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'KRW',
            },
            featureList: [
              '전투력·아이템레벨 조회',
              '캐릭터 전투정보 조회',
              '장비·각인·보석 조회',
              '팔찌·악세서리·보주 옵션 확인',
              '칭호(혹한의 군주·홍염의 군주·심연의 군주) 및 카드 조회',
              '전투력·아이템레벨 기준 캐릭터 랭킹·랭커 비교',
            ],
          }),
        }}
      />
      {/* SEO를 위한 JSON-LD 구조화된 데이터 - FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqData.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.a,
              },
            })),
          }),
        }}
      />
    </>
  )
}
