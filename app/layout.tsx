import { ThemeProvider } from '@/components/ThemeProvider';
import Navbar from '@/components/Navbar';
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
    // 1. %s는 나중에 다른 페이지(재련 등) 만들 때 그 페이지 제목이 들어갈 자리입니다.
    template: '%s | 로스트아크 골드 계산기',
    // 2. 메인 페이지(홈)에서 보여질 '진짜 제목'입니다. (세르카 강조!)
    default: "세르카 보상 & 골드 | 로아 주간 골드 계산 | 재련 비용",
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  // 3. 설명도 '세르카'로 시작하게 변경
  description: "세르카(1710) 레이드 보상과 더보기 효율 완벽 정리. 원정대 주간 골드 수익과 T4 재련 비용, 실시간 아이템 시세를 한눈에 계산해 드립니다. 카제로스 종막, 4막, 3막 포함.",

  // 4. 키워드 순서 변경 (세르카 맨 앞)
  keywords: "세르카 보상, 세르카 골드, 세르카 더보기, 세르카 효율, 로스트아크, 로아, 골드계산기, 원정대주급, 더보기손익, 레이드수익, 거래소가격, T4 재련, 재련 계산기, 종막, 카제로스",

  authors: [{ name: "로스트아크 골드 계산기" }],
  creator: "로스트아크 골드 계산기",
  publisher: "로스트아크 골드 계산기",

  // 5. 카톡 공유(OpenGraph) 제목 변경
  openGraph: {
    title: "세르카 보상 & 골드 효율 계산기",
    description: "세르카(1710) 포함 내 캐릭터들의 주간 레이드 수익과 더보기 효율을 즉시 확인하세요.",
    url: "https://lostarkweeklygold.kr",
    siteName: "로아 주간 골드 계산",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "세르카 보상 및 골드 계산기 미리보기"
      }
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "세르카 보상 & 주간 골드 계산기",
    description: "세르카 포함 원정대 주간 골드 수익 및 아이템 시세 확인",
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
      "naver-site-verification": "6873351e8c76eb0a0ac7c6d9647b5e8431bec76e", // 네이버 코드 적용됨
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
        <ThemeProvider>
          <Navbar />
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
            "description": "로스트아크 원정대 주간 골드 수익을 계산하고 세르카 레이드 골드 효율, 세르카 더보기 보상의 손익을 실시간 거래소 가격으로 분석하는 필수 도구. 세르카 클리어 골드 계산, 카제로스 레이드(종막, 4막, 3막, 2막, 1막), 그림자 레이드(세르카, 고통의 마녀) 지원",
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