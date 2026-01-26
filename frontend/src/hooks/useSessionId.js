import { useEffect, useState } from 'react';

import {
  getSessionId,
  SESSION_ID_CHANGED_EVENT,
  SESSION_ID_STORAGE_KEY,
} from '../utils/sessionApi';

/**
 * Hook that provides the current session ID and reacts to changes.
 *
 * The session ID is used for:
 * - Conformer job scoping (session_id query param)
 * - Monomer personal endpoints (as owner_id, since session_id == owner_id)
 * - LocalStorage scoping for persisted state
 *
 * @returns {string|null} The current session ID, or null if not set.
 */
export function useSessionId() {
  const [sessionId, setSessionId] = useState(() => getSessionId());

  useEffect(() => {
    const update = () => setSessionId(getSessionId());

    // Listen for programmatic changes within this tab
    window.addEventListener(SESSION_ID_CHANGED_EVENT, update);

    // Cross-tab updates via localStorage
    const onStorage = (e) => {
      if (e?.key === SESSION_ID_STORAGE_KEY) update();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(SESSION_ID_CHANGED_EVENT, update);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return sessionId;
}
