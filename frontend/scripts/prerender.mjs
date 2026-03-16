#!/usr/bin/env node
/**
 * Post-build prerender script.
 *
 * Spins up a lightweight static server on the `dist/` folder, then uses
 * Puppeteer to render each route and overwrite the corresponding index.html
 * with the fully-rendered HTML.  This gives search-engine crawlers real
 * content instead of an empty <div id="root">.
 *
 * Usage:  node scripts/prerender.mjs          (runs after `vite build`)
 *         npm run build                       (calls this automatically)
 */

import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

// ── Configuration ───────────────────────────────────────────────────
const ROUTES   = ['/', '/documentation'];
const PORT     = 4936;                       // arbitrary high port
const DIST_DIR = join(fileURLToPath(import.meta.url), '..', '..', 'dist');
const TIMEOUT  = 15_000;                     // max ms to wait per route
// ────────────────────────────────────────────────────────────────────

/** Minimal static file server for the dist/ folder. */
function createStaticServer() {
  const MIME = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.json': 'application/json',
    '.png':  'image/png',
    '.svg':  'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
  };

  return createServer((req, res) => {
    let filePath = join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);

    // SPA fallback: if the file doesn't exist, serve index.html
    if (!existsSync(filePath) || !extname(filePath)) {
      filePath = join(DIST_DIR, 'index.html');
    }

    try {
      const data = readFileSync(filePath);
      const ext  = extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
}

async function prerender() {
  // 1. Start static server
  const server = createStaticServer();
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`  ✓ Static server listening on http://localhost:${PORT}`);

  // 2. Launch headless browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const route of ROUTES) {
      const url  = `http://localhost:${PORT}${route}`;
      const page = await browser.newPage();

      // Wait for the app to fire 'prerender-ready', with a safety timeout
      await page.goto(url, { waitUntil: 'networkidle0', timeout: TIMEOUT });

      // Also wait for the custom event (belt-and-suspenders with networkidle0)
      await page.evaluate((ms) => {
        return new Promise((resolve) => {
          if (document.querySelector('#root')?.children.length > 0) {
            return resolve();            // already rendered
          }
          document.addEventListener('prerender-ready', resolve, { once: true });
          setTimeout(resolve, ms);       // safety fallback
        });
      }, TIMEOUT);

      // 3. Grab the rendered HTML
      const html = await page.content();
      await page.close();

      // 4. Write to dist/<route>/index.html
      const outDir  = join(DIST_DIR, route === '/' ? '' : route);
      const outFile = join(outDir, 'index.html');

      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
      writeFileSync(outFile, html, 'utf-8');

      console.log(`  ✓ Prerendered ${route}  →  ${outFile}`);
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n  Pre-rendering complete.\n');
}

prerender().catch((err) => {
  console.error('Pre-rendering failed:', err);
  // Non-fatal: the build output still works as a normal SPA.
  // Exit 0 so CI/CD pipelines don't break if Chrome isn't available.
  process.exit(0);
});
