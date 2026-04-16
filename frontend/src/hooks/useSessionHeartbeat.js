import { useCallback, useEffect, useRef } from 'react';
import { getSession } from '../utils/sessionApi';

/**
 * Minimum interval (ms) between two heartbeat touches.
 * Prevents redundant requests when the session was already touched recently
 * (e.g. by useSessionLoader on page load or session switch).
 */
const HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * DOM events considered as "user activity".
 * We only need to know *that* the user is active, not *what* they did.
 */
const ACTIVITY_EVENTS = ['pointerdown', 'keydown'];

/**
 * Session keep-alive hook.
 *
 * Sends `GET /api/db/sessions/<id>?touch=true` periodically while the user
 * is actively interacting with the app.  Designed to prevent silent session
 * expiry for users who edit without triggering endpoints that already touch
 * the session (e.g. conformer generation).
 *
 * Behaviour:
 * - On first user interaction after mount (or after the tab regains focus),
 *   a heartbeat fires immediately if the session hasn't been touched within
 *   the last HEARTBEAT_INTERVAL_MS.
 * - After each successful heartbeat the timer resets and at least one new
 *   user interaction is required before the next heartbeat can fire.
 * - If the heartbeat returns a non-ok result (404 = expired), `onExpired`
 *   is called so the consumer can trigger session recovery.
 * - Network errors are swallowed; the next user interaction will retry.
 * - Heartbeats are paused while the tab is hidden (Page Visibility API).
 *
 * @param {string|null} sessionId   Current session ID (null = disabled).
 * @param {{onExpired?: () => void}} [options]
 */
export function useSessionHeartbeat(sessionId, { onExpired } = {}) {
  // Mutable refs so event listeners always see latest values without re-registering.
  const sessionIdRef = useRef(sessionId);
  const onExpiredRef = useRef(onExpired);
  const lastTouchedRef = useRef(Date.now()); // session is touched at load by useSessionLoader
  const hasActivityRef = useRef(false);
  const timerRef = useRef(null);
  const isSendingRef = useRef(false);

  // Keep refs in sync with props.
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { onExpiredRef.current = onExpired; }, [onExpired]);

  // Reset state when session changes (e.g. new session created).
  useEffect(() => {
    lastTouchedRef.current = Date.now();
    hasActivityRef.current = false;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, [sessionId]);

  /**
   * Actually perform the heartbeat request.
   * Returns `true` if the session is still valid.
   */
  const sendHeartbeat = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid || isSendingRef.current) return true;

    isSendingRef.current = true;
    try {
      const result = await getSession(sid, { touch: true });
      if (result.ok) {
        lastTouchedRef.current = Date.now();
        return true;
      }
      // Session gone (404 or other server rejection).
      onExpiredRef.current?.();
      return false;
    } catch {
      // Network error — silently ignore; next activity will retry.
      return true;
    } finally {
      isSendingRef.current = false;
    }
  }, []);

  /**
   * Schedule the next heartbeat after HEARTBEAT_INTERVAL_MS.
   * The scheduled callback only fires if there has been user activity
   * since the last heartbeat.
   */
  const scheduleNext = useCallback(() => {
    clearTimeout(timerRef.current);
    const elapsed = Date.now() - lastTouchedRef.current;
    const delay = Math.max(0, HEARTBEAT_INTERVAL_MS - elapsed);

    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      if (!hasActivityRef.current) return; // no activity → don't ping
      hasActivityRef.current = false;
      const ok = await sendHeartbeat();
      if (ok) scheduleNext();
    }, delay);
  }, [sendHeartbeat]);

  /**
   * Called on every tracked user interaction.
   * Fires an immediate heartbeat if the interval has elapsed, otherwise
   * just marks that activity occurred so the scheduled callback will fire.
   */
  const onActivity = useCallback(() => {
    if (!sessionIdRef.current) return;

    hasActivityRef.current = true;

    const elapsed = Date.now() - lastTouchedRef.current;
    if (elapsed >= HEARTBEAT_INTERVAL_MS) {
      // Interval already passed — fire immediately.
      hasActivityRef.current = false;
      sendHeartbeat().then((ok) => { if (ok) scheduleNext(); });
    } else if (!timerRef.current) {
      // No timer running yet — schedule one.
      scheduleNext();
    }
    // Otherwise a timer is already scheduled; the activity flag is set.
  }, [sendHeartbeat, scheduleNext]);

  // Attach / detach DOM event listeners and visibility handler.
  useEffect(() => {
    if (!sessionId) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab regained focus — treat as activity so we check immediately
        // if the interval has elapsed while backgrounded.
        onActivity();
      } else {
        // Tab hidden — cancel pending timer to avoid background pings.
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    ACTIVITY_EVENTS.forEach((evt) => document.addEventListener(evt, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => document.removeEventListener(evt, onActivity));
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [sessionId, onActivity]);
}
