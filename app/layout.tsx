import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import 'bootstrap/dist/css/bootstrap.min.css';

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={notoSansKr.className}>
        {children}
      </body>
    </html>
  );
}