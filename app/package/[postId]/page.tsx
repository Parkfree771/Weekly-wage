import { cache } from 'react';
import { Metadata } from 'next';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { SITE_URL, INDEX_USER_PACKAGE_POSTS } from '@/lib/site-config';
import type { PackagePost, PackageComment } from '@/types/package';
import PackageDetailPage from './PackageDetailClient';
import AzenaBlessingDetail from '@/components/package/AzenaBlessingDetail';
import { AZENA_POST_ID, AZENA_TITLE, AZENA_FAQ } from '@/lib/azena-blessing';

// ISR: 상세 페이지 렌더(+ Firestore 읽기)를 5분간 재사용해 조회 폭주를 CDN이 흡수.
// 수정·삭제는 /api/package/revalidate 호출로 즉시 반영된다.
// 시세·좋아요 상태는 클라이언트에서 실시간 조회하므로 영향 없음.
export const revalidate = 300;

type Props = {
  params: Promise<{ postId: string }>;
};

/** Firestore Timestamp → ISO 문자열 (서버→클라이언트 prop은 직렬화 가능해야 함) */
function toISO(value: any): string | null {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return null;
}

/**
 * generateMetadata와 Page가 같은 요청에서 각각 호출되므로 cache()로 감싸
 * 요청당 Firestore 읽기를 1회로 합친다.
 */
const getPost = cache(async (postId: string): Promise<PackagePost | null> => {
  try {
    const db = getAdminFirestore();
    const snap = await db.collection('packagePosts').doc(postId).get();
    if (!snap.exists) return null;
    const data = snap.data()!;
    return {
      ...data,
      id: snap.id,
      createdAt: toISO(data.createdAt),
      updatedAt: toISO(data.updatedAt),
      // 판매 기간도 Timestamp — 클라이언트 컴포넌트로 넘기려면 직렬화 가능한 형태여야 한다
      saleStartAt: toISO(data.saleStartAt),
      saleEndAt: toISO(data.saleEndAt),
    } as PackagePost;
  } catch {
    return null;
  }
});

/**
 * 댓글 — 글과 같이 ISR 로 5분 캐시. 방문자마다 클라이언트가 최대 200건을 읽던 것을 서버 1회로 줄인다.
 * 댓글 작성·삭제 직후에는 클라이언트가 /api/package/revalidate 를 불러 바로 갱신한다.
 * 실패하면 null — 클라이언트가 예전처럼 직접 읽는다.
 */
