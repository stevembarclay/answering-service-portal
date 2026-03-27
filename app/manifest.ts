import type { MetadataRoute } from 'next'
import { portalConfig } from '@/lib/config/portal'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: portalConfig.name,
    short_name: portalConfig.name,
    description: 'Answering service customer portal',
    start_url: '/answering-service',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: portalConfig.brandColor,
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
