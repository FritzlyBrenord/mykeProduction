import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://mykeindustrie.com',
      lastModified: new Date(),
    },
  ]
}