async function getComments(postId: string): Promise<PackageComment[] | null> {
  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection('packagePosts').doc(postId).collection('comments')
      .orderBy('createdAt', 'desc').limit(200).get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        createdAt: toISO(data.createdAt),
        updatedAt: toISO(data.updatedAt),
      } as PackageComment;
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;

  // 아제나의 축복 — Firestore 글이 아니라 코드에 박아둔 공식 패키지 (조회 없이 바로 응답).
  // 상시 판매라 이 URL 은 계속 유지되므로 검색 유입을 노리고 메타데이터를 따로 짠다.
  // 제목은 template('로아로골 | %s') 을 쓰지 않고 absolute 로 고정 — 찾는 말(아제나의 축복)을
  // 맨 앞에 두어야 검색 결과에서 잘리지 않는다.
  if (postId === AZENA_POST_ID) {
    const title = '아제나의 축복 효율 계산기 - 로아 28일 패키지 이득 | 로아로골';
    const description =
      // 검색 결과에 잘리지 않게 앞쪽에 핵심어(효율·28일 기대값·편린 기댓값)를 모은다
      '아제나의 축복 효율 — 28일 기대값을 실시간 시세로 계산합니다. 축복의 편린 기댓값·확률표, 축복이 깃든 상자 내용물까지 골드로 환산. 1730 구간과 공명의 기운·휴게 물약·PC방 횟수에 맞춰 이득률을 바로 확인하세요.';
    const url = `${SITE_URL}/package/${AZENA_POST_ID}`;
    const ogImage = `${SITE_URL}/og-azena-blessing.jpg`;
    return {
      title: { absolute: title },
      description,
      keywords:
        '아제나의 축복, 로아 아제나의 축복, 아제나의 축복 효율, 아제나의 축복 가격, 아제나의 축복 이득, 아제나의 축복 28일, 로스트아크 아제나의 축복, 아제나의 축복 계산기, ' +
        '축복의 편린, 축복의 편린 기댓값, 축복의 편린 확률, 편린 드랍률, 아제나의 축복이 깃든 상자, 아제나의 축복이 깃든 선택 상자, 축복의 재련 재료 상자, ' +
        '아제나의 축복 1730, 아제나의 축복 공명의 기운, 아제나의 축복 휴게 물약, 아제나의 축복 전용 버프, 로아 패키지 효율, 로스트아크 패키지 효율, 로아로골',
      openGraph: {
        title: '아제나의 축복 효율 계산기 - 로아 28일 패키지 이득',
        description,
        url,
        siteName: '로아로골',
        locale: 'ko_KR',
        type: 'website',
        images: [{ url: ogImage, width: 1200, height: 630, alt: '아제나의 축복 효율 계산기' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: '아제나의 축복 효율 계산기 - 로아 28일 패키지 이득',
        description,
        images: [ogImage],
      },
      alternates: { canonical: url },
    };
  }

  const post = await getPost(postId);

  if (!post) {
    return {
      title: '패키지를 찾을 수 없습니다',
    };
  }

  const title = `${post.title} - 로스트아크 패키지 효율`;
  const description = `${post.title} 패키지의 효율을 확인하세요. ${post.royalCrystalPrice?.toLocaleString() || ''}원, ${post.packageType || '일반'} 타입. 실시간 시세 반영 골드 가치 계산.`;
  const url = `${SITE_URL}/package/${postId}`;

  return {
    title,
    description,
    keywords: `${post.title}, 로아 패키지, 로스트아크 패키지 효율, 로아 캐시샵, 로아로골`,
    openGraph: {
      title: `로아로골 | ${post.title}`,
      description,
      url,
      siteName: '로아로골',
      locale: 'ko_KR',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title: `로아로골 | ${post.title}`,
      description,
    },
    alternates: {
      canonical: url,
    },
    // 이 페이지 본문은 제목·가격·구성품 이름이 전부고, 골드값은 클라이언트에서 채워지므로
    // 봇이 받는 HTML 에는 0G 로 남는다. 같은 템플릿의 얇은 페이지가 무더기로 색인되지 않게 막는다.
    // follow 는 남겨 글 안의 내부 링크(가이드·계산기)는 그대로 전달한다.
    robots: INDEX_USER_PACKAGE_POSTS ? undefined : { index: false, follow: true },
  };
}

export default async function Page({ params }: Props) {
  const { postId } = await params;

  if (postId === AZENA_POST_ID) {
    const url = `${SITE_URL}/package/${AZENA_POST_ID}`;
    return (
      <>
        <AzenaBlessingDetail />
        {/* 구조화 데이터 — 사이트의 다른 계산기(WebApplication + FAQPage)와 같은 형식.
            FAQ 답변은 화면에 그대로 보이는 글(AZENA_FAQ)과 동일해야 한다 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: '아제나의 축복 효율 계산기',
              url,
              description:
                '로스트아크 아제나의 축복(28일) 패키지의 구성품을 거래소 실시간 시세로 환산해 28일 기대값과 결제 금액 대비 기대 효율을 계산합니다.',
              applicationCategory: 'GameApplication',
              operatingSystem: 'Any',
              inLanguage: 'ko-KR',
              isPartOf: { '@type': 'WebSite', name: '로아로골', url: SITE_URL },
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
              featureList: [
                '아제나의 축복 28일 구성품 실시간 시세 환산',
                '결제 금액(7,700원) 대비 기대 효율 계산',
                '아이템 레벨 1730 이상/이하별 융화·재련 재료 구성 반영',
                '공명의 기운·휴게 물약·PC방 이용 횟수에 따른 축복의 편린 기대 개수 계산',
                '일일 선택 상자 내용물 직접 선택 및 확률·상자 내용물 상세 표시',
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: AZENA_FAQ.map((item) => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: { '@type': 'Answer', text: item.a },
              })),
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: '로아로골', item: SITE_URL },
                { '@type': 'ListItem', position: 2, name: '패키지 효율', item: `${SITE_URL}/package` },
                { '@type': 'ListItem', position: 3, name: AZENA_TITLE, item: url },
              ],
            }),
          }}
        />
      </>
    );
  }

  const post = await getPost(postId);
  const comments = post ? await getComments(postId) : null;

  return <PackageDetailPage initialPost={post} initialComments={comments} />;
}
