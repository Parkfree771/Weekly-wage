import type { Metadata } from 'next';

// 관리자 전용 화면 — 로그인 없이는 본문이랄 게 없고 검색 결과에 나올 이유도 없다.
// robots.txt 의 Disallow 는 색인 자체를 막아 주지 못하므로(외부 링크로도 색인된다)
// 메타로 명시한다. 2026-08-09 기준 실제로 index, follow 로 나가고 있었다.
export const metadata: Metadata = {
  title: '피드백 관리',
  robots: { index: false, follow: false },
};

export default function AdminFeedbackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
