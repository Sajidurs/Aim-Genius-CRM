import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on both IPv4 and IPv6. Vite's default binds only IPv6 [::1] on
    // Windows, so browsers that resolve localhost to 127.0.0.1 get a refused
    // connection and a blank page. This also exposes the dev server on the
    // local network, which is what makes testing from a phone possible.
    host: true,
    port: 5173,
    // Fail loudly instead of silently moving to 5174 when the port is taken,
    // which otherwise leaves two servers running and the wrong one open.
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
