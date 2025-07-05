import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    global: 'globalThis',
    'process.env': {},
    'process.versions': {
      node: '18.0.0'
    },
    'process.platform': '"browser"',
    'process.nextTick': 'setTimeout'
  }
});