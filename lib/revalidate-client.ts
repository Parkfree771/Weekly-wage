// /api/package/revalidate 호출 — 등록·수정·삭제·판매종료·댓글 뒤 ISR 사본을 즉시 갱신한다.
// 라우트가 로그인 토큰을 요구하므로(누구나 부를 수 있으면 호출 1건이 Firestore 읽기 수백 건이다)
// 여기서 현재 사용자의 ID 토큰을 붙인다. 토큰이 없으면(로그아웃 상태) 부르지 않는다 — 어차피 거절된다.
import { auth } from '@/lib/firebase-client';

// detailOnly: 상세만 다시 만든다 — 갤러리 목록이 바뀌지 않는 변경(아바타 착장 등록·삭제)용.
//   갤러리 재생성은 글 최대 200건 읽기라 필요 없을 때는 건너뛴다.
export async function revalidatePackage(
  postId: string,
  opts: { keepalive?: boolean; detailOnly?: boolean } = {},
): Promise<void> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    await fetch('/api/package/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(opts.detailOnly ? { postId, detailOnly: true } : { postId }),
      keepalive: opts.keepalive,
    });
  } catch {
    // 실패해도 화면은 이미 반영돼 있고, ISR 은 최대 1시간 뒤 스스로 갱신된다
  }
}
