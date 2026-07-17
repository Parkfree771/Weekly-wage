import { NextRequest, NextResponse } from 'next/server';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/app-download-config';

// QR 스캔 시 이 짧은 경로(/dl)로 진입 → UA로 iOS/Android 구분해 스토어로 바로 리다이렉트.
// 데스크톱 등 판별 불가 UA는 /app 랜딩 페이지로 보낸다(양쪽 배지 다 보여줌).
export async function GET(request: NextRequest) {
  const ua = request.headers.get('user-agent') || '';

  if (/android/i.test(ua)) {
    return NextResponse.redirect(PLAY_STORE_URL || new URL('/app', request.url));
  }
  if (/iphone|ipad|ipod/i.test(ua)) {
    return NextResponse.redirect(APP_STORE_URL || new URL('/app', request.url));
  }
  return NextResponse.redirect(new URL('/app', request.url));
}
