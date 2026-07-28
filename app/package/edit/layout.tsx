import type { Metadata } from 'next';

// 수정 폼도 등록 폼과 같은 이유로 색인 제외 (app/package/register/layout.tsx 참고).
// 작성자 본인만 여는 화면이라 검색 결과에 뜰 이유가 없다.
export const metadata: Metadata = {
  title: '패키지 수정',
  robots: { index: false, follow: true },
};

export default function PackageEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
