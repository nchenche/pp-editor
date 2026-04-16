import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getSessionId,
  getSessionIdFromUrl,
  clearSessionIdFromUrl,
  setSessionIdInStorage,
  clearSessionIdFromStorage,
  getSession,
  createSession,
} from '../utils/sessionApi';

import { clearConformerJobIdFromStorage } from '../utils/conformerJobStorage';

// localStorage keys for scaffold/template state that must be cleared on session expiry.
// These are defined in useScaffoldTemplate.js and useScaffoldMappings.js respectively,
// but we reference the raw strings here to avoid circular hook imports.
const SCAFFOLD_TEMPLATE_STORAGE_KEY = 'pp-editor:scaffold-template:v1';
const SCAFFOLD_MAPPINGS_STORAGE_KEY = 'pp-editor:scaffold-mappings:v1';
const CONSTRAINT_MODE_STORAGE_KEY = 'pp-editor:constraints-mode:v1';
const DESIGN_STORAGE_KEY = 'design-peptide-v1';

/**
 * Session loading states.
 */
export const SESSION_LOAD_STATE = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
};

/**
 * Hook that handles automatic session loading/creation on Design page entry.
 *
 * Load order:
 * 1. URL `?session_id=...` → validate via GET /api/db/sessions/<id>
 *    - 200 → adopt + persist to localStorage + clear from URL
 *    - 404 → show error, offer to create new
 * 2. localStorage session_id → validate (touch)
 *    - 200 → use
 *    - 404 → treat as stale, clear + create new
 * 3. No session → auto-create new
 *    - success → store + use
 *    - error → show blocking error with retry
 *
 * @returns {{
 *   sessionId: string|null,
 *   loadState: string,
 *   error: string|null,
 *   retry: () => void,
 *   createNewSession: () => Promise<void>,
 *   switchToSession: (id: string) => Promise<{ok: boolean, error?: string}>,
 * }}
 */
export function useSessionLoader() {
  const [sessionId, setSessionId] = useState(() => getSessionId());
  const [loadState, setLoadState] = useState(SESSION_LOAD_STATE.IDLE);
  const [error, setError] = useState(null);
  const [wasExpired, setWasExpired] = useState(false);

  // Track if we've done initial load
  const initialLoadDone = useRef(false);

  const loadSession = useCallback(async () => {
    setLoadState(SESSION_LOAD_STATE.LOADING);
    setError(null);

    try {
      // Priority 1: URL param
      const urlSessionId = getSessionIdFromUrl();
      if (urlSessionId) {
        const result = await getSession(urlSessionId, { touch: true });
        if (result.ok) {
          // Valid session from URL - adopt it
          setSessionIdInStorage(urlSessionId);
          clearSessionIdFromUrl();
          setSessionId(urlSessionId);
          setLoadState(SESSION_LOAD_STATE.READY);
          return;
        } else {
          // URL session is invalid/expired
          clearSessionIdFromUrl();
          setError(`Session from URL not found or expired. You can create a new session.`);
          setLoadState(SESSION_LOAD_STATE.ERROR);
          return;
        }
      }

      // Priority 2: localStorage
      const storedSessionId = getSessionId();
      if (storedSessionId) {
        const result = await getSession(storedSessionId, { touch: true });
        if (result.ok) {
          // Valid stored session
          setSessionId(storedSessionId);
          setLoadState(SESSION_LOAD_STATE.READY);
          return;
        } else {
          // Stored session is stale - clear it and all associated client-side state
          // so the user doesn't get stuck with stale template/scaffold/job references.
          clearConformerJobIdFromStorage({ sessionId: storedSessionId });
          try {
            window?.localStorage?.removeItem(SCAFFOLD_TEMPLATE_STORAGE_KEY);
            window?.localStorage?.removeItem(SCAFFOLD_MAPPINGS_STORAGE_KEY);
            window?.localStorage?.removeItem(CONSTRAINT_MODE_STORAGE_KEY);
            window?.localStorage?.removeItem(DESIGN_STORAGE_KEY);
          } catch { /* ignore */ }
          clearSessionIdFromStorage();
          // Flag that the previous session expired so the UI can inform the user.
          setWasExpired(true);
        }
      }

      // Priority 3: Create new session
      const createResult = await createSession();
      if (createResult.ok && createResult.sessionId) {
        setSessionIdInStorage(createResult.sessionId);
        setSessionId(createResult.sessionId);
        setLoadState(SESSION_LOAD_STATE.READY);
        return;
      } else {
        setError(createResult.error || 'Failed to create session. Please try again.');
        setLoadState(SESSION_LOAD_STATE.ERROR);
      }
    } catch (e) {
      setError(e?.message || 'Unexpected error loading session.');
      setLoadState(SESSION_LOAD_STATE.ERROR);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    loadSession();
  }, [loadSession]);

  // Retry function
  const retry = useCallback(() => {
    initialLoadDone.current = false;
    loadSession();
  }, [loadSession]);

  // Create a new session (for "Start new session" action)
  const createNewSession = useCallback(async () => {
    setLoadState(SESSION_LOAD_STATE.LOADING);
    setError(null);

    try {
      const createResult = await createSession();
      if (createResult.ok && createResult.sessionId) {
        setSessionIdInStorage(createResult.sessionId);
        setSessionId(createResult.sessionId);
        setLoadState(SESSION_LOAD_STATE.READY);
      } else {
        setError(createResult.error || 'Failed to create session.');
        setLoadState(SESSION_LOAD_STATE.ERROR);
      }
    } catch (e) {
      setError(e?.message || 'Unexpected error creating session.');
      setLoadState(SESSION_LOAD_STATE.ERROR);
    }
  }, []);

  // Switch to a different session (validate first)
  const switchToSession = useCallback(async (newSessionId) => {
    if (!newSessionId || !String(newSessionId).trim()) {
      return { ok: false, error: 'Session ID is required' };
    }

    const id = String(newSessionId).trim();

    // If same as current, just succeed
    if (id === sessionId) {
      return { ok: true };
    }

    setLoadState(SESSION_LOAD_STATE.LOADING);
    setError(null);

    try {
      const result = await getSession(id, { touch: true });
      if (result.ok) {
        setSessionIdInStorage(id);
        setSessionId(id);
        setLoadState(SESSION_LOAD_STATE.READY);
        return { ok: true };
      } else {
        setLoadState(SESSION_LOAD_STATE.READY); // Keep current session
        return { ok: false, error: result.error || 'Session not found or expired' };
      }
    } catch (e) {
      setLoadState(SESSION_LOAD_STATE.READY); // Keep current session
      return { ok: false, error: e?.message || 'Failed to validate session' };
    }
  }, [sessionId]);

  const acknowledgeExpiry = useCallback(() => setWasExpired(false), []);

  return {
    sessionId,
    loadState,
    error,
    wasExpired,
    acknowledgeExpiry,
    retry,
    createNewSession,
    switchToSession,
  };
}
