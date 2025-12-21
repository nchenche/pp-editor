# React + Vite

## Docs-only development (no backend)

If you only want to edit the Documentation page and don’t want to run/install the backend dependencies, you can start the frontend in a “docs-only” mode.

- Install frontend deps: `cd frontend && npm install`
- Start docs-only dev server: `npm run docs`

This uses Vite mode `docs` and reads `VITE_DOCS_ONLY` from `.env.docs`.

In this mode, the app will serve the Documentation page and will redirect all routes to `/documentation`, so backend-dependent pages won’t mount.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh
