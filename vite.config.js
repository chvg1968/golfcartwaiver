import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            '/api': {
                target: 'https://api.resend.com',
                changeOrigin: true,
                secure: true,  // Cambiado a true para producción
                rewrite: (path) => path.replace(/^\/api/, ''),
                configure: (proxy, _options) => {
                    proxy.on('proxyReq', (proxyReq) => {
                        proxyReq.setHeader('Origin', 'https://api.resend.com');
                        proxyReq.setHeader('Authorization', `Bearer ${process.env.VITE_RESEND_API_KEY}`);
                    });
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