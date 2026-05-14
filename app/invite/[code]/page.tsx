import Link from 'next/link';
import { findUserByInviteCode } from '@/lib/server/auth';

function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

function isInviteCodeFormatValid(code: string): boolean {
  return /^[A-Z0-9]{4,20}$/.test(code);
}

export default async function InviteLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const inviteCode = normalizeInviteCode(code || '');
  const formatValid = isInviteCodeFormatValid(inviteCode);

  let inviterName: string | null = null;
  let inviteExists = false;
  if (formatValid) {
    try {
      const inviter = await findUserByInviteCode(inviteCode);
      inviteExists = Boolean(inviter);
      inviterName = inviter?.displayName ?? null;
    } catch {
      // DB unavailable: keep page usable and let register API do final validation.
      inviteExists = false;
    }
  }

  const canContinue = formatValid;
  const registerHref = `/register?invite=${encodeURIComponent(inviteCode)}`;

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      <div
        style={{
          maxWidth: '680px',
          margin: '40px auto',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
          padding: '28px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '28px', color: '#0f172a' }}>邀请注册</h1>
        <p style={{ marginTop: '10px', color: '#475569', lineHeight: 1.7 }}>
          你正在使用好友邀请链接加入纸忆。完成注册后，系统会自动绑定邀请关系。
        </p>

        <div
          style={{
            marginTop: '18px',
            padding: '14px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            background: '#f8fafc',
          }}
        >
          <div style={{ fontSize: '13px', color: '#64748b' }}>邀请码</div>
          <div style={{ marginTop: '4px', fontSize: '22px', letterSpacing: '1px', color: '#1e293b', fontWeight: 700 }}>
            {inviteCode || '无'}
          </div>
          {formatValid ? (
            <p style={{ margin: '8px 0 0', color: '#334155', fontSize: '14px' }}>
              {inviteExists && inviterName ? `邀请人：${inviterName}` : '邀请码将在注册时校验并绑定。'}
            </p>
          ) : (
            <p style={{ margin: '8px 0 0', color: '#dc2626', fontSize: '14px' }}>
              邀请码格式不正确，请检查链接是否完整。
            </p>
          )}
        </div>

        <div style={{ marginTop: '22px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {canContinue ? (
            <Link
              href={registerHref}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '44px',
                padding: '0 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              立即注册并绑定邀请
            </Link>
          ) : null}
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '44px',
              padding: '0 20px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              color: '#334155',
              textDecoration: 'none',
              fontWeight: 600,
              background: '#fff',
            }}
          >
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}
