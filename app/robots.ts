import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/admin/*', '/account', '/sign-in', '/sign-up'],
    },
    sitemap: 'https://manhattanliving.com/sitemap.xml',
  };
}
