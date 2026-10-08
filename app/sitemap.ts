import { MetadataRoute } from 'next'
import { SITE_URL, isNoindexed } from '@/lib/site-config'

// lastModified 는 넣지 않는다 — 전 URL에 매 빌드 시각을 박으면
// "매번 전부 바뀌었다"는 신호가 되어 구글이 lastmod 자체를 신뢰하지 않는다.
// priority 순서는 실제 트래픽 순이다 (패키지 효율 > 재련 시뮬 > 완갑 > 메인 > 숙제 체크).
// 참고: 구글은 priority·changefreq 를 무시한다고 공식적으로 밝혔다. 실제로 의미 있는 건
// lastmod 와 "URL 이 사이트맵에 들어 있다는 사실" 뿐이라, 이 값은 다른 크롤러용 힌트에 가깝다.
const ROUTES: Array<{ path: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number }> = [
  { path: '/package',            changeFrequency: 'daily',   priority: 1.0 },
  { path: '/refining',           changeFrequency: 'weekly',  priority: 0.9 },
  { path: '/wangap',             changeFrequency: 'weekly',  priority: 0.9 },
  { path: '',                    changeFrequency: 'daily',   priority: 0.8 },
  { path: '/mypage',             changeFrequency: 'weekly',  priority: 0.8 },
  // 아제나의 축복 — 유저 글이 아니라 코드로 박아둔 상시 판매 패키지라 URL 이 계속 유지된다.
  { path: '/package/azena-blessing', changeFrequency: 'daily', priority: 0.8 },
  { path: '/weekly-gold',        changeFrequency: 'daily',   priority: 0.8 },
  { path: '/more-reward',        changeFrequency: 'daily',   priority: 0.7 },
  { path: '/life-master',        changeFrequency: 'daily',   priority: 0.7 },
  { path: '/extreme',            changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/bracelet',           changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/expedition-gold',    changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/cathedral',          changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/cerka',              changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/belgardin',          changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/engraving',          changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/app',                changeFrequency: 'monthly', priority: 0.6 },
  { path: '/hell-reward',        changeFrequency: 'weekly',  priority: 0.6 },
  { path: '/about',              changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact',            changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy',            changeFrequency: 'monthly', priority: 0.5 },
  { path: '/terms',              changeFrequency: 'monthly', priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  // 색인에서 뺀 경로(NOINDEX_PATHS)는 사이트맵에서도 뺀다.
  // "사이트맵으로 색인을 요청하면서 페이지에는 noindex" 는 서로 어긋나는 신호다.
  const staticRoutes = ROUTES
    .filter(({ path }) => !isNoindexed(path || '/'))
    .map(({ path, changeFrequency, priority }) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency,
      priority,
    }));

  return staticRoutes;
}
