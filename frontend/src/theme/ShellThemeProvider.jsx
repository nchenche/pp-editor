import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { dark, light } from './shellTheme';

// ─── Constants ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'pp-editor:shell-mode:v1';
const PALETTES = { dark, light };
const VALID_MODES = Object.keys(PALETTES);

function readStoredMode() {
  try {
    const v = window?.localStorage?.getItem(STORAGE_KEY);
    return VALID_MODES.includes(v) ? v : null;
  } catch {
    return null;
  }
}

// ─── Context ───────────────────────────────────────────────────────────────
const ShellThemeCtx = createContext(null);

/**
 * Provides the active shell palette and a toggle function to every descendant.
 *
 * Wrap your app (e.g. inside <Router>) with:
 *   <ShellThemeProvider defaultMode="dark">…</ShellThemeProvider>
 *
 * Then consume with:
 *   const { shell, mode, toggleMode, setMode } = useShellTheme();
 */
export function ShellThemeProvider({ defaultMode = 'dark', children }) {
  const [mode, setModeRaw] = useState(() => readStoredMode() || defaultMode);

  // Apply body background via CSS custom property so it's instant (no FOUC)
  useEffect(() => {
    const palette = PALETTES[mode] || dark;
    document.body.style.backgroundColor = palette.bg;
    // Persist
    try { window?.localStorage?.setItem(STORAGE_KEY, mode); } catch { /* noop */ }
  }, [mode]);

  const setMode = useCallback((m) => {
    if (VALID_MODES.includes(m)) setModeRaw(m);
  }, []);

  const toggleMode = useCallback(() => {
    setModeRaw((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const shell = PALETTES[mode] || dark;

  const value = useMemo(() => ({ shell, mode, setMode, toggleMode }), [shell, mode, setMode, toggleMode]);

  return (
    <ShellThemeCtx.Provider value={value}>
      {children}
    </ShellThemeCtx.Provider>
  );
}

/**
 * Hook to consume the active shell palette.
 *
 * Returns `{ shell, mode, toggleMode, setMode }`.
 * - `shell` — the active palette object (same shape as the old default export)
 * - `mode`  — `'dark'` | `'light'`
 * - `toggleMode()` — flip between dark ↔ light
 * - `setMode(m)` — set explicitly
 */
export function useShellTheme() {
  const ctx = useContext(ShellThemeCtx);
  if (!ctx) {
    // Fallback when used outside provider (e.g. tests or lazy-loaded chunks)
    return { shell: dark, mode: 'dark', toggleMode: () => {}, setMode: () => {} };
  }
  return ctx;
}
