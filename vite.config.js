import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    server: {
        proxy: {
            '/api/resend': {
                target: 'https://api.resend.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/resend/, ''),
                secure: false
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@services': path.resolve(__dirname, './src/services'),
            '@utils': path.resolve(__dirname, './src/utils'),
            '@components': path.resolve(__dirname, './src/components'),
            '@config': path.resolve(__dirname, './src/config')
        }
    }
});