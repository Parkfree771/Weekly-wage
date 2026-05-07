import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: '아바타 콘테스트 — 무기 아바타 상상하고 만들어보기 | 로아로골',
  description:
    '로스트아크 아바타 콘테스트 후보 12장에 어울리는 무기 아바타를 상상해서 직접 올리고 비교해보세요. 좋아요와 댓글로 응원하는 팬 메이드 콘테스트 페이지.',
  keywords:
    '아바타 콘테스트, 로스트아크 콘테스트, 로아 아바타 콘테스트, 무기 아바타, 무기 아바타 상상, 무기 아바타 만들어보기, 무기 디자인, 로아 디자인 콘테스트, 로스트아크 이벤트, 로아 일러스트, 로아로골',
  openGraph: {
    title: '아바타 콘테스트 — 무기 아바타 상상하고 만들어보기 | 로아로골',
    description:
      '12명의 후보 일러스트, 6개의 매치업. 어울리는 무기 아바타를 상상해서 그려 올리고 좋아요·댓글로 응원하세요.',
    url: '/contest',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '아바타 콘테스트 — 무기 아바타 상상하고 만들어보기',
    description:
      '로스트아크 아바타 콘테스트 후보에 어울리는 무기 아바타를 상상해서 올려보세요.',
  },
  alternates: {
    canonical: '/contest',
  },
};

export default function ContestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: '아바타 콘테스트 — 무기 아바타 상상하고 만들어보기',
            url: `${SITE_URL}/contest`,
            description:
              '로스트아크 아바타 콘테스트 후보 12장에 어울리는 무기 아바타를 상상해서 올리고 비교하는 비공식 팬 메이드 페이지. 원본 권리는 스마일게이트(주)에 있습니다.',
            inLanguage: 'ko-KR',
            isAccessibleForFree: true,
            keywords: [
              '아바타 콘테스트',
              '로스트아크 콘테스트',
              '무기 아바타',
              '무기 아바타 상상',
              '무기 아바타 만들어보기',
              '로아 디자인 콘테스트',
            ],
            publisher: {
              '@type': 'Organization',
              name: '로아로골',
              url: SITE_URL,
            },
          }),
        }}
      />
    </>
  );
}
