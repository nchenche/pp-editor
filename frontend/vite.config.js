import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import vitePrerender from 'vite-plugin-prerender'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_API_BASE_URL || 'http://localhost:5000';

  return {
    base: '/',
    plugins: [
      react(),
      // Pre-render key routes at build time so search-engine crawlers
      // receive real HTML content instead of an empty <div id="root">.
      vitePrerender({
        staticDir: path.join(__dirname, 'dist'),
        routes: ['/', '/documentation'],
        renderer: new vitePrerender.PuppeteerRenderer({
          // Wait until the React app has rendered meaningful content.
          renderAfterDocumentEvent: 'prerender-ready',
          // Fallback timeout in case the event is never fired.
          renderAfterTime: 5000,
          headless: true,
        }),
        postProcess(renderedRoute) {
          // Preserve original route to avoid redirect artefacts.
          renderedRoute.route = renderedRoute.originalRoute;
          return renderedRoute;
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id) return;

            // Split Mol* out aggressively (it dominates bundle size).
            if (id.includes('node_modules/molstar/')) {
              // NOTE: Mol* has some circular dependencies (e.g. mol-data <-> mol-io).
              // Splitting into many chunks can surface runtime init-order issues in production.
              // Keep Mol* in a single chunk to ensure stable evaluation order.
              return 'molstar';
            }

            // Keep MUI together to reduce churn in the main chunk.
            if (id.includes('node_modules/@mui/')) return 'mui';
            if (id.includes('node_modules/@emotion/')) return 'emotion';

            // Split a few other non-trivial vendors out of the entry chunk.
            if (
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/@remix-run/router')
            ) {
              return 'react-router';
            }
            if (
              id.includes('node_modules/@dnd-kit/') ||
              id.includes('node_modules/@hello-pangea/dnd') ||
              id.includes('node_modules/sortablejs')
            ) {
              return 'dnd';
            }
            if (id.includes('node_modules/vis-network') || id.includes('node_modules/vis-data')) {
              return 'vis';
            }
            if (id.includes('node_modules/react-icons')) return 'react-icons';
            if (id.includes('node_modules/flowbite-react') || id.includes('node_modules/@headlessui/react')) {
              return 'ui-widgets';
            }

            // React vendor.
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react-vendor';
          },
        },
      },
    },
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
