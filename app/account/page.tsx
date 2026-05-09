'use client';

import { useMemo, useState } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { useSessionStore } from '@/lib/store/session';

type LoginMethod = 'code' | 'password';

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone);
}

function formatDateTime(timestamp?: number): string {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

function maskPhone(phone: string): string {
  if (phone.length !== 11) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
}

export default function AccountPage() {
  const isLoggedIn = useSessionStore((s) => s.isLoggedIn);
  const displayName = useSessionStore((s) => s.displayName);
  const userPhone = useSessionStore((s) => s.userPhone);
  const users = useSessionStore((s) => s.users);
  const sendOtp = useSessionStore((s) => s.sendOtp);
  const isPhoneRegistered = useSessionStore((s) => s.isPhoneRegistered);
  const registerWithPhone = useSessionStore((s) => s.registerWithPhone);
  const loginWithCode = useSessionStore((s) => s.loginWithCode);
  const loginWithPassword = useSessionStore((s) => s.loginWithPassword);
  const logout = useSessionStore((s) => s.logout);

  const [phone, setPhone] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('code');
  const [notice, setNotice] = useState('');
  const [debugCode, setDebugCode] = useState('');

  const normalizedPhone = normalizePhone(phone);
  const phoneReady = isValidPhone(normalizedPhone);
  const registered = phoneReady ? isPhoneRegistered(normalizedPhone) : false;
  const mode = registered ? 'login' : 'register';
  const currentUser = users.find((u) => u.phone === userPhone);

  const canSendCode = phoneReady;
  const canSubmitRegister = phoneReady && code.trim().length > 0 && password.trim().length > 0;
  const canSubmitCodeLogin = phoneReady && code.trim().length > 0;
  const canSubmitPasswordLogin = phoneReady && password.trim().length > 0;

  const modeText = useMemo(() => {
    if (!phoneReady) return '请输入 11 位手机号后继续';
    if (registered) return '该手机号已注册，可选择验证码登录或密码登录';
    return '新用户首次使用：请先验证码注册并设置密码';
  }, [phoneReady, registered]);

  const handleSendCode = () => {
    const result = sendOtp(normalizedPhone);
    setNotice(result.message || (result.success ? '验证码发送成功' : '验证码发送失败'));
    setDebugCode(result.debugCode || '');
  };

  const handleRegister = () => {
    const result = registerWithPhone({
      phone: normalizedPhone,
      code,
      password,
      displayName: displayNameInput,
    });
    setNotice(result.message || (result.success ? '注册成功' : '注册失败'));
    if (result.success) {
      setCode('');
      setPassword('');
      setDisplayNameInput('');
      setLoginMethod('password');
      setDebugCode('');
    }
  };

  const handleLogin = () => {
    const result =
      loginMethod === 'code'
        ? loginWithCode({ phone: normalizedPhone, code })
        : loginWithPassword({ phone: normalizedPhone, password });
    setNotice(result.message || (result.success ? '登录成功' : '登录失败'));
    if (result.success) {
      setCode('');
      setPassword('');
      setDebugCode('');
    }
  };

  return (
    <AppShell
      activeKey="account"
      title="账号管理"
      description="首次使用：手机号验证码注册并设置密码；再次登录可选验证码或密码。"
    >
      <div className="account-wrap">
        {isLoggedIn ? (
          <section className="card">
            <h3>当前账号</h3>
            <p className="sub">已登录，可直接在这里查看账号信息与退出登录。</p>
            <div className="info-grid">
              <div>
                <span>昵称</span>
                <strong>{displayName || '学员'}</strong>
              </div>
              <div>
                <span>手机号</span>
                <strong>{maskPhone(userPhone)}</strong>
              </div>
              <div>
                <span>注册时间</span>
                <strong>{formatDateTime(currentUser?.createdAt)}</strong>
              </div>
              <div>
                <span>最近登录</span>
                <strong>{formatDateTime(currentUser?.lastLoginAt)}</strong>
              </div>
            </div>
            <button type="button" className="btn danger" onClick={logout}>
              退出登录
            </button>
          </section>
        ) : null}

        <section className="card">
          <h3>{mode === 'register' ? '新用户注册' : '账号登录'}</h3>
          <p className="sub">{modeText}</p>

          <div className="field">
            <label>手机号</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入 11 位手机号"
              inputMode="numeric"
              maxLength={11}
            />
          </div>

          {mode === 'register' ? (
            <>
              <div className="field">
                <label>昵称（可选）</label>
                <input
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="例如：小明"
                  maxLength={20}
                />
              </div>
              <div className="field-inline">
                <div className="field grow">
                  <label>验证码</label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="输入 6 位验证码"
                    maxLength={6}
                  />
                </div>
                <button type="button" className="btn light" onClick={handleSendCode} disabled={!canSendCode}>
                  获取验证码
                </button>
              </div>
              <div className="field">
                <label>设置密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少8位，含大小写字母与数字"
                />
              </div>
              <button
                type="button"
                className="btn primary"
                onClick={handleRegister}
                disabled={!canSubmitRegister}
              >
                完成注册
              </button>
            </>
          ) : (
            <>
              <div className="tabs">
                <button
                  type="button"
                  className={`tab ${loginMethod === 'code' ? 'active' : ''}`}
                  onClick={() => setLoginMethod('code')}
                >
                  验证码登录
                </button>
                <button
                  type="button"
                  className={`tab ${loginMethod === 'password' ? 'active' : ''}`}
                  onClick={() => setLoginMethod('password')}
                >
                  密码登录
                </button>
              </div>

              {loginMethod === 'code' ? (
                <div className="field-inline">
                  <div className="field grow">
                    <label>验证码</label>
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="输入 6 位验证码"
                      maxLength={6}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn light"
                    onClick={handleSendCode}
                    disabled={!canSendCode}
                  >
                    获取验证码
                  </button>
                </div>
              ) : (
                <div className="field">
                  <label>密码</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                  />
                </div>
              )}

              <button
                type="button"
                className="btn primary"
                onClick={handleLogin}
                disabled={loginMethod === 'code' ? !canSubmitCodeLogin : !canSubmitPasswordLogin}
              >
                登录
              </button>
            </>
          )}

          {notice ? <p className="notice">{notice}</p> : null}
          {debugCode ? (
            <p className="debug">
              演示验证码：<strong>{debugCode}</strong>
            </p>
          ) : null}
        </section>
      </div>

      <style jsx>{`
        .account-wrap {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .card {
          background: #fff;
          border-radius: 20px;
          padding: 28px;
          border: 1px solid #e2e8f0;
        }
        h3 {
          margin: 0;
          font-size: 20px;
          color: #1a365d;
        }
        .sub {
          margin: 8px 0 20px;
          color: #64748b;
          font-size: 14px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 14px;
        }
        .field label {
          font-size: 13px;
          color: #334155;
          font-weight: 600;
        }
        .field input {
          height: 42px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          padding: 0 12px;
          font-size: 14px;
          outline: none;
        }
        .field input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
        }
        .field-inline {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }
        .grow {
          flex: 1;
          margin-bottom: 0;
        }
        .tabs {
          display: inline-flex;
          background: #f1f5f9;
          border-radius: 10px;
          padding: 3px;
          margin-bottom: 14px;
        }
        .tab {
          border: none;
          background: transparent;
          color: #475569;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }
        .tab.active {
          background: #fff;
          color: #1e293b;
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
        }
        .btn {
          border: none;
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn.primary {
          color: #fff;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        }
        .btn.light {
          color: #334155;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          height: 42px;
        }
        .btn.danger {
          margin-top: 10px;
          color: #b91c1c;
          background: #fee2e2;
        }
        .notice {
          margin: 14px 0 0;
          font-size: 13px;
          color: #0369a1;
          background: #e0f2fe;
          border-radius: 8px;
          padding: 8px 10px;
        }
        .debug {
          margin: 8px 0 0;
          font-size: 13px;
          color: #92400e;
          background: #fef3c7;
          border-radius: 8px;
          padding: 8px 10px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .info-grid div {
          background: #f8fafc;
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .info-grid span {
          color: #64748b;
          font-size: 12px;
        }
        .info-grid strong {
          color: #0f172a;
          font-size: 14px;
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

