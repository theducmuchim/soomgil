import type { MetadataRoute } from 'next';
import { SITE } from '@/config/site';
import { NOTICES } from '@/data/notices';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/route', '/risk-map', '/layers', '/stats', '/guide', '/notice', '/about'];

  return [
    ...routes.map((path) => ({
      url: `${SITE.url}${path}`,
      lastModified: new Date(),
      // 실시간 데이터 화면일수록 자주 바뀐다
      changeFrequency: (path === '' || path === '/risk-map' ? 'hourly' : 'weekly') as
        | 'hourly'
        | 'weekly',
      priority: path === '' ? 1 : path === '/route' ? 0.9 : 0.7,
    })),
    ...NOTICES.map((notice) => ({
      url: `${SITE.url}/notice/${notice.slug}`,
      lastModified: new Date(notice.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    })),
  ];
}
