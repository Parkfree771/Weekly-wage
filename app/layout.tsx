import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
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
    default: "로아로골 - 로아 시세 거래소 가격 차트",
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

  keywords: "로아로골, 로아 시세, 로아 거래소, 로아 가격, 로아 아이템 시세, 로아 경매장, 로아 과거 시세, 로아 시세 차트, 로아 재련 재료 시세, 로아 각인서 시세, 로아 보석 시세, 로스트아크 시세, 로스트아크 거래소, 로스트아크 가격",

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
      "naver-site-verification": "6873351e8c76eb0a0ac7c6d9647b5e8431bec76e",
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
      <body className={`${notoSansKr.className} ${jetbrainsMono.variable}`}>
        <ThemeProvider>
          <ConsoleFilter />
          <AuthProvider>
            <Navbar />
            <AdLayout>
              {children}
            </AdLayout>
            <Footer />
            <ConsentModal />
          </AuthProvider>
        </ThemeProvider>

        {/* Google AdSense - lazyOnload로 메인 콘텐츠 우선 */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6944494802169618"
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />

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