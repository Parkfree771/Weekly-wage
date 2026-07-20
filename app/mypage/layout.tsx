import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';
import { faqData } from './faq-data';

// 매 요청마다 동적 SSR. 시간 의존 렌더(getCurrentGameDayIdx 등) 의 하이드레이션 미스매치 방지.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '숙제 체크',
  description:
    '로스트아크 숙제 체크 & 기록 — 캐릭터별 주간·일일 숙제 체크리스트와 원정대 수급 골드 체크. 귀속골드·유통골드를 구분해 원정대 수급 총골드를 자동 집계하고, 휴식게이지·카던·가토 가치까지 한눈에 관리하세요.',
  keywords:
    '로스트아크 숙제 체크, 로아 숙제 체크, 로아 숙제 기록, 원정대 수급 골드 체크, 원정대 수급 총골드, 로아 귀속골드, 로아 유통골드, 로아 주간숙제, 로아 일일숙제, 로아 숙제 체크리스트, 로아 골드 수급, 로아 총 골드 수급량, 로스트아크 레이드 체크, 로아 카던 가치, 로아 가토 가치, 로아 휴식게이지, 로아로골',
  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 숙제 체크',
    description:
      '캐릭터별 주간·일일 숙제 체크와 원정대 수급 골드(귀속·유통) 자동 집계, 원정대 수급 총골드 기록.',
    url: '/mypage',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/mypage',
  },
};

const faqJsonLd = {
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
            name: '로아로골 - 숙제 체크',
            url: `${SITE_URL}/mypage`,
            description:
              '로스트아크 캐릭터별 주간·일일 숙제 체크와 원정대 수급 골드(귀속·유통) 기록',
            isPartOf: {
              '@type': 'WebSite',
              name: '로아로골',
              url: SITE_URL,
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
