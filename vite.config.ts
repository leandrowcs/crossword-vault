import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/crossword-vault-logo.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Palavras Cruzadas Vault',
        short_name: 'Cruzadas Vault',
        description: 'Palavras cruzadas em português, ilimitadas e sem anúncios.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#12111c',
        background_color: '#12111c',
        icons: [
          { src: '/icons/crossword-vault-logo-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/crossword-vault-logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/crossword-vault-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/crossword-vault-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/crossword-vault-logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})