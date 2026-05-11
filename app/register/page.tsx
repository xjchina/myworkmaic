'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { useSessionStore } from '@/lib/store/session';

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone);
}

function getPhoneError(phone: string): string | null {
  if (!phone) return null;
  if (phone.length === 11 && !isValidPhone(phone)) return '请输入有效的 11 位手机号';
  return null;
}

function getPasswordStrength(password: string): { score: number; label: string; color: string; percent: number } {
  if (!password) return { score: 0, label: '', color: '#e2e8f0', percent: 0 };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (score === 0) return { score, label: '太短', color: '#ef4444', percent: 10 };
  if (score === 1) return { score, label: '弱', color: '#ef4444', percent: 30 };
  if (score === 2) return { score, label: '较弱', color: '#f59e0b', percent: 50 };
  if (score === 3) return { score, label: '中', color: '#10b981', percent: 70 };
  return { score, label: '强', color: '#059669', percent: 100 };
}

function getPasswordError(password: string): string | null {
  if (!password) return null;
  if (password.length < 8) return '密码长度至少 8 位';
  if (!/[A-Z]/.test(password)) return '需要包含至少一个大写字母';
  if (!/[a-z]/.test(password)) return '需要包含至少一个小写字母';
  if (!/\d/.test(password)) return '需要包含至少一个数字';
  return null;
}

function CountdownBtn({ cooldown, disabled, onClick }: { cooldown: number; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" className="code-btn" onClick={onClick} disabled={disabled || cooldown > 0}>
      {cooldown > 0 ? `${cooldown}s` : '获取验证码'}
    </button>
  );
}

