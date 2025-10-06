import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost', // use 'localhost' for development
    port: 5174 // you can change this if needed
  },
  optimizeDeps: {
    exclude: ['molstar'],
    include: ["molstar/lib/mol-plugin-ui"],
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
})
