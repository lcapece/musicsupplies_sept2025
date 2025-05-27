import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  root: '.', // Explicitly set the root directory
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
