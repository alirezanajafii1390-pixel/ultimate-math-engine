import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: './',
  // inspectAttr() injects source-file/line data attributes into the DOM for
  // the Kimi builder's click-to-source feature. Dev-server only — it must
  // never ship in a production build (bundle bloat + leaks source paths).
  plugins: [command === 'serve' ? inspectAttr() : null, react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
