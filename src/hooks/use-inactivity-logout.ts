import { useEffect, useRef, useCallback } from 'react';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
];

/**
 * Automatically calls `onLogout` after the user has been inactive
 * (no mouse / keyboard / touch / scroll) for the configured timeout.
 *
 * Only active when `enabled` is true (i.e. user is authenticated).
 */
export function useInactivityLogout(onLogout: () => void, enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLogoutRef = useRef(onLogout);

  // Keep the callback ref fresh without re-registering listeners
  useEffect(() => {
    onLogoutRef.current = onLogout;
  }, [onLogout]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      console.log('[AUTH] User inactive for 30 minutes — logging out');
      onLogoutRef.current();
    }, INACTIVITY_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Not logged in — nothing to track
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Start the initial timer
    resetTimer();

    // Reset on any user activity
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [enabled, resetTimer]);
}
