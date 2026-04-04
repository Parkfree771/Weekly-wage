import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '랏폿을 기다리며',
  description: '로스트아크 점검 시간에 즐기는 교통 신호 제어 게임 SIGNAL',
  robots: { index: false, follow: false },
};

export default function MiniGameLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
