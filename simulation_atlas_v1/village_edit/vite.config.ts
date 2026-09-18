import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { simArchivePlugin } from './vite-plugin-sim-archive'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Async config so @tailwindcss/vite (ESM-only) is not force-required by Vite's
// config bundler under Node 24 / nested esbuild.
export default defineConfig(async () => {
  const { default: tailwindcss } = await import('@tailwindcss/vite')
  return {
    plugins: [react(), tailwindcss(), simArchivePlugin(__dirname)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      // Stable play session: other agents editing the tree must not HMR-storm / kill Electron.
      hmr: false,
      watch: {
        ignored: ['**'],
      },
    },
    base: './',
    worker: {
      format: 'es',
    },
  }
})
