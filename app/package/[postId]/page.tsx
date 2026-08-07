import { cache } from 'react';
import { Metadata } from 'next';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { SITE_URL } from '@/lib/site-config';
import type { PackagePost } from '@/types/package';
import PackageDetailPage from './PackageDetailClient';
import AzenaBlessingDetail from '@/components/package/AzenaBlessingDetail';
import { AZENA_POST_ID, AZENA_TITLE } from '@/lib/azena-blessing';

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;

  // 아제나의 축복 — Firestore 글이 아니라 코드에 박아둔 공식 패키지 (조회 없이 바로 응답)
  if (postId === AZENA_POST_ID) {
    const title = `${AZENA_TITLE} 효율 계산기 - 로스트아크 패키지 효율`;
    const description =
      '아제나의 축복 [28일]이 실제로 이득인지 계산해 보세요. 일일 선택 상자·축복의 편린·엔드 컨텐츠 보너스 상자를 실시간 시세로 환산하고, 공명의 기운·휴게 물약·PC방 이용까지 내 플레이에 맞춰 커스텀할 수 있습니다.';
    const url = `${SITE_URL}/package/${AZENA_POST_ID}`;
    return {
      title,
      description,
      keywords: '아제나의 축복, 아제나의 축복 효율, 로아 패키지, 로스트아크 패키지 효율, 로아로골',
      openGraph: { title: `로아로골 | ${AZENA_TITLE}`, description, url, siteName: '로아로골', locale: 'ko_KR', type: 'article' },
      twitter: { card: 'summary', title: `로아로골 | ${AZENA_TITLE}`, description },
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
  };
}

export default async function Page({ params }: Props) {
  const { postId } = await params;

  if (postId === AZENA_POST_ID) return <AzenaBlessingDetail />;

  const post = await getPost(postId);

  return <PackageDetailPage initialPost={post} />;
}
