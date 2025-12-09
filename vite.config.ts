import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    host: '0.0.0.0', // Important for Docker
    port: 5173, // Default Vite port
  },
  build: {
    // Ensure proper base path for GitHub Pages
    outDir: 'dist',
    emptyOutDir: true,
  }
})
