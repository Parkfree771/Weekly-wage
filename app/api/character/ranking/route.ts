import { NextResponse } from 'next/server';
import { listRanking } from '@/lib/character-cache';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const className = searchParams.get('class') || undefined;
  const titleQuery = searchParams.get('title') || undefined;
  const sortBy = searchParams.get('sort') === 'item_level' ? 'item_level' : 'combat_power';
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10) || 10, 50);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

  try {
    const entries = await listRanking({ className, titleQuery, sortBy, limit, offset });
    return NextResponse.json({ entries });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[ranking-api] error:', err);
    return NextResponse.json({ message: '랭킹을 불러올 수 없습니다.' }, { status: 500 });
  }
}
