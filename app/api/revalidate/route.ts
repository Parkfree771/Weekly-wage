import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tag } = body;

    if (!tag) {
      return NextResponse.json(
        { message: 'tag가 필요합니다.' },
        { status: 400 }
      );
    }

    // 캐시 태그 무효화
    revalidateTag(tag, 'max');

    console.log(`[Revalidate] 캐시 무효화 완료: ${tag}`);

    return NextResponse.json({
      revalidated: true,
      tag,
      now: Date.now()
    });
  } catch (err) {
    console.error('[Revalidate] 오류:', err);
    return NextResponse.json(
      { message: '캐시 무효화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
