import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_API_BASE_URL || 'http://localhost:5000';

  return {
    base: '/',
    plugins: [react()],
    server: {
      host: 'localhost', // use 'localhost' for development
      port: 5174, // you can change this if needed
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/download': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    optimizeDeps: {
      exclude: ['molstar'],
      include: ['molstar/lib/mol-plugin-ui'],
    },
    // commonjsOptions: {
    //   requireReturnsDefault: "auto"
    // }
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./test/setup.js'],
      include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
      coverage: {
        reporter: ['text', 'html'],
        reportsDirectory: './coverage',
        include: ['src/**/*.js', 'src/**/*.jsx'],
      },
    },
  };
});
