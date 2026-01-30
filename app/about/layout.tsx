import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '사이트 소개',
  description: '로골로골은 원정대 주간 골드 수익 계산, 레이드 더보기 효율 분석, T4 재련 비용 계산 등을 제공하는 무료 로스트아크 웹 서비스입니다.',
  openGraph: {
    title: '로골로골 | 사이트 소개',
    description: '로골로골은 원정대 주간 골드 수익 계산, 레이드 더보기 효율 분석, T4 재련 비용 계산 등을 제공하는 무료 로스트아크 웹 서비스입니다.',
    url: 'https://lostarkweeklygold.kr/about',
    siteName: '로골로골',
  },
  alternates: {
    canonical: 'https://lostarkweeklygold.kr/about',
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      {/* SEO를 위한 JSON-LD 구조화된 데이터 - Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "로골로골",
            "url": "https://lostarkweeklygold.kr",
            "logo": "https://lostarkweeklygold.kr/icon.png",
            "description": "로골로골 - 로스트아크 원정대 주간 골드 수익 계산, 레이드 더보기 효율 분석, T4 재련 비용 계산 등을 제공하는 무료 웹 서비스",
            "foundingDate": "2025",
            "sameAs": []
          })
        }}
      />
      {/* SEO를 위한 JSON-LD 구조화된 데이터 - WebSite */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "로골로골",
            "alternateName": ["로아 시세", "로아 거래소", "로아 골드 계산기", "로아 주간 골드"],
            "url": "https://lostarkweeklygold.kr",
            "publisher": {
              "@type": "Organization",
              "name": "로골로골"
            }
          })
        }}
      />
    </>
  );
}
