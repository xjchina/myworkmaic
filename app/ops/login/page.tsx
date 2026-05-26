'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100';
const btnClass =
  'inline-flex w-full items-center justify-center rounded-xl border border-blue-600 bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:border-blue-700 hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60';

export default function OpsLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ops/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const raw = await res.text();
      let data: { success?: boolean; error?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as { success?: boolean; error?: string }) : {};
      } catch {
        setError(raw || `登录接口返回异常（${res.status}）`);
        return;
      }
      if (!res.ok || !data.success) {
        setError(data.error || '登录失败');
        return;
      }
      router.push('/ops');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-100 px-4 py-8">
      <div className="pointer-events-none absolute -top-28 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl" />

      <form
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur"
        onSubmit={submit}
      >
        <div className="mb-5">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">运营后台登录</h1>
          <p className="mt-1 text-sm text-slate-500">使用独立管理员账户登录后台系统</p>
        </div>

        <div className="space-y-3">
          <input
            className={inputClass}
            placeholder="后台账号"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className={inputClass}
            type="password"
            placeholder="后台密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}
          <button className={btnClass} disabled={loading} type="submit">
            {loading ? '登录中...' : '登录后台'}
          </button>
        </div>
      </form>
    </div>
  );
}
