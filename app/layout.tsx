import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ConsentModal from '@/components/auth/ConsentModal';
import AdLayout from '@/components/ads/AdLayout';

import ConsoleFilter from '@/components/ConsoleFilter';
import { SITE_URL } from '@/lib/site-config';
import { MOBILE_VIEWPORT_SCALE } from '@/components/ads/adConfig';
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

// 축소 렌더(0.8)는 유지한다. 대신 모바일 광고만 역배율로 되돌려 규격대로 노출시킨다
// (데스크톱이 body zoom 0.85 + AD_ZOOM_COMPENSATE 로 하는 것과 같은 방식).
// 배율을 바꾸면 모바일 레이아웃 전체가 리플로우되므로, 광고 쪽만 보정하는 편이 영향이 작다.
// 값은 adConfig 와 공유 — 광고 역보정 배율이 여기서 어긋나면 규격이 틀어진다.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: MOBILE_VIEWPORT_SCALE,
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
    // suppressHydrationWarning: head의 보기 배율 스크립트가 하이드레이션 전에 html style(zoom)을 설정함
    // data-scroll-behavior: globals 의 scroll-behavior:smooth 가 의도한 것임을 Next 에 알려 개발 경고를 없앰
    <html lang="ko" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* 사이트 보기 배율 — 저장된 배율을 첫 페인트 전에 적용해 번쩍임 방지 (컨트롤: components/ZoomControl.tsx)
            suppressHydrationWarning: 아래 애드센스 로더가 head에 관리 스크립트를 동적 주입하면서
            hydration 시 이 노드의 자리가 밀려 mismatch 경고가 뜸 — 기능엔 영향 없는 dev 전용 경고라 억제 */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `try{var z=parseInt(localStorage.getItem('site-zoom')||'',10);if(z>=60&&z<=150&&z!==100)document.documentElement.style.zoom=z/100;}catch(e){}`,
          }}
        />
        {/* 가격 데이터 preload — URL이 안정적이라(캐시키 제거됨) 정적 preload 태그로 처리.
            클라이언트 fetch URL과 정확히 일치해야 브라우저 preload가 재사용됨(price-history-client.ts).
            history·archive(합산 100KB+)는 메인 시세 차트에서만 쓰므로 app/page.tsx에서 preload —
            전역 preload 금지(전 페이지 대역폭 낭비). 여기는 전 페이지가 쓰는 latest(2KB)만. */}
        <link rel="preload" href="/api/price-data/latest" as="fetch" crossOrigin="anonymous" />
        {/* 광고·애널리틱스 하위 도메인은 로더 스크립트가 실행된 뒤에야 발견된다 —
            DNS만 미리 풀어두면 그 시점의 조회 왕복이 사라진다.
            preconnect가 아닌 dns-prefetch인 이유: 연결까지 미리 맺으면 모바일에서
            본문 리소스와 대역폭을 다투게 되므로 DNS 단계까지만 앞당긴다. */}
        <link rel="dns-prefetch" href="https://googleads.g.doubleclick.net" />
        <link rel="dns-prefetch" href="https://tpc.googlesyndication.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://display.ad.daum.net" />
        {/* Google AdSense — 서버 HTML(head)에 포함되어야 애드센스 크롤러가 사이트 확인 가능.
            async라 렌더링 비차단. (lazyOnload는 HTML에 안 들어가 검증 실패) */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6944494802169618"
          crossOrigin="anonymous"
        />
        {/* 카카오 애드핏 로더 — 서버 HTML(head)에 있어야 심사자가 JS 실행 없이도 광고 설치를 확인한다.
            (AdFitUnit 이 마운트마다 스크립트를 다시 붙이는 건 클라이언트 라우팅으로 새로 생긴
             광고 자리를 채우기 위한 것이고, 첫 로드분은 여기서 처리한다) */}
        <script async src="https://t1.kakaocdn.net/kas/static/ba.min.js" />
        {/* 미러(프록시) 사이트 차단 가드 — 허용되지 않은 호스트에서 열리면 정식 도메인으로 강제 이동.
            미러가 HTML 내 도메인 문자열을 자기 것으로 치환하는 수법을 쓰므로 도메인은 base64로 숨김
            (bG9hbG9nb2wua3I= → loalogol.kr). head 최상단 동기 실행이라 미러에서 콘텐츠 노출 전에 이탈. */}
        {/* suppressHydrationWarning: 위 배율 스크립트와 동일 사유 — 애드센스 async 로더가 head에
            노드를 동적 주입해 형제 위치가 밀리며 mismatch 경고가 뜸. 내용은 서버·클라 동일한 정적
            문자열이라 실제 불일치 아님(위치 밀림) → 억제가 올바른 처리 */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html:
            `(function(){try{var d=atob("bG9hbG9nb2wua3I=");var h=location.hostname;if(h===d||h==="www."+d||h==="localhost"||h==="127.0.0.1"||/\\.netlify\\.app$/.test(h))return;location.replace("https://"+d+location.pathname+location.search);}catch(e){}})();`,
          }}
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
            // 정식 도메인에서만 수집 — 미러(프록시)·로컬 트래픽이 애널리틱스를 오염시키지 않게
            (function(){var d=atob("bG9hbG9nb2wua3I=");var h=location.hostname;
              if(h===d||h==="www."+d){gtag('js', new Date());gtag('config', 'G-QBV4JHCBJF');}})();
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