import { Metadata } from 'next';
import { faqData } from './faq-data';

export const metadata: Metadata = {
  title: '직업 티어 투표',
  description:
    '내 직업 기준으로 다른 직업과의 레이드 체감 우열을 평가하세요. 로그인 후 직업을 고르고 1~5단계로 배치하면 실시간 직업 티어표에 반영됩니다.',
  keywords:
    '로아 직업 티어 투표, 로스트아크 직업 티어, 로아 티어표 투표, 로아로골',
  openGraph: {
    title: '로아로골 | 직업 티어 투표',
    description:
      '내 직업 기준으로 직업 간 체감 우열을 투표하세요. 실시간 직업 티어표에 반영됩니다.',
    url: '/tier/vote',
    siteName: '로아로골',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: '/tier/vote',
  },
};

export default function TierVoteLayout({
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
            '@type': 'FAQPage',
            mainEntity: faqData.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.a,
              },
            })),
          }),
        }}
      />
    </>
  );
}
