import { cache } from 'react';
import { Metadata } from 'next';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { SITE_URL } from '@/lib/site-config';
import type { PackagePost } from '@/types/package';
import PackageDetailPage from './PackageDetailClient';

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
    } as PackagePost;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;
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
  const post = await getPost(postId);

  return <PackageDetailPage initialPost={post} />;
}
