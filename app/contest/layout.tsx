import { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: '로아 아바타 디자인 콘테스트 응원 페이지 | 로아로골',
  description:
    '로스트아크 아바타 디자인 콘테스트 후보 일러스트를 한자리에서 비교하고 응원하세요. 좋아요와 댓글로 매치업을 즐기는 로아로골 콘테스트 페이지.',
  keywords:
    '로스트아크 콘테스트, 로아 아바타 콘테스트, 로아 디자인 콘테스트, 로스트아크 이벤트, 로아 일러스트, 로아로골',
  openGraph: {
    title: '로아 아바타 디자인 콘테스트 응원 | 로아로골',
    description:
      '12명의 후보 일러스트, 6개의 1대1 매치업. 마음에 드는 컨셉에 좋아요와 응원 댓글을 남겨주세요.',
    url: '/contest',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
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
            '@type': 'Event',
            name: '로스트아크 아바타 디자인 콘테스트 응원 페이지',
            url: `${SITE_URL}/contest`,
            description:
              '로스트아크 공식 아바타 디자인 콘테스트 후보를 비교하고 응원하는 팬 페이지',
            organizer: {
              '@type': 'Organization',
              name: '로아로골',
              url: SITE_URL,
            },
            isAccessibleForFree: true,
          }),
        }}
      />
    </>
  );
}
