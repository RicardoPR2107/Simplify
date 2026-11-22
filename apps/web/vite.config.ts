import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // En desarrollo, /api se redirige a la API: mismo origen, así las cookies funcionan sin trucos.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Separa React y sus librerías del código de la app: se cachean aparte en el navegador.
        manualChunks: (id) =>
          id.includes('node_modules/react') || id.includes('node_modules/scheduler')
            ? 'react-vendor'
            : undefined,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // La primera prueba de cada archivo compila la página perezosa desde cero: en equipos lentos
    // o en un CI cargado puede tardar varios segundos. 15 s por prueba deja margen de sobra.
    testTimeout: 15_000,
  },
});
