import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'
import { join } from 'path'

const pkg = JSON.parse(readFileSync(join(import.meta.dirname, 'package.json'), 'utf8'))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: 'jsdom',
    // Dummy values so importing src/services/supabase.js doesn't throw in
    // tests; no test ever talks to a real backend.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
