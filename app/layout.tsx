import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ConsentModal from '@/components/auth/ConsentModal';
import ConsoleFilter from '@/components/ConsoleFilter';
import ImagePreloader from '@/components/ImagePreloader';
import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import Script from "next/script";
import 'bootstrap/dist/css/bootstrap.min.css';
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 0.8,
  maximumScale: 2,
  userScalable: true,
};

// app/layout.tsx

export const metadata: Metadata = {
  metadataBase: new URL('https://lostarkweeklygold.kr'),
  title: {
    template: '로골로골 | %s',
    default: "로골로골 - 로아 시세 거래소 가격 차트",
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  description: "로골로골 - 로아 시세 확인 사이트! 로아 거래소 실시간 가격과 로아 과거 시세 차트를 한눈에. 로아 재련 재료, 로아 각인서, 로아 보석 등 모든 로아 아이템 가격 변동을 확인하세요.",

  keywords: "로골로골, 로아 시세, 로아 거래소, 로아 가격, 로아 아이템 시세, 로아 경매장, 로아 과거 시세, 로아 시세 차트, 로아 재련 재료 시세, 로아 각인서 시세, 로아 보석 시세, 로스트아크 시세, 로스트아크 거래소, 로스트아크 가격",

  authors: [{ name: "로골로골" }],
  creator: "로골로골",
  publisher: "로골로골",

  openGraph: {
    title: "로골로골 - 로아 시세 거래소 가격 차트",
    description: "로골로골 - 로아 시세 확인 사이트! 로아 거래소 실시간 가격, 로아 과거 시세 차트, 로아 재련 재료, 로아 각인서 시세까지.",
    url: "https://lostarkweeklygold.kr",
    siteName: "로골로골",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "로골로골 - 로아 시세 거래소 가격 차트"
      }
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "로골로골 - 로아 시세 거래소 가격 차트",
    description: "로골로골 - 로아 시세, 로아 거래소 가격, 로아 과거 시세 차트 확인",
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
      <body className={notoSansKr.className}>
        <ImagePreloader />
        <ThemeProvider>
          <ConsoleFilter />
          <AuthProvider>
            <Navbar />
            <main style={{ minHeight: 'calc(100vh - 200px)' }}>
              {children}
            </main>
            <Footer />
            <ConsentModal />
          </AuthProvider>
        </ThemeProvider>

        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6944494802169618"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        {/* Google Analytics - 최적화된 로딩 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-QBV4JHCBJF"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
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
            "name": "로골로골",
            "alternateName": ["로아 시세", "로아 거래소", "로스트아크 시세"],
            "url": "https://lostarkweeklygold.kr",
            "description": "로골로골 - 로아 시세 확인 사이트! 로아 거래소 실시간 가격, 로아 과거 시세 차트, 로아 재련 재료 시세, 로아 각인서 시세, 로아 보석 시세를 한눈에 확인하세요.",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://lostarkweeklygold.kr/weekly-gold?search={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          }) }}
        />
      </body>
    </html>
  );
}