import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build works at username.github.io/<repo>/ or on a custom domain.
export default defineConfig({
  base: './',
  plugins: [react()],
  // The PDF library is large but is only loaded when someone downloads a report.
  build: { chunkSizeWarningLimit: 1300 },
})
