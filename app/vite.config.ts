import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages project site is served under /character-forge/.
export default defineConfig({
  base: '/character-forge/',
  plugins: [
    react(),
    // Default manifest for now — T17 finalizes icons and offline strategy.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'character-forge',
        short_name: 'character-forge',
        description: 'D&D 5e character sheet',
        theme_color: '#0b0b0f',
        background_color: '#0b0b0f',
        display: 'standalone',
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
