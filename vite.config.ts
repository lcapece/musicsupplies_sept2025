import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appVersion = env.VITE_APP_VERSION || Date.now().toString();
  
  return {
  root: '.', // Explicitly set the root directory
  json: {
    // Allow importing package.json for version
    stringify: false
  },
  build: {
    // Generate unique filenames with content hash for cache busting
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`
      }
    },
    // Clear the output directory before building
    emptyOutDir: true,
    // Generate source maps for debugging
    sourcemap: true,
    // Set a unique build ID
    manifest: true,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000
  },
  server: {
    // Add cache headers for development
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically update without user prompt
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Music Supplies',
        short_name: 'MusicSupplies',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        // Version is handled through cache ID and file hashing
      },
      workbox: {
        cleanupOutdatedCaches: true, // Clean old caches
        skipWaiting: true, // Force update immediately
        clientsClaim: true, // Take control of all pages immediately
        // Use version as cache name suffix for automatic cache busting
        cacheId: `music-supplies-${appVersion}`,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/ekklokrukxmqlahtonnc\.supabase\.co\/.*/i,
            handler: 'NetworkFirst', // Try network first for API calls
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
            },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Define environment variables that will be replaced at build time
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://ekklokrukxmqlahtonnc.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k'),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  };
});
