import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages project site is served under /character-forge/.
export default defineConfig({
  base: '/character-forge/',
  // Preview harnesses assign a port via PORT; default stays Vite's 5173.
  server: { port: Number(process.env.PORT) || 5173 },
  plugins: [
    react(),
    // Default manifest for now — T17 finalizes icons and offline strategy.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'character-forge',
        short_name: 'character-forge',
        description: 'D&D 5e character sheet',
        theme_color: '#121317',
        background_color: '#121317',
        display: 'standalone',
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
