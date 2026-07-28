import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { guides } from '@/data/guides'

// lastModified: 지정한 라우트만 그 날짜를 쓰고, 없으면 빌드 시각을 쓴다.
// 가이드 글은 실제 수정일(data/guides.ts)을 넣는다 — 전 URL에 매 빌드 시각을 박으면
// "매번 전부 바뀌었다"는 신호가 되어 구글이 lastmod 자체를 신뢰하지 않는다.
const ROUTES: Array<{ path: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number; lastModified?: string }> = [
  { path: '',                    changeFrequency: 'daily',   priority: 1.0 },
  { path: '/weekly-gold',        changeFrequency: 'daily',   priority: 0.9 },
  { path: '/more-reward',        changeFrequency: 'daily',   priority: 0.8 },
  { path: '/refining',           changeFrequency: 'weekly',  priority: 0.8 },
  { path: '/wangap',             changeFrequency: 'weekly',  priority: 0.8 },
  { path: '/life-master',        changeFrequency: 'daily',   priority: 0.8 },
  { path: '/package',            changeFrequency: 'daily',   priority: 0.8 },
  { path: '/bracelet',           changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/expedition-gold',    changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/cathedral',          changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/cerka',              changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/belgardin',          changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/extreme',            changeFrequency: 'weekly',  priority: 0.8 },
  { path: '/engraving',          changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/character',          changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/app',                changeFrequency: 'monthly', priority: 0.6 },
  { path: '/hell-reward',        changeFrequency: 'weekly',  priority: 0.6 },
  { path: '/guide',              changeFrequency: 'weekly',  priority: 0.7 },
  // 개별 가이드 글은 data/guides.ts 에서 자동 등록
  ...guides.map((g) => ({
    path: g.href,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
    lastModified: g.updated ?? g.date,
  })),
  // 숙제 체크 — 실제 기능 페이지이고 이미 색인돼 있어(2026-07-28 확인) 사이트맵에서만
  // 빠져 있으면 신호가 어긋난다. 데모 데이터·이용 가이드가 있어 본문도 갖춰져 있다.
  { path: '/mypage',             changeFrequency: 'weekly',  priority: 0.6 },
  { path: '/about',              changeFrequency: 'monthly', priority: 0.6 },
  { path: '/privacy',            changeFrequency: 'monthly', priority: 0.5 },
  { path: '/terms',              changeFrequency: 'monthly', priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const buildTime = new Date();
  return ROUTES.map(({ path, changeFrequency, priority, lastModified }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: lastModified ? new Date(lastModified) : buildTime,
    changeFrequency,
    priority,
  }));
}
