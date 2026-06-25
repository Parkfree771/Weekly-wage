import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: '직업별 각인 정리',
  description:
    '로스트아크 직업별 대표 각인 정리. 직업(스펙)마다 장착하는 각인 5종과 조건부 교체용 서브 각인을 한눈에. 직업 검색과 4각인 조합 필터로 원하는 각인을 쓰는 직업을 빠르게 찾으세요.',
  keywords:
    '로아 직업 각인, 로스트아크 각인 정리, 로아 각인 세팅, 로아 직업별 각인, 로아 각인 추천, 로아 유각, 로아로골',
  openGraph: {
    title: '로아로골 | 직업별 각인 정리',
    description:
      '직업(스펙)마다 장착하는 대표 각인 5종 + 서브 각인을 정리. 4각인 조합으로 직업을 필터링하세요.',
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
