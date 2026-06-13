import { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/browser/',
    },
    sitemap: 'https://github.com/BGx-11/Veil/sitemap.xml',
  }
}
