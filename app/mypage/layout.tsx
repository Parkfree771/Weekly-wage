import { Metadata } from 'next';
import { SITE_URL, isNoindexed } from '@/lib/site-config';
import { faqData } from './faq-data';

// 시간 의존 렌더(오늘 요일 배지·공통 컨텐츠 활성화)는 전부 마운트 후 상태(gameDayOfWeek)로만
// 그리므로 HTML 이 날짜와 무관하다 → 정적 프리렌더 + CDN 캐시 가능 (방문당 함수 호출 제거).

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
  // 로그인해야 내용이 채워지는 개인화 페이지라 색인에서 뺀다.
  // follow 는 남겨 이 페이지가 거는 내부 링크는 그대로 전달한다.
  robots: isNoindexed('/mypage') ? { index: false, follow: true } : undefined,
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
