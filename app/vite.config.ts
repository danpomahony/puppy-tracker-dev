import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Accept any Tailscale name (`.ts.net`), so the dev server works through
    // `tailscale serve` without putting a personal tailnet name in the repo.
    allowedHosts: ['.ts.net'],
    proxy: { '/api': 'http://localhost:8090' },
  },
})
