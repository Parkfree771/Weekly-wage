import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: '앱 다운로드',
  description: '로아로골 모바일 앱 - 재련 강화 시뮬레이션, 패키지 효율 계산, 주간 레이드 체크리스트, 골드 수익 기록, 캐릭터 조회까지 한 손 안에서.',
  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 앱 다운로드',
    description: '로아로골 모바일 앱 - 재련 강화 시뮬레이션, 패키지 효율 계산, 주간 레이드 체크리스트, 골드 수익 기록, 캐릭터 조회까지 한 손 안에서.',
    url: '/app',
    siteName: '로아로골',
  },
  alternates: {
    canonical: '/app',
  },
};

export default function AppDownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      {/* SEO를 위한 JSON-LD 구조화된 데이터 - MobileApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MobileApplication",
            "name": "로아로골",
            "url": `${SITE_URL}/app`,
            "image": `${SITE_URL}/icon.png`,
            "operatingSystem": "iOS, Android",
            "applicationCategory": "UtilitiesApplication",
            "description": "로스트아크 재련 시뮬레이션, 패키지 효율 계산, 주간 레이드 숙제 체크, 골드 수익 기록, 캐릭터·장비 조회를 제공하는 로아로골 모바일 앱",
            "publisher": {
              "@type": "Organization",
              "name": "로아로골"
            }
          })
        }}
      />
    </>
  );
}
