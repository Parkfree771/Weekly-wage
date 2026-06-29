import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageInfoFooter from '@/components/PageInfoFooter';
import ConsentModal from '@/components/auth/ConsentModal';
import AdLayout from '@/components/ads/AdLayout';

import ConsoleFilter from '@/components/ConsoleFilter';
import { SITE_URL } from '@/lib/site-config';
import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import 'bootstrap/dist/css/bootstrap.min.css';
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  preload: true,
  variable: "--font-mono",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 0.8,
  maximumScale: 2,
  userScalable: true,
};

// app/layout.tsx

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: '로아로골 | %s',
    default: "로아로골 | 로아 시세 차트",
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  description: "로아로골 - 로아 시세 확인 사이트! 로아 거래소 실시간 가격과 로아 과거 시세 차트를 한눈에. 로아 재련 재료, 로아 각인서, 로아 보석 등 모든 로아 아이템 가격 변동을 확인하세요.",

  keywords: "로아로골, 로아 시세, 로아 거래소, 로아 가격, 로아 아이템 시세, 로아 경매장, 로아 과거 시세, 로아 시세 차트, 로아 재련 재료 시세, 로아 각인서 시세, 로아 보석 시세, 로스트아크 시세, 로스트아크 거래소, 로스트아크 가격, 로아 캐릭터 조회, 로아 전투정보실, 로아온, 로아온 썸머, 로아온 썸머 2026, 2026 로아온, 로아 신규 패치, 로아 여름 패치, 로아온 일정",

  authors: [{ name: "로아로골" }],
  creator: "로아로골",
  publisher: "로아로골",

  openGraph: {
    title: "로아로골 - 로아 시세 거래소 가격 차트",
    description: "로아로골 - 로아 시세 확인 사이트! 로아 거래소 실시간 가격, 로아 과거 시세 차트, 로아 재련 재료, 로아 각인서 시세까지.",
    url: SITE_URL,
    siteName: "로아로골",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "로아로골 - 로아 시세 거래소 가격 차트"
      }
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "로아로골 - 로아 시세 거래소 가격 차트",
    description: "로아로골 - 로아 시세, 로아 거래소 가격, 로아 과거 시세 차트 확인",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "tmTEi92jQrmP3wwpDaxW36nEO4kq6UAWtXLa7FdqOkw",
    other: {
      // 마이그레이션 기간: 양쪽 도메인 인증 동시 유지 (구도메인은 3개월 후 만료)
      "naver-site-verification": [
        "6873351e8c76eb0a0ac7c6d9647b5e8431bec76e", // lostarkweeklygold.kr (구)
        "4bfe8356036700e178bec690ed40c09db26fca4d", // loalogol.kr (신)
      ],
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* 가격 데이터 preload — URL이 안정적이라(캐시키 제거됨) 정적 preload 태그로 처리.
            클라이언트 fetch URL과 정확히 일치해야 브라우저 preload가 재사용됨(price-history-client.ts). */}
        <link rel="preload" href="/data/history_archive.json" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/api/price-data/history" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/api/price-data/latest" as="fetch" crossOrigin="anonymous" />
        {/* Google AdSense — 서버 HTML(head)에 포함되어야 애드센스 크롤러가 사이트 확인 가능.
            async라 렌더링 비차단. (lazyOnload는 HTML에 안 들어가 검증 실패) */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6944494802169618"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${notoSansKr.className} ${jetbrainsMono.variable}`}>
        <ThemeProvider>
          <ConsoleFilter />
          <AuthProvider>
            <Navbar />
            <AdLayout>
              {children}
            </AdLayout>
            <PageInfoFooter />
            <Footer />
            <ConsentModal />
          </AuthProvider>
        </ThemeProvider>

        {/* Google AdSense 스크립트는 위 <head>로 이동 (애드센스 사이트 확인 위해 서버 HTML에 포함) */}

        {/* Google Analytics - lazyOnload로 메인 콘텐츠 우선 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-QBV4JHCBJF"
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-QBV4JHCBJF');
          `}
        </Script>

        {/* SEO를 위한 JSON-LD 구조화된 데이터 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "로아로골",
            "alternateName": ["로아 시세", "로아 거래소", "로스트아크 시세"],
            "url": SITE_URL,
            "description": "로아로골 - 로아 시세 확인 사이트! 로아 거래소 실시간 가격, 로아 과거 시세 차트, 로아 재련 재료 시세, 로아 각인서 시세, 로아 보석 시세를 한눈에 확인하세요.",
            "potentialAction": {
              "@type": "SearchAction",
              "target": `${SITE_URL}/weekly-gold?search={search_term_string}`,
              "query-input": "required name=search_term_string"
            }
          }) }}
        />
      </body>
    </html>
  );
}