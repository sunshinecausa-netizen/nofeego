import type { MetadataRoute } from 'next';
import { createServerClient } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://manhattanliving.com';
  const supabase = createServerClient();
  const entries: MetadataRoute.Sitemap = [];

  // Static pages
  const staticPages = [
    { url: '', priority: 1.0, changeFrequency: 'daily' as const },
    { url: '/buildings', priority: 0.9, changeFrequency: 'weekly' as const },
    { url: '/neighborhoods', priority: 0.9, changeFrequency: 'weekly' as const },
    { url: '/search', priority: 0.8, changeFrequency: 'daily' as const },
    { url: '/short-stays', priority: 0.8, changeFrequency: 'weekly' as const },
    { url: '/shared-living', priority: 0.8, changeFrequency: 'weekly' as const },
    { url: '/list-your-property', priority: 0.7, changeFrequency: 'monthly' as const },
  ];

  staticPages.forEach((page) => {
    entries.push({
      url: `${baseUrl}${page.url}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    });
  });

  try {
    // Buildings
    const { data: buildings } = await supabase.from('buildings').select('slug, updated_at');
    buildings?.forEach((b) => {
      entries.push({
        url: `${baseUrl}/buildings/${b.slug}`,
        lastModified: new Date(b.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });

    // Neighborhoods
    const { data: neighborhoods } = await supabase.from('neighborhoods').select('slug, updated_at');
    neighborhoods?.forEach((n) => {
      entries.push({
        url: `${baseUrl}/neighborhoods/${n.slug}`,
        lastModified: new Date(n.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });

    // Listings
    const { data: listings } = await supabase.from('listings').select('slug, updated_at').eq('status', 'active');
    listings?.forEach((l) => {
      entries.push({
        url: `${baseUrl}/listings/${l.slug}`,
        lastModified: new Date(l.updated_at),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    });
  } catch (err) {
    console.error('Failed to generate sitemap:', err);
  }

  return entries;
}
