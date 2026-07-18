import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: '로스트아크 가이드 - 골드, 레이드, 재련, 생활 공략',
  description:
    '로스트아크 골드 수익 가이드, 레이드 보상 정리, T4 재련 가이드, 더보기 손익 판단, 패키지 효율, 생활 콘텐츠 공략 등 유용한 정보를 모았습니다. 로아로골에서 효율적인 로아 플레이를 시작하세요.',
  keywords:
    '로아로골, 로아 가이드, 로스트아크 가이드, 로아 골드 가이드, 로아 레이드 공략, 로아 재련 가이드, 로아 더보기, 로아 패키지 효율, 로아 생활 가이드, 로아 초보자 가이드, 로아 거래소 가이드',
  openGraph: {
    title: '로아로골 | 로스트아크 가이드 모음',
    description: '로스트아크 골드 수익, 레이드 보상, 재련 비용, 생활 콘텐츠 등 실전 가이드를 제공합니다.',
    url: '/guide',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/guide',
  },
};

export default function GuideLayout({
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
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "로아로골 - 로스트아크 가이드",
            "url": `${SITE_URL}/guide`,
            "description": "로스트아크 골드 수익, 레이드 보상, 재련 비용, 더보기 손익, 패키지 효율, 생활 콘텐츠 등 실전 가이드 모음",
            "isPartOf": {
              "@type": "WebSite",
              "name": "로아로골",
              "url": SITE_URL
            }
          })
        }}
      />
    </>
  );
}
