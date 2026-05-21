'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';
import { useSessionStore } from '@/lib/store/session';

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone);
}

function isValidPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
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

function BindPhoneClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = (searchParams.get('next') || '/').startsWith('/')
    ? (searchParams.get('next') || '/')
    : '/';

  const { isLoggedIn, isPhoneBound } = useAuthGuard('/login', { requirePhoneBound: false });
  const sendOtp = useSessionStore((s) => s.sendOtp);
  const bindPhone = useSessionStore((s) => s.bindPhone);

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [sending, setSending] = useState(false);
  const [binding, setBinding] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);

  const refreshCaptcha = async () => {
    setLoadingCaptcha(true);
    try {
      const res = await fetch('/api/auth/captcha', {
        method: 'POST',
        headers: {
          'x-device-id': getOrCreateDeviceId(),
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || '图形验证码加载失败，请稍后重试。');
        return;
      }
      setCaptchaId(data.captchaId || '');
      setCaptchaImage(data.imageDataUrl || '');
      setCaptchaAnswer('');
    } catch {
      setError('网络错误，请稍后重试。');
    } finally {
      setLoadingCaptcha(false);
    }
  };

  useEffect(() => {
    void refreshCaptcha();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((v) => v - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (isLoggedIn && isPhoneBound) {
      router.replace(nextPath);
    }
  }, [isLoggedIn, isPhoneBound, nextPath, router]);

  const handleSendCode = async () => {
    setError('');
    setNotice('');
    if (!isValidPhone(normalizedPhone)) {
      setError('请输入有效的 11 位手机号');
      return;
    }
    if (!captchaId || !captchaAnswer.trim()) {
      setError('请先输入图形验证码');
      return;
    }

    setSending(true);
    const result = await sendOtp({
      phone: normalizedPhone,
      captchaId,
      captchaAnswer: captchaAnswer.trim().toUpperCase(),
    });
    setSending(false);

    if (!result.success) {
      setError(result.message || '验证码发送失败');
      await refreshCaptcha();
      return;
    }

    setNotice(result.message || '验证码已发送');
    setCountdown(result.waitSeconds && result.waitSeconds > 0 ? result.waitSeconds : 60);
  };

  const handleBind = async () => {
    setError('');
    setNotice('');
    if (!isValidPhone(normalizedPhone)) {
      setError('请输入有效的 11 位手机号');
      return;
    }
    if (!code.trim()) {
      setError('请输入短信验证码');
      return;
    }
    if (!captchaId || !captchaAnswer.trim()) {
      setError('请输入图形验证码');
      return;
    }
    if (!isValidPassword(password)) {
      setError('密码至少 8 位，且需包含大小写字母和数字');
      return;
    }
    if (password !== passwordConfirm) {
      setError('两次输入的密码不一致');
      return;
    }

    setBinding(true);
    const result = await bindPhone({
      phone: normalizedPhone,
      code: code.trim(),
      password,
      captchaId,
      captchaAnswer: captchaAnswer.trim().toUpperCase(),
    });
    setBinding(false);

    if (!result.success) {
      setError(result.message || '绑定失败，请重试');
      await refreshCaptcha();
      return;
    }

    router.replace(nextPath);
  };

  if (!isLoggedIn) return null;

  return (
    <AppShell activeKey="login" title="绑定手机号" description="首次微信登录需绑定手机号，后续可使用验证码或密码登录">
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">学</div>
            <h2>完成账号绑定</h2>
            <p className="auth-sub">绑定后可用手机号验证码或密码登录</p>
          </div>

          <div className="field">
            <label>手机号</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="请输入 11 位手机号"
              inputMode="numeric"
              maxLength={11}
              autoComplete="tel"
            />
          </div>

          <div className="field">
            <label>短信验证码</label>
            <div className="row">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="输入 6 位验证码"
                inputMode="numeric"
                maxLength={6}
              />
              <button type="button" className="ghost" disabled={sending || countdown > 0} onClick={() => void handleSendCode()}>
                {countdown > 0 ? `${countdown}s` : (sending ? '发送中...' : '获取验证码')}
              </button>
            </div>
          </div>

          <div className="field">
            <label>图形验证码</label>
            <div className="row">
              <input
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                placeholder="输入图形验证码"
                maxLength={8}
              />
              <button type="button" className="captcha" onClick={() => void refreshCaptcha()} disabled={loadingCaptcha}>
                {captchaImage ? <img src={captchaImage} alt="图形验证码" /> : (loadingCaptcha ? '加载中...' : '刷新')}
              </button>
            </div>
          </div>

          <div className="field">
            <label>设置密码</label>
            <div className="row single">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder="至少 8 位，含大小写字母和数字"
                autoComplete="new-password"
              />
              <button type="button" className="ghost" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          <div className="field">
            <label>确认密码</label>
            <div className="row single">
              <input
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                type={showPasswordConfirm ? 'text' : 'password'}
                placeholder="请再次输入密码"
                autoComplete="new-password"
              />
              <button type="button" className="ghost" onClick={() => setShowPasswordConfirm((v) => !v)}>
                {showPasswordConfirm ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          {error ? <div className="notice notice-error">{error}</div> : null}
          {notice ? <div className="notice">{notice}</div> : null}

          <button type="button" className="primary" onClick={() => void handleBind()} disabled={binding}>
            {binding ? '绑定中...' : '确认绑定并继续'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .auth-wrapper { display: flex; justify-content: center; padding: 18px 0; min-height: 500px; }
        .auth-card { width: 100%; max-width: 440px; background: #fff; border-radius: 24px; padding: 36px 32px 28px; border: 1px solid #eef2f6; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
        .auth-header { text-align: center; margin-bottom: 24px; }
        .auth-logo { width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff; font-size: 20px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .auth-header h2 { margin: 0; font-size: 22px; color: #0f172a; }
        .auth-sub { margin: 6px 0 0; font-size: 14px; color: #64748b; }
        .field { margin-bottom: 14px; }
        .field label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: #0f172a; }
        input { width: 100%; height: 46px; border-radius: 12px; border: 1px solid #e2e8f0; padding: 0 14px; font-size: 15px; outline: none; }
        input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.16); }
        .row { display: grid; grid-template-columns: 1fr 126px; gap: 10px; align-items: center; }
        .row.single { grid-template-columns: 1fr 80px; }
        .ghost, .captcha { height: 46px; border-radius: 12px; border: 1px solid #dbe2ef; background: #f8fafc; font-size: 14px; font-weight: 600; color: #334155; cursor: pointer; overflow: hidden; }
        .ghost:disabled, .captcha:disabled { opacity: 0.6; cursor: not-allowed; }
        .captcha img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .notice { margin-top: 8px; border-radius: 10px; background: #eef2ff; color: #4338ca; padding: 10px 12px; font-size: 13px; text-align: center; }
        .notice-error { background: #fef2f2; color: #dc2626; }
        .primary { margin-top: 12px; width: 100%; height: 46px; border: none; border-radius: 12px; color: #fff; font-size: 16px; font-weight: 700; background: linear-gradient(135deg, #6d5dfc 0%, #9f85ff 100%); cursor: pointer; }
        .primary:disabled { opacity: 0.65; cursor: not-allowed; }
      `}</style>
    </AppShell>
  );
}

export default function BindPhonePage() {
  return (
    <Suspense fallback={null}>
      <BindPhoneClient />
    </Suspense>
  );
}
