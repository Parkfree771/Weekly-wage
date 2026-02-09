import { NextResponse } from 'next/server';

/**
 * GET /api/lostark/image-proxy?url={imageUrl}
 *
 * 로아 CDN 이미지를 프록시하여 CORS 문제를 해결한다.
 * @imgly/background-removal 라이브러리가 이미지를 로드할 때 사용.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ message: 'url 파라미터가 필요합니다.' }, { status: 400 });
  }

  // 로아 CDN 도메인만 허용
  try {
    const parsed = new URL(imageUrl);
    if (!parsed.hostname.endsWith('lostark.co.kr') && !parsed.hostname.endsWith('onstove.com')) {
      return NextResponse.json({ message: '허용되지 않는 도메인입니다.' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ message: '올바른 URL이 아닙니다.' }, { status: 400 });
  }

  try {
    const res = await fetch(imageUrl, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ message: '이미지를 가져올 수 없습니다.' }, { status: res.status });
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/png';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Netlify-Vary': 'query',
      },
    });
  } catch (error) {
    console.error('이미지 프록시 오류:', error);
    return NextResponse.json({ message: '이미지 프록시 실패' }, { status: 500 });
  }
}
