'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { useSessionStore } from '@/lib/store/session';
import { useSubscriptionStore, PLAN_META, type SubscriptionType } from '@/lib/store/subscription';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';
import { Crown, Sparkles, Zap, ArrowRight, Gift, Users } from 'lucide-react';
import styles from './account.module.css';

function maskPhone(phone: string): string {
  if (phone.length !== 11) return '未绑定';
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
}

function formatDateTime(timestamp?: number): string {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

const PLAN_ICONS: Record<SubscriptionType, typeof Zap> = {
  free: Zap,
  sub: Sparkles,
  vip: Crown,
};

function MembershipCard() {
  const subscription = useSubscriptionStore((s) => s.subscription);
  const loading = useSubscriptionStore((s) => s.loading);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);

  useEffect(() => {
    void fetchSubscription();
  }, [fetchSubscription]);

  const subType = subscription?.subscriptionType ?? 'free';
  const meta = PLAN_META[subType];
  const PlanIcon = PLAN_ICONS[subType];
  const isFree = subType === 'free';

  if (loading) {
    return (
      <div className={styles.membershipCard}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  return (
    <div className={`${styles.membershipCard} ${isFree ? styles.membershipFree : ''}`}>
      <div className={styles.badge} style={{ background: meta.gradient }}>
        <PlanIcon className="size-4" />
        <span>{meta.label}</span>
      </div>

      {!isFree && subscription?.expiresAt ? (
        <p className={styles.expiryText}>
          到期：{subscription.expiresAt}
          <span className={styles.daysLeft}>剩余 {subscription.remainingDays} 天</span>
        </p>
      ) : null}

      {isFree ? (
        <Link href="/subscribe" className={styles.upgradeBtn}>
          升级会员
          <ArrowRight className="size-3.5" />
        </Link>
      ) : (
        <Link href="/subscribe" className={styles.manageBtn}>
          管理订阅
          <ArrowRight className="size-3.5" />
        </Link>
      )}

      <div className={styles.permSummary}>
        <span title={`每日教案课堂：${subType === 'vip' ? '不限' : `${subscription?.permissions?.classroomDaily ?? 3} 次`}`}>
          教案 {subType === 'vip' ? '∞' : subscription?.permissions?.classroomDaily ?? 3}
        </span>
        <span className={styles.permDivider} />
        <span title={`每日互动练习：${subType === 'vip' ? '不限' : `${subscription?.permissions?.exerciseDaily ?? 5} 题`}`}>
          练习 {subType === 'vip' ? '∞' : subscription?.permissions?.exerciseDaily ?? 5}
        </span>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuthGuard();
  const displayName = useSessionStore((s) => s.displayName);
  const userPhone = useSessionStore((s) => s.userPhone);
  const isPhoneBound = useSessionStore((s) => s.isPhoneBound);
  const userCreatedAt = useSessionStore((s) => s.userCreatedAt);
  const userLastLoginAt = useSessionStore((s) => s.userLastLoginAt);
  const refreshSession = useSessionStore((s) => s.refreshSession);
  const logout = useSessionStore((s) => s.logout);
  const [deleting, setDeleting] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);

  useEffect(() => {
    setNicknameInput(displayName || '学员');
  }, [displayName]);

  const handleSaveNickname = async () => {
    const next = nicknameInput.trim();
    if (!next) {
      window.alert('昵称不能为空。');
      return;
    }
    if (next.length > 50) {
      window.alert('昵称最多 50 个字符。');
      return;
    }
    if (next === (displayName || '学员')) {
      return;
    }

    setSavingNickname(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: next }),
      });
      const data = await res
        .json()
        .catch(() => ({} as { success?: boolean; error?: string; message?: string }));
      if (!res.ok || !data.success) {
        window.alert(data.error || data.message || '昵称更新失败，请稍后重试。');
        return;
      }
      await refreshSession();
      window.alert('昵称已更新。');
    } catch {
      window.alert('网络异常，昵称更新失败，请稍后重试。');
    } finally {
      setSavingNickname(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleting) return;

    const confirmed = window.confirm('注销后将永久删除账号和学习数据，且无法恢复。是否继续？');
    if (!confirmed) return;

    const phoneLast4 = userPhone?.slice(-4) || '';
    if (isPhoneBound && phoneLast4) {
      const input = window.prompt(`请输入当前手机号后4位（${phoneLast4}）确认注销`);
      if (!input || input.trim() !== phoneLast4) {
        window.alert('校验失败，已取消注销。');
        return;
      }
    }

    setDeleting(true);
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'POST' });
      const data = await res.json().catch(() => ({} as { success?: boolean; error?: string; message?: string }));
      if (!res.ok || !data.success) {
        window.alert(data.error || data.message || '注销失败，请稍后重试。');
        return;
      }

      await logout();
      window.alert('账号已注销。');
      router.replace('/login');
    } catch {
      window.alert('网络异常，注销失败，请稍后重试。');
    } finally {
      setDeleting(false);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <AppShell activeKey="account" title="账号管理" description="管理您的个人信息和账号设置">
      <div className="account-wrap">
        <section className="card profile-card">
          <div className="profile-avatar">{displayName?.slice(0, 1) || '学'}</div>
          <div className="profile-name">{displayName || '学员'}</div>
          <MembershipCard />
        </section>

        <section className="card">
          <h3>账号信息</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">昵称</span>
              <div className="nickname-edit">
                <input
                  className="nickname-input"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="请输入昵称"
                  maxLength={50}
                />
                <button
                  type="button"
                  className="nickname-save"
                  disabled={savingNickname}
                  onClick={() => void handleSaveNickname()}
                >
                  {savingNickname ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
            <div className="info-item">
              <span className="info-label">手机号</span>
              <strong>{isPhoneBound ? maskPhone(userPhone) : '未绑定手机号'}</strong>
            </div>
            <div className="info-item">
              <span className="info-label">注册时间</span>
              <strong>{formatDateTime(userCreatedAt)}</strong>
            </div>
            <div className="info-item">
              <span className="info-label">最近登录</span>
              <strong>{formatDateTime(userLastLoginAt)}</strong>
            </div>
          </div>

          <div className="quick-actions">
            <Link href="/subscribe" className="quick-action-btn primary">
              <Crown className="size-4" />
              我的会员
            </Link>
            <Link href="/subscribe" className="quick-action-btn secondary">
              <Gift className="size-4" />
              兑换码
            </Link>
            <Link href="/subscribe" className="quick-action-btn secondary">
              <Users className="size-4" />
              邀请好友
            </Link>
          </div>

          <button type="button" className="btn logout-btn" onClick={() => void logout()}>
            退出登录
          </button>
          <button
            type="button"
            className="btn delete-btn"
            disabled={deleting}
            onClick={() => void handleDeleteAccount()}
          >
            {deleting ? '注销中...' : '注销账号'}
          </button>
        </section>
      </div>

      <style jsx>{`
        .account-wrap {
          display: grid;
          gap: 24px;
          grid-template-columns: 320px 1fr;
        }
        .card {
          background: #fff;
          border-radius: 20px;
          padding: 28px;
          border: 1px solid #eef2f6;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
        }
        .profile-card {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .profile-avatar {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: #fff;
          font-size: 28px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
        }
        .profile-name {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
        }
        h3 {
          margin: 0 0 16px;
          font-size: 18px;
          color: #0f172a;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .info-item {
          background: #f8fafc;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .info-label {
          color: #64748b;
          font-size: 12px;
        }
        .info-item strong {
          color: #0f172a;
          font-size: 14px;
        }
        .nickname-edit {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .nickname-input {
          flex: 1;
          min-width: 0;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 14px;
          color: #0f172a;
          background: #fff;
        }
        .nickname-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        .nickname-save {
          border: none;
          border-radius: 8px;
          background: #4f46e5;
          color: #fff;
          padding: 6px 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .nickname-save:hover {
          background: #4338ca;
        }
        .nickname-save:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .btn {
          border: none;
          border-radius: 10px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
        }
        .logout-btn {
          margin-top: 16px;
          color: #dc2626;
          background: #fef2f2;
        }
        .logout-btn:hover {
          background: #fee2e2;
        }
        .delete-btn {
          margin-top: 10px;
          color: #b91c1c;
          background: #fff1f2;
          border: 1px solid #fecdd3;
        }
        .delete-btn:hover {
          background: #ffe4e6;
        }
        .delete-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .quick-actions {
          display: flex;
          gap: 10px;
          margin-top: 18px;
          flex-wrap: wrap;
        }
        .quick-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .primary {
          color: #fff;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border: none;
        }
        .primary:hover {
          box-shadow: 0 2px 8px rgba(217, 119, 6, 0.25);
          transform: translateY(-1px);
        }
        .secondary {
          color: #4f46e5;
          background: #eef2ff;
          border: 1px solid #c7d2fe;
        }
        .secondary:hover {
          background: #e0e7ff;
        }
        @media (max-width: 900px) {
          .account-wrap {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AppShell>
  );
}
