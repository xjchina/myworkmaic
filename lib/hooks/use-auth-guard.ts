'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/session';

type AuthGuardOptions = {
  requirePhoneBound?: boolean;
};

export function useAuthGuard(
  redirectTo = '/login',
  options: AuthGuardOptions = {},
) {
  const router = useRouter();
  const pathname = usePathname();
  const sessionChecked = useSessionStore((s) => s.sessionChecked);
  const isLoggedIn = useSessionStore((s) => s.isLoggedIn);
  const isPhoneBound = useSessionStore((s) => s.isPhoneBound);
  const requirePhoneBound = options.requirePhoneBound ?? true;

  useEffect(() => {
    if (!sessionChecked) return;

    if (!isLoggedIn) {
      router.replace(redirectTo);
      return;
    }

    if (requirePhoneBound && !isPhoneBound && pathname !== '/bind-phone') {
      const next = pathname || '/';
      router.replace(`/bind-phone?next=${encodeURIComponent(next)}`);
    }
  }, [
    sessionChecked,
    isLoggedIn,
    isPhoneBound,
    pathname,
    redirectTo,
    requirePhoneBound,
    router,
  ]);

  return { sessionChecked, isLoggedIn, isPhoneBound };
}
