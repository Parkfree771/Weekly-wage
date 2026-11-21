import { Metadata } from 'next'

// 2부 수치가 공식 공개되기 전까지는 색인 제외
export const metadata: Metadata = {
  title: '로아 연마 · 재련 · 마력 주입 시뮬레이터',
  description: '로스트아크 연마·슬롯 재련·마력 주입을 미리 해보는 성장 시뮬레이터.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/growth' },
}

export default function GrowthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
