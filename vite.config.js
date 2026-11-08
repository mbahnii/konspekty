import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// На GitHub Pages сайт живёт по адресу /konspekty/
const base = process.env.GITHUB_ACTIONS ? '/konspekty/' : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',            // новая версия сайта ставится сама
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Конспекти', short_name: 'Конспекти', lang: 'uk',
        description: 'Конспекти відео про Claude Code',
        start_url: base, scope: base, display: 'standalone',
        background_color: '#000000', theme_color: '#000000',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}'],   // сам сайт — сразу офлайн
        navigateFallback: null,
        runtimeCaching: [
          // конспекты: показываем сохранённое, в фоне обновляем
          { urlPattern: /\/data\/.*\.json$/, handler: 'StaleWhileRevalidate', options: { cacheName: 'data' } },
          // кадры не меняются — берём из кэша
          { urlPattern: /\/data\/.*\.(webp|jpg)$/, handler: 'CacheFirst', options: { cacheName: 'frames', expiration: { maxEntries: 5000 } } },
          { urlPattern: /^https:\/\/i\.ytimg\.com\//, handler: 'CacheFirst', options: { cacheName: 'covers', expiration: { maxEntries: 300 } } },
        ],
      },
    }),
  ],
})
