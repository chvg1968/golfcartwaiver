import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    server: {
        proxy: {
            '/api': {
                target: 'https://api.resend.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
                secure: false,
                configure: (proxy, _options) => {
                    proxy.on('proxyReq', (proxyReq, req) => {
                        console.log('Enviando solicitud:', req.method, req.url);
                    });
                }
            },
            '/email-api': {
                target: 'https://api.resend.com',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/email-api/, ''),
                configure: (proxy, _options) => {
                    proxy.on('proxyReq', (proxyReq, req) => {
                        proxyReq.setHeader('Origin', 'https://api.resend.com');
                    });
                }
            }
        }
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        minify: true
      }
});