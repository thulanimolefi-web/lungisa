import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/home',
          '/dashboard',
          '/admin',
          '/api/',
          '/reset-password',
        ],
      },
    ],
    sitemap: 'https://www.lungiza.co.za/sitemap.xml',
    host:    'https://www.lungiza.co.za',
  }
}