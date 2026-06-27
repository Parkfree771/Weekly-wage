import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: '직업 각인 정리',
  description:
    '로아 전체 직업별 각인 세팅을 한눈에. 슈퍼 모코코 익스프레스(슈모익)·모코코 이벤트·베이스캠프·점핑(쩜핑)권으로 새 캐릭터를 키운 신규·뉴비·복귀 유저를 위한 로아 직업 추천과 직업별 대표 각인 5종 + 조건부 서브 각인 정리. 직업 검색·4각인 조합 필터로 원하는 각인을 쓰는 직업을 빠르게 찾으세요.',
  keywords:
    '로아 직업 추천, 로아 뉴비 직업 추천, 로아 신규 직업 추천, 로아 복귀 직업 추천, 로아 입문 직업 추천, 슈퍼 모코코 익스프레스, 슈모익, 모코코 이벤트, 모코코, 베이스캠프, 캠프, 로아 점핑, 점핑권, 쩜핑, 로아 직업 각인, 로아 직업별 각인, 로아 각인 정리, 로아 각인 세팅, 로아 각인 추천, 로아 유각, 직업 각인 정리, 로아로골',
  openGraph: {
    title: '로아로골 | 직업 각인 정리',
    description:
      '슈모익·모코코·베이스캠프·점핑권으로 시작한 신규·뉴비·복귀 유저를 위한 로아 직업 추천. 직업별 대표 각인 5종 + 서브 각인을 한눈에, 4각인 조합 필터로 직업을 빠르게 찾으세요.',
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
  return <>{children}</>;
}
