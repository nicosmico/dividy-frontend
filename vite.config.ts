import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': a new version never reloads the page by itself (it could
      // discard a half-filled expense); the app shows a toast with a button.
      registerType: 'prompt',
      // Icons and manifest are committed in public/ and linked from index.html.
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Dividy',
        short_name: 'Dividy',
        description:
          'Divide los gastos de un grupo y descubre quién le debe cuánto a quién, con números que cuadran al peso.',
        lang: 'es-CL',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        theme_color: '#18181b',
        background_color: '#F8F7F1',
        categories: ['finance', 'utilities'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell: every built asset (all route chunks, CSS, icons), so the
        // app opens and works offline. Data lives in localStorage anyway.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // Any navigation (deep links such as /groups/abc/expenses) gets the shell.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    pool: 'vmThreads',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.contract.ts',
        'src/test/**',
        'src/domain/test-utils/**',
        'src/vite-env.d.ts',
      ],
      reporter: ['text', 'html'],
      thresholds: {
        'src/domain/**': {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
      },
    },
  },
});
