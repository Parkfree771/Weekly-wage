import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/'],
      },
      // 애드센스 봇은 자기 전용 그룹만 따르므로 '*' 의 disallow 가 적용되지 않는다.
      // 그냥 allow:'/' 만 주면 /api/(JSON)·/admin/(내용 없는 관리자 화면)까지 훑어가
      // "가치 없는 콘텐츠" 판정에 불리하다. 같은 제외 목록을 각 그룹에 다시 적어 준다.
      {
        userAgent: 'Mediapartners-Google',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/'],
      },
      {
        userAgent: 'AdsBot-Google',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
