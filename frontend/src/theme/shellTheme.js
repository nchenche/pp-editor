/**
 * Centralized "shell" / "chrome" theme tokens.
 *
 * Everything outside the main content panels (header, body gap between panels,
 * footer, resize bars) shares a unified palette derived from these values.
 *
 * Two variants are provided — `dark` and `light`.
 * The active palette is chosen at runtime via the ShellThemeProvider context.
 * To re-skin either variant, edit ONLY this file.
 *
 * Inner panels (Paper, editors, viewers, sidebar) remain on MUI's default
 * background.paper (#fff in light mode) and are NOT affected.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Dark variant  (slate-800 family — the "new" look)
// ─────────────────────────────────────────────────────────────────────────────
export const dark = Object.freeze({
  mode: 'dark',

  // Backgrounds
  bg:        '#1e293b',   // slate-800 — primary
  bgLight:   '#273548',   // slightly lighter
  bgHover:   '#334155',   // slate-700

  // Text
  text:         '#e2e8f0', // slate-200
  textMuted:    '#94a3b8', // slate-400
  textDisabled: '#64748b', // slate-500

  // Borders
  border: 'rgba(148,163,184,0.25)',

  // Resize / separator bars
  resizeBar:       'rgba(148,163,184,0.35)',
  resizeBarHover:  'rgba(148,163,184,0.65)',
  resizeBarActive: '#60a5fa', // blue-400

  // Interactive
  accent:       '#93c5fd', // blue-300
  hoverOverlay: 'rgba(255,255,255,0.07)',

  // Header — same as bg in dark mode
  headerBg: '#1e293b',
  headerText: '#ffffff',
});


// ─────────────────────────────────────────────────────────────────────────────
// Light variant  (slate-100 family — the "original" look)
// ─────────────────────────────────────────────────────────────────────────────
export const light = Object.freeze({
  mode: 'light',

  // Backgrounds
  bg:        '#f1f5f9',   // slate-100 — soft neutral
  bgLight:   '#e2e8f0',   // slate-200
  bgHover:   '#cbd5e1',   // slate-300

  // Text
  text:         '#1e293b', // slate-800
  textMuted:    '#475569', // slate-600
  textDisabled: '#94a3b8', // slate-400

  // Borders
  border: 'rgba(0,0,0,0.12)',

  // Resize / separator bars
  resizeBar:       'rgba(0,0,0,0.15)',
  resizeBarHover:  'rgba(0,0,0,0.35)',
  resizeBarActive: '#3b82f6', // blue-500

  // Interactive
  accent:       '#2563eb', // blue-600
  hoverOverlay: 'rgba(0,0,0,0.04)',

  // Header — keeps its dark brand color in both modes
  headerBg: '#1e293b',
  headerText: '#ffffff',
});


// ─────────────────────────────────────────────────────────────────────────────
// Static default — backwards-compat for any file that still uses
//   `import shell from '…/shellTheme'` without the context hook.
// ─────────────────────────────────────────────────────────────────────────────
export default dark;
