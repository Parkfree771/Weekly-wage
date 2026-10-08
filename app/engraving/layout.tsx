import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '로아 직업 각인 정리 · 직업 추천',
  description: '로스트아크 전체 직업의 대표 각인 5종과 서브 각인을 한눈에 정리했습니다. 슈모익·점핑권으로 새 캐릭터를 고르는 뉴비·복귀 유저의 직업 선택에 활용하세요.',
  keywords: '로아 직업 각인, 로아 직업 추천, 로아 뉴비 직업 추천, 로아 슈모익, 로아로골',
  openGraph: {
    images: ['/og-image.png'],
    title: '로아로골 | 로아 직업 각인 정리 · 직업 추천',
    description: '로스트아크 전체 직업의 대표 각인 5종과 서브 각인을 한눈에 정리했습니다. 슈모익·점핑권으로 새 캐릭터를 고르는 뉴비·복귀 유저의 직업 선택에 활용하세요.',
    url: '/engraving',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/engraving',
  },
};

export default function EngravingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}
