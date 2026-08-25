import { getAdminFirestore } from '@/lib/firebase-admin';
import type { PackagePost } from '@/types/package';
import PackageGalleryClient, { type GalleryCursor } from './PackageGalleryClient';

// ISR: 갤러리 1페이지(글 6개 + 전체 수)를 서버에서 한 번 읽어 5분간 재사용한다.
// - Firestore 읽기가 "방문자당 7회" 에서 "5분당 1회" 로 줄고, 카드가 HTML 에 실려 온다.
// - 등록·수정·삭제·판매종료는 /api/package/revalidate 가 /package 를 즉시 재생성한다.
// - 시세(평균가·최저가), 광고, 반응 버튼은 전부 클라이언트에서 지금까지와 같이 동작한다.
// - 2페이지부터는 클라이언트가 커서(1페이지 마지막 글의 createdAt)로 이어서 읽는다.
// 상세 페이지(app/package/[postId]/page.tsx)와 같은 방식이다.
export const revalidate = 300;

// 클라이언트의 PAGE_SIZE 와 같아야 2페이지 커서가 맞물린다
const PAGE_SIZE = 6;

/** Firestore Timestamp → ISO 문자열 (서버→클라이언트 prop은 직렬화 가능해야 함) */
function toISO(value: unknown): string | null {
  const v = value as { toDate?: () => Date } | null | undefined;
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  return null;
}

type FirstPage = {
  posts: PackagePost[];
  cursor: GalleryCursor | null;
  totalCount: number | null;
};

async function loadFirstPage(): Promise<FirstPage | null> {
  try {
    const db = getAdminFirestore();
    const col = db.collection('packagePosts');
    // 목록과 count 를 같이 — count 집계는 문서를 읽지 않아 비용이 거의 없다
    const [snap, countSnap] = await Promise.all([
      col.orderBy('createdAt', 'desc').limit(PAGE_SIZE).get(),
      col.count().get().catch(() => null),
    ]);
    const posts = snap.docs.map((d) => {
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
    // 커서는 ISO 가 아니라 seconds/nanoseconds 그대로 — ms 로 깎이면 경계 글이 빠지거나 겹칠 수 있다
    const last = snap.docs[snap.docs.length - 1]?.get('createdAt');
    const cursor: GalleryCursor | null =
      last && typeof last.seconds === 'number'
        ? { seconds: last.seconds, nanoseconds: last.nanoseconds }
        : null;
    return { posts, cursor, totalCount: countSnap ? countSnap.data().count : null };
  } catch (err) {
    // 서버 읽기가 실패하면 null — 클라이언트가 예전처럼 직접 읽어 화면은 정상 동작한다
    console.error('갤러리 1페이지 서버 조회 실패:', err);
    return null;
  }
}

export default async function PackageGalleryPage() {
  const first = await loadFirstPage();
  return (
    <PackageGalleryClient
      initialPosts={first?.posts ?? null}
      initialCursor={first?.cursor ?? null}
      initialTotalCount={first?.totalCount ?? null}
    />
  );
}
