import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // /_next/ 는 막으면 안 된다 — JS·CSS 가 전부 여기 있어서, 막으면 구글 렌더러가 스타일 없는
      // 깨진 화면을 보고 JS 로 그리는 시세·계산기는 통째로 빈칸이 된다 (2026-09-27 까지 막혀 있었음).
      // /api/price-data/ 도 같은 이유로 연다 — 홈 차트·패키지 효율 등이 렌더링 중에 읽는 공개 시세
      // (CDN durable 캐시라 봇이 읽어도 함수 호출이 늘지 않는다). 긴 경로 규칙이 우선이라 /api/ 차단보다 먼저 먹는다.
      {
        userAgent: '*',
        allow: ['/', '/api/price-data/'],
        disallow: ['/api/', '/admin/'],
      },
      // 애드센스 봇은 자기 전용 그룹만 따르므로 '*' 의 disallow 가 적용되지 않는다.
      // 그냥 allow:'/' 만 주면 /api/(JSON)·/admin/(내용 없는 관리자 화면)까지 훑어가
      // "가치 없는 콘텐츠" 판정에 불리하다. 같은 제외 목록을 각 그룹에 다시 적어 준다.
      {
        userAgent: 'Mediapartners-Google',
        allow: ['/', '/api/price-data/'],
        disallow: ['/api/', '/admin/'],
      },
      {
        userAgent: 'AdsBot-Google',
        allow: ['/', '/api/price-data/'],
        disallow: ['/api/', '/admin/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
