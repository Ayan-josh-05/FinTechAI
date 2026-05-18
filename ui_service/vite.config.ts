import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from "vite-tsconfig-paths"
import viteCompression from 'vite-plugin-compression'

import { resolve, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const compressFilter = /\.(js|mjs|json|css|html|svg|txt)$/i

export default defineConfig({
  plugins: [
    viteReact(),
    tailwindcss(),
    tsconfigPaths(),
    // Gzip compression
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240,         // 10 KB
      deleteOriginFile: false,
      filter: compressFilter,
      // compressionOptions: { level: 9 }   // optional tuning
    }),
    // Brotli compression
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false,
      filter: compressFilter,
      // compressionOptions: { level: 11 }  // stronger compression, more CPU during build
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          chakra: ['@chakra-ui/react', '@emotion/react', '@emotion/styled'],
          tanstack: ['@tanstack/react-query', '@tanstack/react-router'],
        },
      },
    },
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
})
