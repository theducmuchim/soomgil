import type { MetadataRoute } from 'next';
import { SITE } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 개인 설정 화면과 API는 색인할 이유가 없다
      disallow: ['/api/', '/mypage', '/login'],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
