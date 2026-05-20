import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-config'

const ROUTES: Array<{ path: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number }> = [
  { path: '',                    changeFrequency: 'daily',   priority: 1.0 },
  { path: '/weekly-gold',        changeFrequency: 'daily',   priority: 0.9 },
  { path: '/refining',           changeFrequency: 'weekly',  priority: 0.8 },
  { path: '/life-master',        changeFrequency: 'daily',   priority: 0.8 },
  { path: '/package',            changeFrequency: 'daily',   priority: 0.8 },
  { path: '/bracelet',           changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/cathedral',          changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/cerka',              changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/extreme',            changeFrequency: 'weekly',  priority: 0.8 },
  { path: '/title-stats',        changeFrequency: 'daily',   priority: 0.8 },
  { path: '/title-stats/frost',  changeFrequency: 'daily',   priority: 0.8 },
  { path: '/mypage',             changeFrequency: 'weekly',  priority: 0.6 },
  { path: '/hell-reward',        changeFrequency: 'weekly',  priority: 0.6 },
  { path: '/about',              changeFrequency: 'monthly', priority: 0.6 },
  { path: '/privacy',            changeFrequency: 'monthly', priority: 0.5 },
  { path: '/terms',              changeFrequency: 'monthly', priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
