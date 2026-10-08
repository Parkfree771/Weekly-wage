import { Metadata } from 'next';
import { SITE_URL, isNoindexed } from '@/lib/site-config';

// 시간 의존 렌더(오늘 요일 배지·공통 컨텐츠 활성화)는 전부 마운트 후 상태(gameDayOfWeek)로만
// 그리므로 HTML 이 날짜와 무관하다 → 정적 프리렌더 + CDN 캐시 가능 (방문당 함수 호출 제거).

export const metadata: Metadata = {
  title: '로아 숙제 체크',
  description: '캐릭터별 주간·일일 숙제를 체크하고 원정대 수급 골드를 귀속·유통으로 나눠 자동 집계합니다. 휴식 게이지와 콘텐츠 보상 가치도 함께 관리하세요.',
  keywords: '로아 숙제 체크, 로아 숙제 관리, 로아 원정대 골드, 로아로골',
  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 로아 숙제 체크',
    description: '캐릭터별 주간·일일 숙제를 체크하고 원정대 수급 골드를 귀속·유통으로 나눠 자동 집계합니다. 휴식 게이지와 콘텐츠 보상 가치도 함께 관리하세요.',
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
    </>
  );
}
