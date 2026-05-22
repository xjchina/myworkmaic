'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@/lib/store/session';
import type { NavKey } from './app-shell';
import styles from './app-shell.module.css';

function maskPhone(phone: string): string {
  if (!phone || phone.length !== 11) return '未绑定';
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
}

export function PersonalCenter({ activeKey }: { activeKey: NavKey }) {
  const isLoggedIn = useSessionStore((s) => s.isLoggedIn);
  const displayName = useSessionStore((s) => s.displayName);
  const userPhone = useSessionStore((s) => s.userPhone);
  const isPhoneBound = useSessionStore((s) => s.isPhoneBound);
  const isAdmin = useSessionStore((s) => s.isAdmin);
  const logout = useSessionStore((s) => s.logout);

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/messages/unread-count');
        if (!res.ok) return;
        const data = (await res.json()) as { unreadCount?: number };
        if (mounted) setUnreadCount(Math.max(0, Number(data.unreadCount ?? 0)));
      } catch {
        // ignore
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [isLoggedIn]);

  const menuItems = [
    {
      href: isLoggedIn ? '/account' : '/login',
      label: isLoggedIn ? '账号管理' : '登录',
      icon: '👤',
      active: activeKey === 'account' || activeKey === 'login',
    },
    { href: '/subscribe', label: '我的会员', icon: '💎', active: activeKey === 'subscribe' },
    { href: '/knowledge-tree', label: '知识树', icon: '🌳', active: activeKey === 'knowledge-tree' },
    { href: '/mistakes', label: '错题本', icon: '📘', active: activeKey === 'mistakes' },
    {
      href: '/messages',
      label: '消息',
      icon: '🔔',
      active: activeKey === 'messages',
      badge: unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : '',
    },
  ];

  if (isAdmin) {
    menuItems.splice(1, 0, {
      href: '/admin/messages',
      label: '管理员消息',
      icon: '🛠️',
      active: activeKey === 'admin-messages',
      badge: '',
    });
  }

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`${styles.user} ${open ? styles.userMenuOpen : ''}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className={styles.userTrigger}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className={styles.avatar}>{isLoggedIn ? displayName?.slice(0, 1) || '学' : '未'}</div>
        <div className={styles.userText}>
          <div className={styles.userName}>{isLoggedIn ? displayName || '学员' : '个人中心'}</div>
          <div className={styles.userStatus}>
            {isLoggedIn ? (isPhoneBound ? maskPhone(userPhone) : '未绑定手机号') : '点击登录'}
          </div>
        </div>
        <svg
          className={`${styles.userChevron} ${open ? styles.userChevronOpen : ''}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div className={`${styles.userMenu} ${open ? styles.userMenuVisible : ''}`} role="menu">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.userMenuItem} ${item.active ? styles.userMenuItemActive : ''}`}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.badge ? <span className={styles.userMenuBadge}>{item.badge}</span> : null}
          </Link>
        ))}
        {isLoggedIn ? (
          <button
            type="button"
            className={styles.userMenuButton}
            onClick={() => {
              void logout();
              setOpen(false);
            }}
            role="menuitem"
          >
            退出登录
          </button>
        ) : null}
      </div>
    </div>
  );
}
