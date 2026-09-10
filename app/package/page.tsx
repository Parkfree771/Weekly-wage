import { getAdminFirestore } from '@/lib/firebase-admin';
import { applyStatsToPosts } from '@/lib/package-stats';
import type { PackagePost } from '@/types/package';
import PackageGalleryClient from './PackageGalleryClient';

// ISR: 갤러리 글을 서버에서 한 번에 다 읽어 5분간 재사용한다.
// - Firestore 읽기가 "방문자당 N회" 에서 "5분당 1회" 로 줄고, 카드가 HTML 에 실려 온다.
// - 등록·수정·삭제·판매종료는 /api/package/revalidate 가 /package 를 즉시 재생성한다.
// - 시세(평균가·최저가), 광고, 반응 버튼은 전부 클라이언트에서 지금까지와 같이 동작한다.
// - **페이지 나누기·정렬·필터는 전부 클라이언트에서 이 배열 위에서 돈다.** 예전엔 6개씩 커서로
//   이어 읽어서 "판매중" 을 걸어도 그 페이지의 6개 안에서만 걸렸다. 브라우저가 Firestore 를
//   직접 읽는 경로(2페이지 이후 + firebase SDK 250KB 청크)도 이걸로 사라진다.
// 상세 페이지(app/package/[postId]/page.tsx)와 같은 방식이다.
export const revalidate = 300;

// 한 번에 내려보내는 글 수 상한 — 앱 fetchAllPackagePosts(200) 와 같은 값으로 맞춘다.
// 실측(2026-09-10): 글 20개 = JSON 35KB(gzip 6.3KB). 100개를 넘어가면 첫 응답이 무거워지므로
// 그때는 "최근 N개만 내려보내고 나머지는 더보기" 로 나눠야 한다 — docs/DATA-AND-CACHE.md 참조.
const MAX_POSTS = 200;

/** Firestore Timestamp → ISO 문자열 (서버→클라이언트 prop은 직렬화 가능해야 함) */
function toISO(value: unknown): string | null {
  const v = value as { toDate?: () => Date } | null | undefined;
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  return null;
}

type GalleryData = {
  posts: PackagePost[];
  /** 이 스냅샷을 만든 시각(epoch ms). 클라이언트가 "집계를 다시 받을 필요가 있나" 를 이걸로 판단한다 */
  statsAt: number;
};

async function loadGallery(): Promise<GalleryData | null> {
  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection('packagePosts')
      .orderBy('createdAt', 'desc')
      .limit(MAX_POSTS)
      .get();
    const rawPosts = snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        createdAt: toISO(data.createdAt),
        updatedAt: toISO(data.updatedAt),
        saleStartAt: toISO(data.saleStartAt),
        saleEndAt: toISO(data.saleEndAt),
      } as PackagePost;
    });
    // 조회·따봉·흠은 Neon 이 진실이다. Firestore 카운터는 이관 시점에 멈춰 있어 여기서 갈아 끼운다
    // — 이러지 않으면 첫 화면이 옛날 숫자로 떴다가 클라이언트 조회가 오면 확 바뀐다.
    // 글 전체를 IN 쿼리 1회로 덮으므로, 이제 목록의 모든 글이 처음부터 최신 숫자를 들고 나간다.
    const posts = await applyStatsToPosts(rawPosts);
    return { posts, statsAt: Date.now() };
  } catch (err) {
    // 서버 읽기가 실패하면 null — 클라이언트가 예전처럼 직접 읽어 화면은 정상 동작한다
    console.error('갤러리 서버 조회 실패:', err);
    return null;
  }
}

export default async function PackageGalleryPage() {
  const data = await loadGallery();
  return (
    <PackageGalleryClient
      initialPosts={data?.posts ?? null}
      statsAt={data?.statsAt ?? null}
    />
  );
}
