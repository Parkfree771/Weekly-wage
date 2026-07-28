import type { Metadata } from 'next';

// 등록 폼은 본문이랄 게 없는 입력 화면이라 색인에서 뺀다.
// (2026-07-28 기준 실제로 색인돼 있어서 사이트가 얇아 보이는 원인이 됐다.)
// follow: true — 폼 안의 링크는 그대로 따라가게 둔다.
export const metadata: Metadata = {
  title: '패키지 등록',
  robots: { index: false, follow: true },
};

export default function PackageRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
