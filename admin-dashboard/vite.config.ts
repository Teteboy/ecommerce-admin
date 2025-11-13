import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxy: Forwarding request:', req.method, req.url);
            console.log('Proxy: Original headers keys:', Object.keys(req.headers));
            console.log('Proxy: Full headers:', JSON.stringify(req.headers, null, 2));

            // Check for Authorization header in any case
            const authHeader = req.headers.authorization || req.headers.Authorization;
            if (authHeader) {
              proxyReq.setHeader('Authorization', authHeader);
              console.log('Proxy: Forwarded Authorization header from request');
            } else {
              console.log('Proxy: No Authorization header found in request');
              // For development, try to inject token from a custom approach
              // This is a workaround for the header not being set properly
              try {
                // You could potentially read from a cookie or other mechanism here
                console.log('Proxy: Attempting alternative auth methods...');
              } catch (e) {
                console.log('Proxy: Alternative auth failed');
              }
            }
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Proxy: Response status:', proxyRes.statusCode);
          });
        }
      }
    }
  }
})