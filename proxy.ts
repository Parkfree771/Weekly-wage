import { NextRequest, NextResponse } from 'next/server';
import { SITE_URL, LEGACY_SITE_URL, NEW_SITE_URL } from '@/lib/site-config';

// ============================================================
// 레이트 리밋 (인메모리 - 서버리스 인스턴스별 독립)
// 완벽하진 않지만 단일 인스턴스 내 버스트 공격 방어
// ============================================================

const RATE_LIMIT_WINDOW = 60_000; // 1분
const RATE_LIMIT_MAX_API = 120;    // API: 분당 120회 (페이지 로드 시 다수 동시 호출 고려)
const RATE_LIMIT_MAX_LOSTARK = 30; // 로아 API: 분당 30회 (외부 API 키 보호)
const RATE_LIMIT_MAX_ADMIN = 5;    // 관리자: 분당 5회
const RATE_LIMIT_MAX_UNKNOWN = 10; // IP 미식별: 분당 10회 (공유 버킷 보호)

type RateLimitEntry = { count: number; resetAt: number };
const rateLimitMap = new Map<string, RateLimitEntry>();

// 오래된 엔트리 정리 (메모리 누수 방지)
let lastCleanup = Date.now();
function cleanupRateLimitMap() {
  const now = Date.now();
  if (now - lastCleanup < 30_000) return; // 30초마다
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}

function checkRateLimit(key: string, max: number): { allowed: boolean; remaining: number } {
  cleanupRateLimitMap();
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: max - 1 };
  }

  entry.count++;
  if (entry.count > max) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: max - entry.count };
}

// ============================================================
// CORS 허용 도메인 — 마이그레이션 기간엔 구·새 도메인 양쪽 허용
// ============================================================

const ALLOWED_ORIGINS = Array.from(new Set([
  SITE_URL,
  LEGACY_SITE_URL,
  `https://www.${LEGACY_SITE_URL.replace(/^https?:\/\//, '')}`,
  NEW_SITE_URL,
  `https://www.${NEW_SITE_URL.replace(/^https?:\/\//, '')}`,
  'http://localhost:3000',
  'http://localhost:3001',
]));

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// ============================================================
// IP 추출
// ============================================================

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-nf-client-connection-ip') || // Netlify
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

// ============================================================
// 미들웨어 — 아래 config.matcher 에 든 API 경로에서만 실행된다
// ============================================================

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  const ip = getClientIp(req);

  // IP 미식별 시 별도 저용량 버킷 사용 (모든 미식별 요청이 한 버킷 공유하므로)
  const isUnknownIp = ip === 'unknown';

  // 라우트별 레이트 리밋 적용
  let limit: { allowed: boolean; remaining: number };

  // (크론 라우트는 matcher 에 없다 — CRON_SECRET 으로 핸들러가 직접 인증한다)
  if (pathname.startsWith('/api/admin/')) {
    limit = checkRateLimit(`admin:${ip}`, RATE_LIMIT_MAX_ADMIN);
  } else if (isUnknownIp) {
    // IP를 알 수 없는 경우: 모든 미식별 요청이 하나의 버킷을 공유하므로
    // 정상 사용자가 차단되지 않도록 별도 제한 (낮은 한도)
    limit = checkRateLimit(`unknown:${pathname.split('/')[2] || 'general'}`, RATE_LIMIT_MAX_UNKNOWN);
  } else if (pathname.startsWith('/api/lostark')) {
    limit = checkRateLimit(`lostark:${ip}`, RATE_LIMIT_MAX_LOSTARK);
  } else {
    limit = checkRateLimit(`api:${ip}`, RATE_LIMIT_MAX_API);
  }

  if (!limit.allowed) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
          ...corsHeaders,
        },
      }
    );
  }

  // 응답에 CORS + 레이트 리밋 헤더 추가
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  response.headers.set('X-RateLimit-Remaining', String(limit.remaining));

  return response;
}

// Netlify 는 이 proxy 를 엣지 함수로 올리고, 엣지 함수는 CDN 캐시보다 먼저 실행된다.
// 그래서 matcher 에 든 경로는 CDN 이 캐시로 답할 요청까지 매번 함수가 한 번 돈다.
// 캐시로 끝나야 하는 GET 시세·집계 라우트(price-data, package/stats, market/live-prices)는
// 여기서 빼고, 외부 키를 쓰거나 쓰기가 일어나는 라우트만 남긴다.
// (레이트리밋은 인스턴스별 메모리라 느슨하다 — 진짜 보호는 각 라우트의 인증·캐시가 맡는다)
export const config = {
  matcher: [
    '/api/lostark/:path*',
    '/api/package/view',
    '/api/package/react',
    '/api/package/revalidate',
    '/api/feedback/:path*',
    '/api/admin/:path*',
    '/api/market/batch-prices',
  ],
};
