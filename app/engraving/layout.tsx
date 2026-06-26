import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: '로아 전체 직업 각인 정리',
  description:
    '로스트아크 전체 직업 각인 정리. 직업(스펙)마다 장착하는 대표 각인 5종과 조건부 교체용 서브 각인을 한눈에. 슈퍼 모코코 익스프레스(슈모익)·모코코 이벤트·베이스캠프·점핑(쩜핑)권으로 새 캐릭터를 키운 뉴비·복귀 유저를 위한 직업별 각인 세팅과 뉴비 직업 추천까지. 직업 검색과 4각인 조합 필터로 원하는 각인을 쓰는 직업을 빠르게 찾으세요.',
  keywords:
    '로아 전체 직업 각인 정리, 로아 직업 각인, 로스트아크 각인 정리, 로아 각인 세팅, 로아 직업별 각인, 로아 각인 추천, 로아 유각, 슈퍼 모코코 익스프레스, 슈모익, 모코코 이벤트, 모코코, 베이스캠프, 로아 점핑, 점핑권, 쩜핑, 로아 뉴비 직업 추천, 로아 입문 직업 추천, 로아 복귀 직업 추천, 로아 뉴비 각인, 로아로골',
  openGraph: {
    title: '로아로골 | 로아 전체 직업 각인 정리',
    description:
      '로스트아크 전체 직업 각인 정리. 직업마다 장착하는 대표 각인 5종 + 서브 각인을 한눈에. 슈모익·모코코 이벤트·베이스캠프·점핑권 뉴비/복귀 유저를 위한 직업별 각인 세팅과 뉴비 직업 추천. 4각인 조합으로 직업을 필터링하세요.',
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
