import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';

// 매 요청마다 동적 SSR. 시간 의존 렌더(getCurrentGameDayIdx 등) 의 하이드레이션 미스매치 방지.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '마이페이지 - 주간 레이드 체크리스트 & 골드 계산',
  description:
    '로스트아크 캐릭터별 주간 레이드 체크리스트, 카던/가토 일일 컨텐츠 관리, 휴식게이지 추적, 주간 골드 수익 자동 계산. 원정대 공통 컨텐츠(카게, 필보, 복주머니) 체크까지 한눈에 관리하세요.',
  keywords:
    '로아 주간숙제, 로스트아크 레이드 체크, 로아 골드 계산, 로아 카던, 로아 가토, 로아 휴식게이지, 로아 마이페이지, 로아로골',
  openGraph: {
    title: '로아로골 | 마이페이지',
    description:
      '캐릭터별 주간 레이드 체크, 일일 컨텐츠 관리, 골드 수익 자동 계산.',
    url: '/mypage',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/mypage',
  },
};

export default function MypageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: '로아로골 - 마이페이지',
            url: `${SITE_URL}/mypage`,
            description:
              '로스트아크 캐릭터별 주간 레이드 체크리스트 및 골드 수익 관리',
            isPartOf: {
              '@type': 'WebSite',
              name: '로아로골',
              url: SITE_URL,
            },
          }),
        }}
      />
    </>
  );
}