function LoadingDots() {
  return (
    <span className="loading-dots">
      <span className="dot" /><span className="dot" /><span className="dot" />
    </span>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const isLoggedIn = useSessionStore((s) => s.isLoggedIn);
  const sendOtp = useSessionStore((s) => s.sendOtp);
  const registerWithPhone = useSessionStore((s) => s.registerWithPhone);

  const [phone, setPhone] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const normalizedPhone = normalizePhone(phone);
  const phoneReady = isValidPhone(normalizedPhone);
  const phoneError = getPhoneError(normalizedPhone);
  const passwordStrength = getPasswordStrength(password);
  const passwordError = getPasswordError(password);

  const canSendCode = phoneReady && cooldown === 0;
  const canSubmit = phoneReady && code.trim().length === 6 && !passwordError;

  // Already logged in — redirect
  useEffect(() => {
    if (isLoggedIn) router.replace('/account');
  }, [isLoggedIn, router]);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownRef.current) { clearInterval(cooldownRef.current); cooldownRef.current = null; }
      return;
    }
    if (!cooldownRef.current) {
      cooldownRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) { if (cooldownRef.current) { clearInterval(cooldownRef.current); cooldownRef.current = null; } return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (cooldownRef.current) { clearInterval(cooldownRef.current); cooldownRef.current = null; } };
  }, [cooldown]);

  const handleSendCode = useCallback(async () => {
    const result = await sendOtp(normalizedPhone);
    if (result.success) {
      setCooldown(60);
      const codeHint = result.debugCode ? `验证码：${result.debugCode}` : (result.message || '验证码已发送');
      setNotice({ text: codeHint, type: 'info' });
    }
    else { setNotice({ text: result.message || '发送失败', type: 'error' }); if (result.waitSeconds) setCooldown(result.waitSeconds); }
  }, [normalizedPhone, sendOtp]);

  const handleRegister = useCallback(async () => {
    setSubmitting(true);
    setNotice(null);
    const result = await registerWithPhone({ phone: normalizedPhone, code, password, displayName: displayNameInput });
    setSubmitting(false);
    if (result.success) {
      setNotice({ text: result.message || '注册成功！即将跳转...', type: 'success' });
      setTimeout(() => router.push('/'), 1200);
    } else {
      setNotice({ text: result.message || '注册失败', type: 'error' });
    }
  }, [normalizedPhone, code, password, displayNameInput, registerWithPhone, router]);

  return (
    <AppShell activeKey="register" title="注册" description="手机验证码注册，设置密码">
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">学</div>
            <h2>创建账号</h2>
            <p className="auth-sub">手机验证码注册，并设置登录密码</p>
          </div>

          <div className="field">
            <label>手机号</label>
            <div className="input-wrap">
              <span className="input-prefix">+86</span>
              <input
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 11)); setNotice(null); }}
                placeholder="请输入 11 位手机号"
                inputMode="numeric" maxLength={11} autoComplete="tel"
              />
              {phone.length > 0 && (
                <button type="button" className="input-clear" onClick={() => { setPhone(''); setCode(''); setPassword(''); setDisplayNameInput(''); setNotice(null); }}>✕</button>
              )}
            </div>
            {phoneError && <p className="field-error">⚠ {phoneError}</p>}
          </div>

          <div className="field">
            <label>昵称（可选）</label>
            <div className="input-wrap">
              <input
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value.slice(0, 20))}
                placeholder="给自己取个名字吧" maxLength={20} autoComplete="name"
              />
            </div>
          </div>

          <div className="field">
            <label>验证码</label>
            <div className="input-row">
              <div className="input-wrap grow">
                <input
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setNotice(null); }}
                  placeholder="输入 6 位验证码" maxLength={6} inputMode="numeric" autoComplete="one-time-code"
                />
              </div>
              <CountdownBtn cooldown={cooldown} disabled={!canSendCode} onClick={handleSendCode} />
            </div>
          </div>

          <div className="field">
            <label>设置密码</label>
            <div className="input-wrap">
              <input
                type={password ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setNotice(null); }}
                placeholder="至少8位，包含大小写字母和数字"
                autoComplete="new-password"
              />
              {password.length > 0 && (
                <button type="button" className="input-clear" onClick={() => setPassword('')}>✕</button>
              )}
            </div>
            {password.length > 0 && (
              <div className="pw-strength">
                <div className="pw-bar-bg">
                  <div className="pw-bar-fill" style={{ width: `${passwordStrength.percent}%`, background: passwordStrength.color }} />
                </div>
                <span className="pw-label" style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
              </div>
            )}
            {passwordError && <p className="field-error">⚠ {passwordError}</p>}
          </div>

          <button type="button" className="btn submit-btn" onClick={handleRegister} disabled={!canSubmit || submitting}>
            {submitting ? <LoadingDots /> : '完成注册'}
          </button>

          {notice && <div className={`notice notice-${notice.type}`}>{notice.text}</div>}

          <div className="auth-footer">
            已有账号？<Link href="/login" className="auth-link">去登录 →</Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .auth-wrapper { display: flex; justify-content: center; padding: 20px 0; min-height: 500px; }
        .auth-card {
          width: 100%; max-width: 420px; background: #fff; border-radius: 24px; padding: 36px 32px 28px;
          border: 1px solid #eef2f6; box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        }
        .auth-header { text-align: center; margin-bottom: 28px; }
        .auth-logo {
          width: 56px; height: 56px; border-radius: 16px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff;
          font-size: 24px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;
        }
        .auth-header h2 { margin: 0; font-size: 22px; color: #0f172a; }
        .auth-sub { margin: 6px 0 0; font-size: 14px; color: #64748b; }
        .field { margin-bottom: 16px; }
        .field label { display: block; font-size: 13px; color: #334155; font-weight: 600; margin-bottom: 6px; }
        .input-wrap {
          display: flex; align-items: center; height: 44px; border-radius: 12px;
          border: 1px solid #e2e8f0; background: #f8fafc; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input-wrap:focus-within { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); background: #fff; }
        .input-prefix { padding: 0 8px 0 14px; color: #64748b; font-size: 14px; font-weight: 600; border-right: 1px solid #e2e8f0; height: 100%; display: flex; align-items: center; }
        .input-wrap input { flex: 1; border: none; background: transparent; height: 100%; padding: 0 12px; font-size: 15px; outline: none; color: #0f172a; }
        .input-wrap input::placeholder { color: #94a3b8; }
        .input-clear { border: none; background: #e2e8f0; color: #64748b; width: 24px; height: 24px; border-radius: 50%; font-size: 12px; cursor: pointer; margin-right: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .input-clear:hover { background: #cbd5e1; }
        .field-error { margin: 6px 0 0; font-size: 12px; color: #ef4444; }
        .grow { flex: 1; }
        .input-row { display: flex; gap: 8px; align-items: stretch; }
        .code-btn { height: 44px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; color: #4f46e5; font-size: 13px; font-weight: 600; padding: 0 14px; cursor: pointer; white-space: nowrap; transition: all 0.2s; flex-shrink: 0; }
        .code-btn:hover:not(:disabled) { background: #f5f3ff; border-color: #a5b4fc; }
        .code-btn:disabled { opacity: 0.5; cursor: not-allowed; color: #94a3b8; }
        .pw-strength { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
        .pw-bar-bg { flex: 1; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; }
        .pw-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease, background 0.3s ease; }
        .pw-label { font-size: 12px; font-weight: 600; min-width: 24px; text-align: right; }
        .btn { border: none; border-radius: 12px; padding: 12px 20px; font-size: 15px; font-weight: 600; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; height: 48px; }
        .submit-btn { color: #fff; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); margin-top: 8px; transition: opacity 0.2s, transform 0.15s; }
        .submit-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .notice { margin-top: 16px; padding: 10px 14px; border-radius: 10px; font-size: 13px; text-align: center; }
        .notice-info { background: #eff6ff; color: #1d4ed8; }
        .notice-success { background: #f0fdf4; color: #15803d; }
        .notice-error { background: #fef2f2; color: #b91c1c; }
        .auth-footer { text-align: center; margin-top: 20px; font-size: 14px; color: #64748b; }
        .auth-link { color: #4f46e5; font-weight: 600; text-decoration: none; }
        .auth-link:hover { text-decoration: underline; }
        :global(.loading-dots) { display: inline-flex; gap: 4px; align-items: center; }
        :global(.loading-dots .dot) { width: 6px; height: 6px; border-radius: 50%; background: #fff; animation: dot-pulse 1.2s infinite ease-in-out; }
        :global(.loading-dots .dot:nth-child(2)) { animation-delay: 0.2s; }
        :global(.loading-dots .dot:nth-child(3)) { animation-delay: 0.4s; }
        @keyframes dot-pulse { 0%,80%,100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.2); } }
      `}</style>
    </AppShell>
  );
}
