'use client';

import { useEffect, useRef, useCallback } from 'react';
import { refreshTokens } from '@/features/auth/actions/refresh-tokens';

/**
 * Hook that refreshes authentication tokens while the user is active
 * Stops refreshing after a period of inactivity
 */
export function useActivityBasedSessionRefresh(
  inactivityTimeoutMs = 2 * 60 * 1000, // Stop refreshing after 2 minutes of inactivity
  refreshIntervalMs = 3 * 60 * 1000, // Refresh every 3 minutes when active
) {
  // 1. Track when the user last interacted with the app
  const lastActivityRef = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 2. Update the last activity timestamp whenever user interaction occurs
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    // 3. Create an AbortController to manage event listeners
    const controller = new AbortController();
    const signal = controller.signal;

    // 4. Common user interactions to track for activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    // 5. Set up listeners for all activity events with the signal
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, {
        passive: true,
        signal,
      });
    });

    // 6. Periodically check if user has been active recently
    timeoutRef.current = setInterval(async () => {
      const now = Date.now();

      // 7. Only refresh tokens if user was active within the inactivity window
      if (now - lastActivityRef.current < inactivityTimeoutMs) {
        await refreshTokens();
      }
    }, refreshIntervalMs);

    // 8. Clean up by aborting all listeners and clearing interval
    return () => {
      controller.abort();
      if (timeoutRef.current) clearInterval(timeoutRef.current);
    };
  }, [handleActivity, inactivityTimeoutMs, refreshIntervalMs]);
}
