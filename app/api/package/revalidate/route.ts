import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// 패키지 상세와 갤러리 1페이지는 ISR(5분)로 캐시된다. 등록·수정·삭제·판매종료 직후
// 이 라우트를 호출해 해당 글과 갤러리(/package)를 즉시 재생성시킨다.
// 악용해도 글 1건 + 갤러리 1페이지 재렌더(Firestore 읽기 8회)뿐이고
// proxy.ts 레이트리밋이 걸려 있어 별도 인증은 두지 않는다.
const POST_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json();
    if (!postId || typeof postId !== 'string' || !POST_ID_RE.test(postId)) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }

    revalidatePath(`/package/${postId}`);
    // 새 글·제목 변경·삭제가 갤러리 목록에 바로 보이게
    revalidatePath('/package');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
