import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { devApiPlugin } from './lib/devApiPlugin';

export default defineConfig({
  plugins: [react(), devApiPlugin()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      external: ['canvg', 'dompurify'],
    },
  },
});
