import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// На GitHub Pages сайт живёт по адресу /konspekty/
const base = process.env.GITHUB_ACTIONS ? '/konspekty/' : '/'

// Время сборки — видно в меню настроек, чтобы сравнить версию на телефоне и ноутбуке
const BUILD = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default defineConfig({
  base,
  define: { __BUILD__: JSON.stringify(BUILD) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',            // новая версия сайта ставится сама
      injectRegister: false,                  // регистрируем сами в main.jsx, чтобы проверять обновления, пока приложение открыто
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
          // конспекты: сначала свежие данные из сети (офлайн — сохранённые)
          { urlPattern: /\/data\/.*\.json(\?.*)?$/, handler: 'NetworkFirst', options: { cacheName: 'data', networkTimeoutSeconds: 4, matchOptions: { ignoreSearch: true } } },   // свежее из сети, из кэша — только офлайн
          // кадры не меняются — берём из кэша
          { urlPattern: /\/data\/.*\.(webp|jpg)$/, handler: 'CacheFirst', options: { cacheName: 'frames', expiration: { maxEntries: 5000 } } },
          { urlPattern: /^https:\/\/i\.ytimg\.com\//, handler: 'CacheFirst', options: { cacheName: 'covers', expiration: { maxEntries: 300 } } },
        ],
      },
    }),
  ],
})
