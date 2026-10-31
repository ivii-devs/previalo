import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'favicon.png',
        'apple-touch-icon.png',
        'badge-96x96.png',
        'og-image.png',
        'offline.html',
        'sitemap.xml',
        'icons/*.png',
        'icons/*.svg'
      ],
      manifest: {
        id: '/',
        name: 'Previalo - Juegos de Previa y Fiesta',
        short_name: 'Previalo',
        description: 'Juegos de previa y fiesta offline con más de 6,900 cartas y tableros interactivos',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#000000',
        theme_color: '#000000',
        lang: 'es',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ],
        shortcuts: [
          {
            name: 'Modo Caos',
            short_name: 'Caos',
            description: 'Partida impredecible con cartas mezcladas de todas las categorías',
            url: '/?mode=chaos',
            icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Modo Spicy',
            short_name: 'Spicy',
            description: 'Partida intensa y picante para romper el hielo',
            url: '/?mode=spicy',
            icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'El Tablero',
            short_name: 'Tablero',
            description: 'Juego de mesa interactivo con 64 casillas',
            url: '/?mode=board',
            icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Yo Nunca',
            short_name: 'Yo Nunca',
            description: 'Clásico juego de confesiones y tragos',
            url: '/?category=yo_nunca',
            icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        importScripts: ['/push-sw.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/data/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'previalo-catalog-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
