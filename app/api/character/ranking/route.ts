import { NextResponse } from 'next/server';
import { listRanking } from '@/lib/character-cache';

// 아이템레벨 파라미터 파싱: 유한 양수만 유효, 그 외 undefined
function parseLevel(raw: string | null): number | undefined {
  if (raw === null || raw === '') return undefined;
  const v = parseFloat(raw);
  return isFinite(v) && v > 0 ? v : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const className = searchParams.get('class') || undefined;
  const titleQuery = searchParams.get('title') || undefined;
  const sortBy = searchParams.get('sort') === 'item_level' ? 'item_level' : 'combat_power';
  const sortDir = searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
  const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10) || 30, 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
  const ancientRaw = searchParams.get('ancient');
  const ancientCount =
    ancientRaw !== null && ancientRaw !== '' && /^[0-6]$/.test(ancientRaw)
      ? parseInt(ancientRaw, 10)
      : undefined;
  const specId = searchParams.get('spec') || undefined;
  const roleRaw = searchParams.get('role');
  const role = roleRaw === 'support' || roleRaw === 'dealer' ? roleRaw : undefined;
  // slim=1: cores에서 icon 생략 (웹 클라가 이름→아이콘 유도. 구버전 앱은 slim 없이 호출 → icon 유지)
  const slimCores = searchParams.get('slim') === '1';
  // 아이템레벨 범위 (선택). 뒤바뀐 min/max는 서버에서도 스왑해 빈 결과 방지
  let minItemLevel = parseLevel(searchParams.get('minLevel'));
  let maxItemLevel = parseLevel(searchParams.get('maxLevel'));
  if (minItemLevel !== undefined && maxItemLevel !== undefined && minItemLevel > maxItemLevel) {
    [minItemLevel, maxItemLevel] = [maxItemLevel, minItemLevel];
  }

  try {
    const entries = await listRanking({
      className, titleQuery, ancientCount, specId, role,
      minItemLevel, maxItemLevel, sortBy, sortDir, limit, offset, slimCores,
    });
    const res = NextResponse.json({ entries });
    // Netlify-Vary: query → 쿼리 문자열(offset·필터·정렬)별로 캐시 키 분리.
    // 이게 없으면 모든 페이지가 한 캐시로 뭉개져 1~30위만 반복됨(페이지네이션 깨짐).
    res.headers.set('Netlify-Vary', 'query');
    // 같은 페이지 반복 요청은 1시간 캐시 적중 → DB·함수 호출 절감. 만료 후 SWR로 지연 0.
    // 신규 캐릭터·갱신 반영이 최대 1시간 늦지만 감수 (2026-08 함수 사용량 대응)
    res.headers.set('Netlify-CDN-Cache-Control', 'public, durable, s-maxage=3600, stale-while-revalidate=86400');
    res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    return res;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[ranking-api] error:', err);
    return NextResponse.json({ message: '랭킹을 불러올 수 없습니다.' }, { status: 500 });
  }
}
