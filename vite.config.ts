import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // API_KEY will be accessed at runtime from window or process.env in the browser
        // Only inject if it exists in development mode
        'process.env.API_KEY': JSON.stringify(mode === 'development' ? env.GEMINI_API_KEY || '' : ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
