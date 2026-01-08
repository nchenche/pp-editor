import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_API_BASE_URL || 'http://localhost:5000';

  return {
    base: '/',
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id) return;

            // Split Mol* out aggressively (it dominates bundle size).
            if (id.includes('node_modules/molstar/')) {
              if (id.includes('/extensions/')) return 'molstar-extensions';
              if (id.includes('/mol-plugin-ui/')) return 'molstar-ui';
              if (id.includes('/mol-plugin-state/')) return 'molstar-plugin-state';
              if (id.includes('/mol-plugin/')) return 'molstar-plugin';
              if (id.includes('/mol-model/')) return 'molstar-model';
              if (id.includes('/mol-model-formats/')) return 'molstar-model-formats';
              if (id.includes('/mol-model-props/')) return 'molstar-model-props';
              if (id.includes('/mol-repr/')) return 'molstar-repr';
              if (id.includes('/mol-script/')) return 'molstar-script';
              if (id.includes('/mol-canvas3d/')) return 'molstar-canvas3d';
              if (id.includes('/mol-gl/')) return 'molstar-gl';
              if (id.includes('/mol-geo/')) return 'molstar-geo';
              if (id.includes('/mol-data/')) return 'molstar-data';
              if (id.includes('/mol-math/')) return 'molstar-math';
              if (id.includes('/mol-io/')) return 'molstar-io';
              if (id.includes('/mol-state/')) return 'molstar-state';
              if (id.includes('/mol-theme/')) return 'molstar-theme';
              if (id.includes('/mol-task/')) return 'molstar-task';
              if (id.includes('/mol-util/')) return 'molstar-util';
              return 'molstar-core';
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
