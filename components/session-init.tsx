'use client';

import { useEffect } from 'react';
import { useSessionStore } from '@/lib/store/session';

/**
 * Initializes user session from server-side cookie on app load.
 * Place once in the root layout.
 */
export function SessionInit() {
  const refreshSession = useSessionStore((s) => s.refreshSession);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  return null;
}
