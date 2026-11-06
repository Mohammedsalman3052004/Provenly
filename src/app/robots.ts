import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: ['/', '/u/', '/badge/'], disallow: ['/app/', '/s/', '/auth/'] }], sitemap: `${SITE_URL}/sitemap.xml` };
}
