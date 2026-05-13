import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { PersonalCenter } from './personal-center';
import styles from './app-shell.module.css';

export type NavKey =
  | 'home'
  | 'classroom'
  | 'exercise'
  | 'roundtable'
  | 'knowledge'
  | 'knowledge-tree'
  | 'pdf-tools'
  | 'mistakes'
  | 'messages'
  | 'account'
  | 'subscribe'
  | 'login'
  | 'register';

const navIconStyle: Record<NavKey, CSSProperties> = {
  home: { background: 'rgba(102,126,234,0.2)' },
  classroom: { background: 'rgba(102,126,234,0.2)' },
  exercise: { background: 'rgba(236,72,153,0.2)' },
  roundtable: { background: 'rgba(245,158,11,0.2)' },
  knowledge: { background: 'rgba(16,185,129,0.2)' },
  'knowledge-tree': { background: 'rgba(16,185,129,0.2)' },
  'pdf-tools': { background: 'rgba(14,165,233,0.2)' },
  mistakes: { background: 'rgba(239,68,68,0.2)' },
  messages: { background: 'rgba(249,115,22,0.2)' },
  account: { background: 'rgba(99,102,241,0.2)' },
  subscribe: { background: 'rgba(245,158,11,0.2)' },
  login: { background: 'rgba(99,102,241,0.2)' },
  register: { background: 'rgba(16,185,129,0.2)' },
};

function NavItem({
  href,
  icon,
  label,
  active,
  iconKey,
  badge,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
  iconKey: NavKey;
  badge?: string;
}) {
  return (
    <Link href={href} className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}>
      <div className={styles.navIcon} style={navIconStyle[iconKey]}>
        {icon}
      </div>
      <span className={styles.navItemLabel}>{label}</span>
      {badge ? <span className={styles.badge}>{badge}</span> : null}
    </Link>
  );
}

export function AppShell({
  activeKey,
  title,
  description,
  actions,
  children,
}: {
  activeKey: NavKey;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoIcon}>学</div>
            <span className={styles.logoText}>纸忆</span>
          </Link>

          <nav className={styles.topNav}>
            <NavItem href="/" icon="🏠" label="首页" iconKey="home" active={activeKey === 'home'} />
            <NavItem
              href="/classroom"
              icon="📘"
              label="教案课堂"
              iconKey="classroom"
              active={activeKey === 'classroom'}
            />
            <NavItem
              href="/exercise"
              icon="📝"
              label="互动练习"
              iconKey="exercise"
              active={activeKey === 'exercise'}
            />
            <NavItem
              href="/roundtable"
              icon="💬"
              label="圆桌讨论"
              iconKey="roundtable"
              active={activeKey === 'roundtable'}
            />
            <NavItem
              href="/knowledge-select"
              icon="🌌"
              label="知识宇宙"
              iconKey="knowledge"
              active={activeKey === 'knowledge'}
            />
            <NavItem
              href="/pdf-tools"
              icon="📄"
              label="PDF 工具"
              iconKey="pdf-tools"
              active={activeKey === 'pdf-tools'}
            />
          </nav>

          <PersonalCenter activeKey={activeKey} />
        </div>
      </header>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>{title}</h1>
            {description ? <p className={styles.desc}>{description}</p> : null}
          </div>
          {actions ? <div className={styles.headerActions}>{actions}</div> : null}
        </header>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
