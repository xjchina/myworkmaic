'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/lib/store/settings';

/**
 * Fetches server-configured providers on mount and merges into settings store.
 * Renders nothing — purely a side-effect component.
 */
export function ServerProvidersInit() {
  const fetchServerProviders = useSettingsStore((state) => state.fetchServerProviders);

  useEffect(() => {
    void fetchServerProviders();

    const onFocus = () => {
      void fetchServerProviders();
    };
    window.addEventListener('focus', onFocus);

    const timer = window.setInterval(() => {
      void fetchServerProviders();
    }, 60_000);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [fetchServerProviders]);

  return null;
}
