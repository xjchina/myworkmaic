'use client';

import { useState } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';
import { useSessionStore } from '@/lib/store/session';
import styles from './admin-messages.module.css';

type DirectCategory = 'system' | 'learning' | 'security' | 'membership';

async function parseResult(res: Response): Promise<{ success: boolean; message: string }> {
  try {
    const data = (await res.json()) as {
      success?: boolean;
      message?: string;
      error?: string;
      count?: number;
    };

    if (!res.ok || !data.success) {
      return { success: false, message: data.error || '操作失败' };
    }

    if (typeof data.count === 'number') {
      return { success: true, message: data.message || `操作成功（${data.count}）` };
    }

    return { success: true, message: data.message || '操作成功' };
  } catch {
    return { success: false, message: '返回解析失败' };
  }
}

export default function AdminMessagesPage() {
  const { isLoggedIn, sessionChecked } = useAuthGuard();
  const isAdmin = useSessionStore((s) => s.isAdmin);

  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastActionUrl, setBroadcastActionUrl] = useState('/messages');

  const [targetPhone, setTargetPhone] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [directCategory, setDirectCategory] = useState<DirectCategory>('system');
  const [directTitle, setDirectTitle] = useState('');
  const [directContent, setDirectContent] = useState('');
  const [directActionUrl, setDirectActionUrl] = useState('/messages');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submitBroadcast = async () => {
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/messages/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle,
          content: broadcastContent,
          actionUrl: broadcastActionUrl,
        }),
      });
      const result = await parseResult(res);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setSuccess(result.message);
      setBroadcastTitle('');
      setBroadcastContent('');
    } finally {
      setSubmitting(false);
    }
  };

  const submitDirect = async () => {
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/messages/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          phone: targetPhone,
          category: directCategory,
          title: directTitle,
          content: directContent,
          actionUrl: directActionUrl,
        }),
      });
      const result = await parseResult(res);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setSuccess(result.message);
      setDirectTitle('');
      setDirectContent('');
    } finally {
      setSubmitting(false);
    }
  };

  if (!sessionChecked || !isLoggedIn) return null;

  if (!isAdmin) {
    return (
      <AppShell activeKey="admin-messages" title="管理员消息" description="仅管理员可访问">
        <div className={styles.error}>无管理员权限，请联系管理员开通。</div>
      </AppShell>
    );
  }

  return (
    <AppShell activeKey="admin-messages" title="管理员消息" description="公告群发与单用户消息发送">
      <div className={styles.wrap}>
        <section className={styles.card}>
          <h3 className={styles.title}>群发公告</h3>
          <p className={styles.desc}>发送后会进入所有用户的“公告”分栏。</p>
          <input
            className={styles.input}
            placeholder="公告标题"
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
            maxLength={120}
          />
          <textarea
            className={styles.textarea}
            placeholder="公告内容"
            value={broadcastContent}
            onChange={(e) => setBroadcastContent(e.target.value)}
          />
          <input
            className={styles.input}
            placeholder="跳转链接（可选）"
            value={broadcastActionUrl}
            onChange={(e) => setBroadcastActionUrl(e.target.value)}
          />
          <button className={`${styles.btn} ${styles.primary}`} onClick={submitBroadcast} disabled={submitting}>
            {submitting ? '发送中...' : '发送公告'}
          </button>
        </section>

        <section className={styles.card}>
          <h3 className={styles.title}>单用户消息</h3>
          <p className={styles.desc}>发送后只在该用户“我的消息”分栏显示。</p>

          <div className={styles.row}>
            <input
              className={styles.input}
              placeholder="目标手机号（推荐）"
              value={targetPhone}
              onChange={(e) => setTargetPhone(e.target.value)}
            />
            <input
              className={styles.input}
              placeholder="或目标用户ID"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            />
          </div>

          <select
            className={styles.select}
            value={directCategory}
            onChange={(e) => setDirectCategory(e.target.value as DirectCategory)}
          >
            <option value="system">系统通知</option>
            <option value="learning">学习进度</option>
            <option value="security">账号安全</option>
            <option value="membership">会员权益</option>
          </select>

          <input
            className={styles.input}
            placeholder="消息标题"
            value={directTitle}
            onChange={(e) => setDirectTitle(e.target.value)}
            maxLength={120}
          />
          <textarea
            className={styles.textarea}
            placeholder="消息内容"
            value={directContent}
            onChange={(e) => setDirectContent(e.target.value)}
          />
          <input
            className={styles.input}
            placeholder="跳转链接（可选）"
            value={directActionUrl}
            onChange={(e) => setDirectActionUrl(e.target.value)}
          />
          <button className={`${styles.btn} ${styles.secondary}`} onClick={submitDirect} disabled={submitting}>
            {submitting ? '发送中...' : '发送单用户消息'}
          </button>
        </section>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {success ? <div className={styles.success}>{success}</div> : null}
    </AppShell>
  );
}
