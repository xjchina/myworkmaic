'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSessionStore } from '@/lib/store/session';
import { Eye, EyeOff, IdCard, Phone, ShieldCheck, User } from 'lucide-react';

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

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLoggedIn = useSessionStore((s) => s.isLoggedIn);
  const sendOtp = useSessionStore((s) => s.sendOtp);
  const registerWithPhone = useSessionStore((s) => s.registerWithPhone);

  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const onSendCode = async () => {
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
      void loadCaptcha();
    }
  };

  const onSubmit = async () => {
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
  };

  return (
    <main className="auth-page">
      <div className="auth-center-card">
        <section className="brand-pane">
          <div className="brand-badge">纸忆</div>
          <h1>白纸回忆梳理法</h1>
          <p>先回忆，再梳理，让学习形成闭环</p>

          <div className="brand-steps">
            <div className="step-chip">📝<span>回忆</span></div>
            <span className="arrow">→</span>
            <div className="step-chip">🔎<span>梳理</span></div>
            <span className="arrow">→</span>
            <div className="step-chip">🧩<span>关联</span></div>
            <span className="arrow">→</span>
            <div className="step-chip">🚀<span>掌握</span></div>
          </div>

          <div className="node-graph" aria-hidden>
            <div className="center-node">AI</div>
            <span className="node n1" />
            <span className="node n2" />
            <span className="node n3" />
            <span className="node n4" />
          </div>

          <div className="brand-foot">📊 知识节点 ∞ &nbsp;&nbsp; 🔗 智能关联</div>
        </section>

        <section className="form-pane">
          <div className="field-line">
            <Phone size={20} strokeWidth={2} className="line-icon" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="请输入手机号"
              inputMode="numeric"
              maxLength={11}
              autoComplete="tel"
            />
          </div>

          <div className="field-line field-code">
            <ShieldCheck size={20} strokeWidth={2} className="line-icon" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="短信验证码"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            <button type="button" className="line-btn" disabled={cooldown > 0 || !isValidPhone(normalizedPhone)} onClick={onSendCode}>
              {cooldown > 0 ? `${cooldown}s` : '获取验证码'}
            </button>
          </div>

          <div className="captcha-row">
            <div className="field-line captcha-input">
              <input
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="输入图形验证码"
                maxLength={6}
                autoComplete="off"
              />
            </div>
            <button type="button" className="captcha-btn" onClick={() => void loadCaptcha()}>
              {captchaImage ? <img src={captchaImage} alt="captcha" /> : '刷新'}
            </button>
          </div>

          <div className="field-line field-code">
            <IdCard size={20} strokeWidth={2} className="line-icon" />
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 20))}
              placeholder="昵称（可选）"
              maxLength={20}
              autoComplete="name"
            />
          </div>

          <div className="field-line field-code">
            <User size={20} strokeWidth={2} className="line-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="设置密码（8位以上，含大小写和数字）"
              autoComplete="new-password"
            />
            <button type="button" className="pwd-eye-btn" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? '隐藏密码' : '显示密码'}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {pwdError ? <p className="field-error">{pwdError}</p> : null}

          {inviteCode ? <div className="invite-hint">邀请码：{inviteCode}</div> : null}

          <label className="agreement-check">
            <input type="checkbox" className="agreement-checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span className="agreement-check-text">
              我已阅读并同意
              <a href="/user_agreement.html" target="_blank" rel="noopener noreferrer" className="agreement-link">用户协议</a>
              和
              <a href="/privacy_policy.html" target="_blank" rel="noopener noreferrer" className="agreement-link">隐私政策</a>
            </span>
          </label>

          <button type="button" className="submit-btn" onClick={onSubmit} disabled={!canSubmit || !agreed || submitting}>
            {submitting ? <LoadingDots /> : '注册'}
          </button>

          {notice ? <div className={`notice notice-${notice.type}`}>{notice.text}</div> : null}

          <div className="auth-footer">
            已有账号？<Link href={inviteCode ? `/login?invite=${inviteCode}` : '/login'} className="auth-link">去登录</Link>
          </div>
        </section>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: calc(100dvh - 24px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 26px;
          background: linear-gradient(180deg, #e7e3f3 0%, #e2dff0 100%);
        }
        .auth-center-card {
          width: min(1040px, 100%);
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #ebe8f9;
          border-radius: 26px;
          box-shadow: 0 18px 40px rgba(108, 91, 164, 0.14);
          overflow: hidden;
        }
        .brand-pane {
          padding: 38px 48px 32px;
          border-right: 1px solid #f0edfb;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          background:
            radial-gradient(circle at 20% 20%, rgba(114, 105, 252, 0.08), transparent 40%),
            radial-gradient(circle at 80% 80%, rgba(114, 105, 252, 0.07), transparent 35%),
            #fcfbff;
        }
        .brand-badge {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 700;
          color: #fff;
          background: linear-gradient(135deg, #5d5bf4, #7f49ff);
          margin-bottom: 16px;
        }
        .brand-pane h1 {
          margin: 0;
          font-size: 44px;
          line-height: 1.15;
          color: #201f2a;
          letter-spacing: 0.3px;
        }
        .brand-pane p {
          margin: 14px 0 26px;
          color: #7b7a86;
          font-size: 17px;
        }
        .brand-steps {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 26px;
        }
        .step-chip {
          width: 68px;
          height: 68px;
          border-radius: 16px;
          background: #f4f2ff;
          border: 1px solid #ddd7ff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          font-size: 22px;
          color: #5d59d8;
        }
        .step-chip span {
          font-size: 13px;
          color: #77748f;
          font-weight: 600;
        }
        .arrow {
          color: #bbb6d8;
          font-size: 20px;
          font-weight: 700;
        }
        .node-graph {
          position: relative;
          width: 305px;
          height: 165px;
          border: 1px dashed #ddd6ff;
          border-radius: 50%;
          margin-top: 10px;
          margin-bottom: 22px;
          background: radial-gradient(circle at center, rgba(125, 100, 246, 0.1), transparent 56%);
        }
        .center-node {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7a6cff, #8d63f7);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 18px rgba(122, 108, 255, 0.35);
        }
        .node {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #f2f0ff;
          border: 2px solid #b7aefd;
        }
        .n1 { left: 48px; top: 38px; }
        .n2 { right: 52px; top: 34px; }
        .n3 { left: 34px; bottom: 44px; }
        .n4 { right: 38px; bottom: 38px; }
        .brand-foot {
          margin-top: auto;
          font-size: 15px;
          color: #8f8ca7;
        }
        .form-pane {
          padding: 50px 54px 42px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .field-line {
          display: flex;
          align-items: center;
          height: 56px;
          border-bottom: 1px solid #ece8f7;
          margin-bottom: 6px;
          padding: 0 4px;
        }
        .line-icon {
          color: #b5b2c7;
          flex-shrink: 0;
          margin-left: 2px;
          margin-right: 18px;
        }
        .field-line input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 16px;
          color: #2b293d;
          line-height: 1;
          padding-left: 4px;
        }
        .field-line input::placeholder {
          color: #b8b4ca;
        }
        .field-code {
          margin-top: 8px;
        }
        .line-btn {
          border: 1px solid #e0dbf5;
          background: #f2f1ff;
          color: #7367dc;
          border-radius: 16px;
          height: 44px;
          min-width: 124px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          padding: 0 16px;
        }
        .line-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .pwd-eye-btn {
          width: 38px;
          height: 38px;
          border: 1px solid #e0dbf5;
          background: #f7f6ff;
          color: #7367dc;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        .captcha-row {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-top: 10px;
        }
        .captcha-input {
          flex: 1;
          margin-bottom: 0;
          border-bottom: none;
          height: 52px;
          border: 1px solid #ece8f7;
          border-radius: 14px;
          padding: 0 12px;
        }
        .captcha-input input {
          font-size: 15px;
        }
        .captcha-btn {
          width: 136px;
          height: 52px;
          border: 1px solid #e7e3f8;
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
          cursor: pointer;
          color: #6d69a8;
          font-size: 14px;
          font-weight: 600;
        }
        .captcha-btn img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }
        .agreement-check {
          margin: 16px 0 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }
        .agreement-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 7px;
          accent-color: #6a63ef;
          flex-shrink: 0;
        }
        .agreement-check-text {
          color: #8f8ca3;
          font-size: 13px;
          line-height: 1.3;
        }
        .agreement-link {
          color: #6e64e8;
          text-decoration: none;
          margin: 0 2px;
        }
        .submit-btn {
          width: 100%;
          height: 60px;
          border: none;
          border-radius: 18px;
          background: linear-gradient(90deg, #5a5be9, #7a4ff0);
          color: #fff;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .submit-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .notice {
          margin-top: 14px;
          padding: 11px 14px;
          border-radius: 12px;
          font-size: 13px;
          text-align: center;
        }
        .notice-info { background: #eff6ff; color: #1d4ed8; }
        .notice-success { background: #f0fdf4; color: #15803d; }
        .notice-error { background: #fef2f2; color: #b91c1c; }
        .field-error {
          margin: 6px 0 2px;
          font-size: 13px;
          color: #b91c1c;
        }
        .invite-hint {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          background: #eef2ff;
          border: 1px solid #c7d2fe;
          color: #3730a3;
          font-size: 13px;
          text-align: center;
        }
        .auth-footer {
          text-align: center;
          margin-top: 14px;
          font-size: 13px;
          color: #8d89a0;
        }
        .auth-link {
          color: #5f5be8;
          text-decoration: none;
          font-weight: 700;
        }
        :global(.loading-dots) { display: inline-flex; gap: 4px; align-items: center; }
        :global(.loading-dots .dot) { width: 7px; height: 7px; border-radius: 50%; background: #fff; animation: dot-pulse 1.2s infinite ease-in-out; }
        :global(.loading-dots .dot:nth-child(2)) { animation-delay: 0.2s; }
        :global(.loading-dots .dot:nth-child(3)) { animation-delay: 0.4s; }
        @keyframes dot-pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }

        @media (max-width: 980px) {
          .auth-center-card {
            grid-template-columns: 1fr;
          }
          .brand-pane {
            border-right: none;
            border-bottom: 1px solid #f0edfb;
            padding: 28px 20px 24px;
          }
          .brand-pane h1 {
            font-size: 30px;
          }
          .brand-pane p {
            font-size: 15px;
            margin: 8px 0 18px;
          }
          .node-graph {
            width: 260px;
            height: 140px;
            margin-bottom: 14px;
          }
          .form-pane {
            padding: 28px 20px 24px;
          }
          .field-line input {
            font-size: 16px;
          }
          .line-btn,
          .submit-btn {
            font-size: 16px;
            height: 50px;
          }
        }
      `}</style>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>加载中...</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
