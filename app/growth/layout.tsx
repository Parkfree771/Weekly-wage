import { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-config'

const TITLE = '로아 2부 성장 시뮬레이터 - 연마 · 슬롯 재련 · 마력 주입'
const DESCRIPTION =
  '로스트아크 2부 이관 미리보기와 새 성장 시스템 연마·슬롯 재련·마력 주입 시뮬레이터. 캐릭터를 검색하면 11월 25일 공식 공지 기준으로 장비 등급·연마, 슬롯 재련, 장신구·팔찌 주문서, 각인 슬롯이 어떻게 바뀌는지 보여드립니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    '로아 2부, 로스트아크 2부 성장, 로아 2부 이관, 로아 이관 미리보기, 로아 마력 주입 주문서, 로아 인장 주문서, 로아 연마, 로아 장비 연마, 로아 장신구 연마, 로아 슬롯 재련, 로아 마력 주입, 로아 위상, 로아 아이템 레벨, 로아 옵션 변환, 로아 번뜩임, 로아 시즌3 2부, 로아로골',
  openGraph: {
    images: ['/og-image.png'],
    title: `로아로골 | ${TITLE}`,
    description: DESCRIPTION,
    url: '/growth',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `로아로골 | ${TITLE}`,
    description: DESCRIPTION,
  },
  alternates: {
    canonical: '/growth',
  },
}

export default function GrowthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: '로아로골 - 로아 2부 성장 시뮬레이터 (연마 · 슬롯 재련 · 마력 주입)',
            url: `${SITE_URL}/growth`,
            description: DESCRIPTION,
            applicationCategory: 'GameApplication',
            operatingSystem: 'Any',
            inLanguage: 'ko',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
            featureList: [
              '내 장비 이관 미리보기 — 캐릭터 검색으로 2부 장비 등급 · 연마 · 슬롯 재련 · 주문서 · 각인 슬롯 (11/25 공식 공지 기준)',
              '장비 · 장신구 연마 — 100% 성공, 한 번에 아이템 레벨 +5, 5단계까지',
              '고대 장비 옵션 개방 · 옵션 변환 · 번뜩임',
              '슬롯 재련 — 장비를 바꿔도 단계 유지, 성공률 · 장인의 기운',
              '마력 주입 — 옵션 3개 뽑기 · 저장 · 변성, 위상 1~7과 포화도',
              '아이템 레벨 = 장비 등급 + 연마, 16칸 평균',
              '단기 · 중기 · 장기 성장 구분 한눈에 정리',
            ],
          }),
        }}
      />
    </>
  )
}
