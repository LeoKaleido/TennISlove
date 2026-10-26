import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // App installabile (D-048): il service worker tiene in cache solo i file dell'app, mai le risposte dell'API
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'TennISlove',
        short_name: 'TennISlove',
        lang: 'it',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0B1A24',
        theme_color: '#0B1A24',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico}', 'pwa-*.png', 'apple-touch-icon-*.png', 'login-court.jpg'],
        navigateFallback: '/index.html',
        // link diretti all'API (foto, file .ics) vanno sempre al server
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    port: 5173,
    // In Docker l'API è raggiungibile come http://api:3000
    proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000' },
  },
});
