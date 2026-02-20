import { Metadata } from 'next';
import { getAdminFirestore } from '@/lib/firebase-admin';
import PackageDetailPage from './PackageDetailClient';

type Props = {
  params: Promise<{ postId: string }>;
};

async function getPost(postId: string) {
  try {
    const db = getAdminFirestore();
    const doc = await db.collection('packagePosts').doc(postId).get();
    if (!doc.exists) return null;
    return doc.data();
  } catch {
    return null;
  }
}

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
  const url = `https://lostarkweeklygold.kr/package/${postId}`;

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

export default function Page() {
  return <PackageDetailPage />;
}
