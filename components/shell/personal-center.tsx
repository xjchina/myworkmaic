'use client';

import Link from 'next/link';
import { useSessionStore } from '@/lib/store/session';
import type { NavKey } from './app-shell';
import styles from './app-shell.module.css';

function maskPhone(phone: string): string {
  if (phone.length !== 11) return phone || '未登录';
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
}

export function PersonalCenter({ activeKey }: { activeKey: NavKey }) {
  const isLoggedIn = useSessionStore((s) => s.isLoggedIn);
  const displayName = useSessionStore((s) => s.displayName);
  const userPhone = useSessionStore((s) => s.userPhone);
  const logout = useSessionStore((s) => s.logout);

  const menuItems = [
    { href: '/account', label: isLoggedIn ? '👤 账号管理' : '🔐 登录 / 注册', active: activeKey === 'account' },
    { href: '/knowledge-tree', label: '🌳 知识树', active: activeKey === 'knowledge' },
    { href: '/mistakes', label: '📒 错题本', active: activeKey === 'mistakes' },
    { href: '/messages', label: '🔔 消息', active: activeKey === 'messages' },
  ];

  return (
    <div className={styles.user}>
      <div className={styles.avatar}>{isLoggedIn ? (displayName?.slice(0, 1) ?? '我') : '未'}</div>
      <div className={styles.userText}>
        <div className={styles.userName}>{isLoggedIn ? displayName || '学员' : '个人中心'}</div>
        <div className={styles.userStatus}>{isLoggedIn ? maskPhone(userPhone) : '登录 / 注册'}</div>
      </div>
      <div className={styles.userMenu}>
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.userMenuItem} ${item.active ? styles.userMenuItemActive : ''}`}
          >
            {item.label}
          </Link>
        ))}
        {isLoggedIn ? (
          <button type="button" className={styles.userMenuButton} onClick={logout}>
            退出登录
          </button>
        ) : null}
      </div>
    </div>
  );
}

