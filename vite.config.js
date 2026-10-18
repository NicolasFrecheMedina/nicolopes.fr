import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {
        accueil: fileURLToPath(new URL('./index.html', import.meta.url)),
        realisations: fileURLToPath(new URL('./realisations/index.html', import.meta.url)),
      },
    },
  },
})
