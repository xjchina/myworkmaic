'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/session';

/**
 * 在受保护页面的顶部调用此 hook。
 * 若用户未登录，立即用 router.replace(redirectTo) 跳转，并返回 isLoggedIn = false。
 * 调用方在 isLoggedIn 为 false 时应 return null 以防止受保护内容闪烁。
 *
 * @example
 * const { isLoggedIn } = useAuthGuard();
 * if (!isLoggedIn) return null;
 */
export function useAuthGuard(redirectTo = '/login') {
  const router = useRouter();
  const isLoggedIn = useSessionStore((s) => s.isLoggedIn);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace(redirectTo);
    }
  }, [isLoggedIn, router, redirectTo]);

  return { isLoggedIn };
}
