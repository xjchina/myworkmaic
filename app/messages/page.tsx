'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';
import styles from './messages.module.css';

type MessageCategory = 'all' | 'system' | 'learning' | 'security' | 'membership' | 'activity';
type MessageBox = 'announcement' | 'personal';

interface MessageItem {
  id: string;
  category: Exclude<MessageCategory, 'all'>;
  title: string;
  content: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

const CATEGORY_LABELS: Record<MessageCategory, string> = {
  all: '全部',
  system: '系统通知',
  learning: '学习进度',
  security: '账号安全',
  membership: '会员权益',
  activity: '活动公告',
};

const CATEGORY_BADGE_STYLE: Record<Exclude<MessageCategory, 'all'>, CSSProperties> = {
  system: { background: '#e0f2fe', color: '#0369a1' },
  learning: { background: '#dcfce7', color: '#166534' },
  security: { background: '#fee2e2', color: '#b91c1c' },
  membership: { background: '#ede9fe', color: '#5b21b6' },
  activity: { background: '#fff7ed', color: '#c2410c' },
};

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('zh-CN', { hour12: false });
}

export default function MessagesPage() {
  const { isLoggedIn, sessionChecked } = useAuthGuard();
  const [messageBox, setMessageBox] = useState<MessageBox>('announcement');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<MessageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [category, setCategory] = useState<MessageCategory>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total]);

  const loadMessages = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      params.set('box', messageBox);
      if (messageBox === 'announcement') {
        params.set('category', 'activity');
      } else {
        params.set('category', category);
      }
      if (unreadOnly) params.set('unreadOnly', '1');

      const res = await fetch(`/api/messages?${params.toString()}`);
      const json = (await res.json()) as {
        success?: boolean;
        data?: {
          items?: MessageItem[];
          total?: number;
        };
      };

      if (!res.ok || !json.success) {
        setItems([]);
        setTotal(0);
        return;
      }

      const nextItems = Array.isArray(json.data?.items) ? json.data?.items : [];
      setItems(nextItems as MessageItem[]);
      setTotal(Number(json.data?.total ?? 0));
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [category, isLoggedIn, messageBox, page, pageSize, unreadOnly]);

  useEffect(() => {
    if (!sessionChecked) return;
    void loadMessages();
  }, [loadMessages, sessionChecked]);

  const markRead = async (id: string) => {
    setSubmitting(true);
    try {
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await loadMessages();
    } finally {
      setSubmitting(false);
    }
  };

  const markAllRead = async () => {
    setSubmitting(true);
    try {
      await fetch('/api/messages/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: messageBox === 'announcement' ? 'activity' : category }),
      });
      await loadMessages();
    } finally {
      setSubmitting(false);
    }
  };

  const removeMessage = async (id: string) => {
    setSubmitting(true);
    try {
      await fetch(`/api/messages/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await loadMessages();
    } finally {
      setSubmitting(false);
    }
  };

  if (!sessionChecked || !isLoggedIn) return null;

  return (
    <AppShell activeKey="messages" title="消息" description="系统通知、学习提醒与账号动态">
      <div className={styles.wrapper}>
        <div className={styles.toolbar}>
          <div className={styles.categoryTabs}>
            <button
              type="button"
              className={`${styles.tab} ${messageBox === 'announcement' ? styles.tabActive : ''}`}
              onClick={() => {
                setPage(1);
                setCategory('all');
                setMessageBox('announcement');
              }}
              disabled={submitting}
            >
              公告
            </button>
            <button
              type="button"
              className={`${styles.tab} ${messageBox === 'personal' ? styles.tabActive : ''}`}
              onClick={() => {
                setPage(1);
                setMessageBox('personal');
              }}
              disabled={submitting}
            >
              我的消息
            </button>
          </div>

          {messageBox === 'personal' ? (
          <div className={styles.categoryTabs}>
            {(Object.keys(CATEGORY_LABELS) as MessageCategory[])
              .filter((key) => key !== 'activity')
              .map((key) => (
              <button
                key={key}
                type="button"
                className={`${styles.tab} ${category === key ? styles.tabActive : ''}`}
                onClick={() => {
                  setPage(1);
                  setCategory(key);
                }}
                disabled={submitting}
              >
                {CATEGORY_LABELS[key]}
              </button>
            ))}
          </div>
          ) : null}

          <div className={styles.toolbarActions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => {
                setPage(1);
                setUnreadOnly((v) => !v);
              }}
              disabled={submitting}
            >
              {unreadOnly ? '显示全部' : '仅看未读'}
            </button>
            <button type="button" className={styles.btn} onClick={() => void markAllRead()} disabled={submitting}>
              全部已读
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.empty}>消息加载中...</div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>暂无消息</div>
        ) : (
          <div className={styles.list}>
            {items.map((item) => (
              <article className={styles.item} key={item.id}>
                <div className={styles.itemHeader}>
                  <span className={styles.categoryBadge} style={CATEGORY_BADGE_STYLE[item.category]}>
                    {CATEGORY_LABELS[item.category]}
                  </span>
                  {!item.isRead ? <span className={styles.unreadDot} /> : null}
                  <div className={styles.title}>{item.title}</div>
                  <span className={styles.time}>{formatTime(item.createdAt)}</span>
                </div>

                <div className={styles.content}>{item.content}</div>

                <div className={styles.itemActions}>
                  {!item.isRead ? (
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={() => void markRead(item.id)}
                      disabled={submitting}
                    >
                      标记已读
                    </button>
                  ) : null}
                  {item.actionUrl ? (
                    <Link href={item.actionUrl} className={styles.btn}>
                      查看详情
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => void removeMessage(item.id)}
                    disabled={submitting}
                  >
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.btn}
            disabled={submitting || page <= 1}
            onClick={() => setPage((v) => Math.max(1, v - 1))}
          >
            上一页
          </button>
          <span className={styles.pageText}>
            第 {page} / {totalPages} 页 · 共 {total} 条
          </span>
          <button
            type="button"
            className={styles.btn}
            disabled={submitting || page >= totalPages}
            onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
          >
            下一页
          </button>
        </div>
      </div>
    </AppShell>
  );
}
