import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    server: {
        proxy: {
            '/api': {
                target: 'https://api.resend.com',
                changeOrigin: true,
                secure: process.env.NODE_ENV === 'production',
                rewrite: (path) => path.replace(/^\/api/, ''),
                configure: (proxy, _options) => {
                    if (process.env.NODE_ENV !== 'production') {
                        proxy.on('proxyReq', (proxyReq, req) => {
                            console.log('Enviando solicitud:', req.method, req.url);
                        });
                    }
                }
            }
        }
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        minify: true,
        rollupOptions: {
            output: {
                manualChunks: undefined
            }
        }
    }
});