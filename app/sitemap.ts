import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.lungiza.co.za'
  const now = new Date()

  return [
    {
      url:              baseUrl,
      lastModified:     now,
      changeFrequency:  'weekly',
      priority:         1.0,
    },
    {
      url:              `${baseUrl}/auth`,
      lastModified:     now,
      changeFrequency:  'monthly',
      priority:         0.8,
    },
    {
      url:              `${baseUrl}/post`,
      lastModified:     now,
      changeFrequency:  'monthly',
      priority:         0.9,
    },
    {
      url:              `${baseUrl}/blog`,
      lastModified:     now,
      changeFrequency:  'weekly',
      priority:         0.8,
    },
    {
      url:              `${baseUrl}/blog/find-plumber-johannesburg`,
      lastModified:     now,
      changeFrequency:  'monthly',
      priority:         0.7,
    },
    {
      url:              `${baseUrl}/blog/electrician-sandton`,
      lastModified:     now,
      changeFrequency:  'monthly',
      priority:         0.7,
    },
    {
      url:              `${baseUrl}/blog/home-repairs-gauteng`,
      lastModified:     now,
      changeFrequency:  'monthly',
      priority:         0.7,
    },
    {
      url:              `${baseUrl}/blog/how-escrow-protects-homeowners`,
      lastModified:     now,
      changeFrequency:  'monthly',
      priority:         0.6,
    },
    {
      url:              `${baseUrl}/blog/grow-your-trade-business-south-africa`,
      lastModified:     now,
      changeFrequency:  'monthly',
      priority:         0.6,
    },
  ]
}