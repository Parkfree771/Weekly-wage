import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '문의하기',
  description: '로아로골 운영자에게 기능 제안, 버그 신고, 계산 데이터 오류를 보내는 곳입니다. 로그인 없이 익명으로 보낼 수 있고, 반영된 요청은 문의 창에서 확인할 수 있습니다.',
  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 문의하기',
    description: '기능 제안 · 버그 신고 · 데이터 오류 제보',
    url: '/contact',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/contact',
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
