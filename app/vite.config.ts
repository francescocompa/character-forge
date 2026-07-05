import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages project site is served under /character-forge/.
const base = '/character-forge/'

export default defineConfig({
  base,
  // Preview harnesses assign a port via PORT; default stays Vite's 5173.
  server: { port: Number(process.env.PORT) || 5173 },
  plugins: [
    react(),
    VitePWA({
      // Prompt, not autoUpdate: the app shows a "New version — Reload" toast and
      // swaps the service worker only when Francesco taps it (T17 — no silent
      // mid-session swaps). See app/src/app/UpdateToast.tsx.
      registerType: 'prompt',
      // Extra static assets to precache that the default glob would miss.
      includeAssets: ['apple-touch-icon.png', 'favicon-32x32.png', 'icon.svg', 'icon-maskable.svg'],
      manifest: {
        name: 'Character Forge',
        short_name: 'Forge',
        description: 'Your D&D 5e character sheets — offline, at the table.',
        // Dark launch/status surfaces to match the dark UI (D10, token --surface-bg).
        theme_color: '#121317',
        background_color: '#121317',
        display: 'standalone',
        orientation: 'portrait',
        // Pin scope/start/id to the Pages sub-path so install + navigation stay
        // inside /character-forge/.
        scope: base,
        start_url: base,
        id: base,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the whole shell for true offline-first — including the bundled
        // Inter font files (woff2), the vendored three/cannon blobs (js, lazy-loaded
        // but must be cached so the first offline roll works — T24), and the Vecna
        // dice faces (otf). The app must never fetch any of these at runtime (§8).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,otf}'],
        // three.min.js is ~590KB — lift the precache size cap so it's included.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Real character files can be dropped in public/ during local dev; never
        // precache them (they hold KB extracts, and they belong in IndexedDB).
        globIgnores: ['**/*.character.json'],
        // SPA fallback so deep reloads work offline under the Pages sub-path.
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Let the SW run in `vite dev` so the update/offline flow is testable
        // without a production build.
        enabled: false,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
