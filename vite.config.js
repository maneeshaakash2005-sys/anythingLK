import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Raise the warning threshold slightly — the supabase + react vendor
    // chunk is intentionally large; we split it below.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Stable vendor chunks — long cache lifetime in browsers & CDN
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-chart': ['chart.js', 'react-chartjs-2'],
          'vendor-toast': ['react-hot-toast'],
        },
      },
    },
  },
});
