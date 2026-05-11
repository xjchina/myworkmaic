'use client';

import { AppShell } from '@/components/shell/app-shell';
import { useSessionStore } from '@/lib/store/session';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';

function maskPhone(phone: string): string {
  if (phone.length !== 11) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
}

function formatDateTime(timestamp?: number): string {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

export default function AccountPage() {
  const { isLoggedIn } = useAuthGuard();
  const displayName = useSessionStore((s) => s.displayName);
  const userPhone = useSessionStore((s) => s.userPhone);
  const userCreatedAt = useSessionStore((s) => s.userCreatedAt);
  const userLastLoginAt = useSessionStore((s) => s.userLastLoginAt);
  const logout = useSessionStore((s) => s.logout);

  if (!isLoggedIn) return null;

  return (
    <AppShell
      activeKey="account"
      title="账号管理"
      description="管理您的个人信息和账号设置"
    >
      <div className="account-wrap">
        <section className="card profile-card">
          <div className="profile-avatar">{displayName?.slice(0, 1) || '我'}</div>
          <div className="profile-name">{displayName || '学员'}</div>
          <div className="profile-phone">{maskPhone(userPhone)}</div>
          <div className="profile-stats">
            <div className="profile-stat">
              <span className="ps-value">{userCreatedAt ? formatDateTime(userCreatedAt).split(' ')[0] : '-'}</span>
              <span className="ps-label">注册时间</span>
            </div>
            <div className="profile-stat">
              <span className="ps-value">{userLastLoginAt ? formatDateTime(userLastLoginAt).split(' ')[0] : '-'}</span>
              <span className="ps-label">最近登录</span>
            </div>
          </div>
          <button type="button" className="btn logout-btn" onClick={logout}>
            退出登录
          </button>
        </section>

        <section className="card">
          <h3>账号信息</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">昵称</span>
              <strong>{displayName || '学员'}</strong>
            </div>
            <div className="info-item">
              <span className="info-label">手机号</span>
              <strong>{maskPhone(userPhone)}</strong>
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
          <button type="button" className="btn logout-btn" onClick={logout}>
            退出登录
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
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
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
        .profile-phone {
          font-size: 14px;
          color: #64748b;
        }
        .profile-stats {
          display: flex;
          gap: 24px;
          margin: 12px 0;
        }
        .profile-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .ps-value {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
        }
        .ps-label {
          font-size: 12px;
          color: #94a3b8;
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
        .btn {
          border: none;
          border-radius: 10px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .logout-btn {
          margin-top: 16px;
          color: #dc2626;
          background: #fef2f2;
          width: 100%;
        }
        .logout-btn:hover {
          background: #fee2e2;
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
