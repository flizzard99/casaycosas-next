import type { MetadataRoute } from 'next';
import { LINEAS } from '@/lib/lineas';
import { getProductosPublicos } from '@/lib/db';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://casaycosas-next.vercel.app';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: 'weekly', priority: 1 },
    ...Object.values(LINEAS).map(({ href }) => ({ url: `${siteUrl}${href}`, changeFrequency: 'daily' as const, priority: 0.9 }))
  ];

  try {
    const productos = await getProductosPublicos();
    const productPages: MetadataRoute.Sitemap = productos.map((p) => ({
      url: `${siteUrl}/producto/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : p.created_at ? new Date(p.created_at) : undefined,
      changeFrequency: 'weekly',
      priority: 0.6
    }));

    return [...staticPages, ...productPages];
  } catch {
    return staticPages;
  }
}