import { ThemeProvider } from '@/components/ThemeProvider';
import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import Script from "next/script";
import 'bootstrap/dist/css/bootstrap.min.css';
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://lostarkweeklygold.kr'),
  title: "로아 주간 골드 계산",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  description: "로스트아크 원정대 주간 골드 수익을 계산하고 레이드 더보기 보상의 손익을 실시간 거래소 가격으로 분석하세요. 효율적인 골드 파밍을 위한 필수 도구입니다.",
  keywords: "로스트아크, 골드계산기, 원정대주급, 더보기손익, 레이드수익, 거래소가격, 골드파밍",
  authors: [{ name: "로스트아크 골드 계산기" }],
  creator: "로스트아크 골드 계산기",
  publisher: "로스트아크 골드 계산기",
  openGraph: {
    title: "로아 주간 골드 계산",
    description: "원정대 주간 골드 수익과 더보기 보상 손익을 계산하는 필수 도구",
    url: "https://lostarkweeklygold.kr",
    siteName: "로아 주간 골드 계산",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "로스트아크 골드 계산기"
      }
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "로아 주간 골드 계산",
    description: "원정대 주간 골드 수익과 더보기 보상 손익을 계산하세요",
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
    google: "your-google-site-verification-code",
  },
  other: {
    "google-adsense-account": "ca-pub-6944494802169618",
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
        <ThemeProvider>
          {children}
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
            "name": "로아 주간 골드 계산",
            "url": "https://lostarkweeklygold.kr",
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://lostarkweeklygold.kr/?q={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            }
          }) }}
        />
      </body>
    </html>
  );
}