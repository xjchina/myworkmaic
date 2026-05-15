'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { useSessionStore } from '@/lib/store/session';

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone);
}

function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server-render';
  const key = 'openmaic_device_id';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(key, random);
  return random;
}

function passwordError(password: string): string | null {
  if (!password) return null;
  if (password.length < 8) return '密码长度至少 8 位';
  if (!/[A-Z]/.test(password)) return '需要包含至少一个大写字母';
  if (!/[a-z]/.test(password)) return '需要包含至少一个小写字母';
  if (!/\d/.test(password)) return '需要包含至少一个数字';
  return null;
}

function LoadingDots() {
  return (
    <span className="loading-dots">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </span>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLoggedIn = useSessionStore((s) => s.isLoggedIn);
  const sendOtp = useSessionStore((s) => s.sendOtp);
  const registerWithPhone = useSessionStore((s) => s.registerWithPhone);

  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [notice, setNotice] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const normalizedPhone = normalizePhone(phone);
  const inviteCode = normalizeInviteCode(searchParams.get('invite') || '');
  const hasCaptcha = captchaAnswer.trim().length >= 4 && Boolean(captchaId);
  const pwdError = passwordError(password);
  const canSubmit = isValidPhone(normalizedPhone) && code.trim().length === 6 && !pwdError && hasCaptcha;

  const loadCaptcha = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/captcha', {
        headers: {
          'x-device-id': getOrCreateDeviceId(),
        },
      });
      const data = await res.json();
      if (data.success) {
        setCaptchaId(data.captchaId || '');
        setCaptchaImage(data.imageDataUrl || '');
      } else {
        setCaptchaId('');
        setCaptchaImage('');
      }
      setCaptchaAnswer('');
    } catch {
      setCaptchaId('');
      setCaptchaImage('');
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) router.replace('/account');
  }, [isLoggedIn, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCaptcha();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCaptcha]);

  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
        cooldownRef.current = null;
      }
      return;
    }

    if (!cooldownRef.current) {
      cooldownRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownRef.current) {
              clearInterval(cooldownRef.current);
              cooldownRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
        cooldownRef.current = null;
      }
    };
  }, [cooldown]);

  const onSendCode = useCallback(async () => {
    if (!hasCaptcha) {
      setNotice({ text: '请先填写图形验证码', type: 'error' });
      return;
    }

    const result = await sendOtp({
      phone: normalizedPhone,
      captchaId,
      captchaAnswer,
    });

    if (result.success) {
      setCooldown(60);
      setNotice({ text: result.debugCode ? `验证码：${result.debugCode}` : (result.message || '验证码已发送'), type: 'info' });
    } else {
      setNotice({ text: result.message || '发送验证码失败', type: 'error' });
      if (result.waitSeconds) setCooldown(result.waitSeconds);
    }

    void loadCaptcha();
  }, [hasCaptcha, sendOtp, normalizedPhone, captchaId, captchaAnswer, loadCaptcha]);

  const onSubmit = useCallback(async () => {
    setSubmitting(true);
    setNotice(null);

    const result = await registerWithPhone({
      phone: normalizedPhone,
      code,
      password,
      displayName,
      inviteCode: inviteCode || undefined,
      captchaId,
      captchaAnswer,
    });

    setSubmitting(false);

    if (result.success) {
      setNotice({ text: result.message || '注册成功', type: 'success' });
      setTimeout(() => router.push('/'), 900);
      return;
    }

    setNotice({ text: result.message || '注册失败', type: 'error' });
    void loadCaptcha();
  }, [registerWithPhone, normalizedPhone, code, password, displayName, inviteCode, captchaId, captchaAnswer, router, loadCaptcha]);

  return (
    <AppShell activeKey="register" title="注册" description="使用手机验证码注册并设置密码">
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">学</div>
            <h2>创建账号</h2>
            <p className="auth-sub">手机验证 + 设置密码</p>
          </div>

          <div className="field">
            <label>手机号</label>
            <div className="input-wrap">
              <span className="input-prefix">+86</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="请输入 11 位手机号" inputMode="numeric" maxLength={11} autoComplete="tel" />
            </div>
          </div>

          <div className="field">
            <label>昵称（可选）</label>
            <div className="input-wrap">
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value.slice(0, 20))} placeholder="我们怎么称呼你？" maxLength={20} autoComplete="name" />
            </div>
          </div>

          {inviteCode ? <div className="invite-code-tip">邀请码：{inviteCode}</div> : null}

          <div className="field">
            <label>验证码</label>
            <div className="input-row">
              <div className="input-wrap grow">
                <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="输入 6 位验证码" maxLength={6} inputMode="numeric" autoComplete="one-time-code" />
              </div>
              <button type="button" className="code-btn" disabled={cooldown > 0 || !isValidPhone(normalizedPhone)} onClick={onSendCode}>{cooldown > 0 ? `${cooldown}s` : '获取验证码'}</button>
            </div>
          </div>

          <div className="field">
            <label>图形验证码</label>
            <div className="input-row">
              <div className="input-wrap grow">
                <input value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="输入图形验证码" maxLength={6} autoComplete="off" />
              </div>
              <button type="button" className="captcha-btn" onClick={() => void loadCaptcha()}>
                {captchaImage ? <img src={captchaImage} alt="captcha" /> : '刷新'}
              </button>
            </div>
          </div>

          <div className="field">
            <label>密码</label>
            <div className="input-wrap">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 8 位，包含大小写字母和数字" autoComplete="new-password" />
            </div>
            {pwdError ? <p className="field-error">{pwdError}</p> : null}
          </div>

          <label className="agreement-check">
            <input type="checkbox" className="agreement-checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span className="agreement-check-text">
              我已阅读并同意
              <a href="/user_agreement.html" target="_blank" rel="noopener noreferrer" className="agreement-link">《用户服务协议》</a>
              和
              <a href="/privacy_policy.html" target="_blank" rel="noopener noreferrer" className="agreement-link">《隐私政策》</a>
            </span>
          </label>

          <button type="button" className="btn submit-btn" onClick={onSubmit} disabled={!canSubmit || !agreed || submitting}>
            {submitting ? <LoadingDots /> : '注册'}
          </button>

          {notice ? <div className={`notice notice-${notice.type}`}>{notice.text}</div> : null}

          <div className="auth-footer">
            已有账号？<Link href={inviteCode ? `/login?invite=${inviteCode}` : '/login'} className="auth-link">去登录</Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .auth-wrapper { display: flex; justify-content: center; padding: 20px 0; min-height: 500px; }
        .auth-card { width: 100%; max-width: 420px; background: #fff; border-radius: 24px; padding: 36px 32px 28px; border: 1px solid #eef2f6; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
        .auth-header { text-align: center; margin-bottom: 28px; }
        .auth-logo { width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff; font-size: 20px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .auth-header h2 { margin: 0; font-size: 22px; color: #0f172a; }
        .auth-sub { margin: 6px 0 0; font-size: 14px; color: #64748b; }
        .field { margin-bottom: 16px; }
        .field label { display: block; font-size: 13px; color: #334155; font-weight: 600; margin-bottom: 6px; }
        .field-error { margin: 6px 0 0; font-size: 12px; color: #ef4444; }
        .input-wrap { display: flex; align-items: center; height: 44px; border-radius: 12px; border: 1px solid #e2e8f0; background: #f8fafc; }
        .input-prefix { padding: 0 8px 0 14px; color: #64748b; font-size: 14px; font-weight: 600; border-right: 1px solid #e2e8f0; height: 100%; display: flex; align-items: center; }
        .input-wrap input { flex: 1; border: none; background: transparent; height: 100%; padding: 0 12px; font-size: 15px; outline: none; color: #0f172a; }
        .input-row { display: flex; gap: 8px; align-items: stretch; }
        .grow { flex: 1; }
        .code-btn { height: 44px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; color: #4f46e5; font-size: 13px; font-weight: 600; padding: 0 14px; cursor: pointer; white-space: nowrap; }
        .code-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .captcha-btn { height: 44px; width: 128px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; overflow: hidden; cursor: pointer; }
        .captcha-btn img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .invite-code-tip { margin: 0 0 12px; padding: 8px 12px; border: 1px solid #c7d2fe; border-radius: 10px; background: #eef2ff; color: #3730a3; font-size: 13px; font-weight: 600; }
        .agreement-check { display: flex; align-items: center; gap: 8px; justify-content: center; margin: 10px 0; cursor: pointer; }
        .agreement-checkbox { width: 16px; height: 16px; accent-color: #667eea; }
        .agreement-check-text { font-size: 12px; color: #64748b; }
        .agreement-link { color: #667eea; text-decoration: none; }
        .btn { border: none; border-radius: 12px; padding: 12px 20px; font-size: 15px; font-weight: 600; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; height: 48px; }
        .submit-btn { color: #fff; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .notice { margin-top: 16px; padding: 10px 14px; border-radius: 10px; font-size: 13px; text-align: center; }
        .notice-info { background: #eff6ff; color: #1d4ed8; }
        .notice-success { background: #f0fdf4; color: #15803d; }
        .notice-error { background: #fef2f2; color: #b91c1c; }
        .auth-footer { text-align: center; margin-top: 20px; font-size: 14px; color: #64748b; }
        .auth-link { color: #4f46e5; font-weight: 600; text-decoration: none; }
        :global(.loading-dots) { display: inline-flex; gap: 4px; align-items: center; }
        :global(.loading-dots .dot) { width: 6px; height: 6px; border-radius: 50%; background: #fff; animation: dot-pulse 1.2s infinite ease-in-out; }
        :global(.loading-dots .dot:nth-child(2)) { animation-delay: 0.2s; }
        :global(.loading-dots .dot:nth-child(3)) { animation-delay: 0.4s; }
        @keyframes dot-pulse { 0%,80%,100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.2); } }
      `}</style>
    </AppShell>
  );
}
