'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type TabKey = 'overview' | 'prompts' | 'models' | 'users' | 'messages' | 'presets';
type OpsUser = { username: string; displayName: string };
type Notice = { kind: 'loading' | 'success' | 'error'; title: string; message: string };

type PromptItem = {
  id: string;
  subject: string;
  gradeSegment: string;
  mode: 'dialog' | 'quick';
  version: number;
  status: 'draft' | 'published' | 'archived';
  name: string;
  systemPrompt: string;
  teachingStyle: string;
  outputFormat: string;
  safetyConstraints: string;
  antiDivergenceRules: string;
  variables: string[];
  updatedAt: string;
};

type OverviewData = {
  metrics: Record<string, number>;
  featureUsage7d: Array<{ feature: string; total: number }>;
};

type UserRow = {
  id: string;
  phone: string;
  displayName: string;
  subscriptionType: 'free' | 'sub' | 'vip';
  subscriptionExpiresAt: string | null;
  banned: boolean;
};

type BroadcastHistoryItem = {
  title: string;
  content: string;
  sender: string | null;
  sentAt: string;
  recipients: number;
};

type PresetItem = {
  id: string;
  contentType: string;
  title: string;
  sortOrder: number;
  isVisible: boolean;
  payload: unknown;
};

type ProviderRow = { id: string; config: { baseUrl?: string; models?: string[] } };
type ModelsData = {
  defaultRoute: { llm: string | null; asr: string | null; tts: string | null; ocr: string | null };
  providers: {
    llm: ProviderRow[];
    asr: ProviderRow[];
    tts: ProviderRow[];
    ocr: ProviderRow[];
    image: ProviderRow[];
    video: ProviderRow[];
    webSearch: ProviderRow[];
  };
};
type ProviderGroupKey = keyof ModelsData['providers'];

type PromptDraft = {
  name: string;
  systemPrompt: string;
  teachingStyle: string;
  outputFormat: string;
  safetyConstraints: string;
  antiDivergenceRules: string;
};

const METRIC_LABELS: Record<string, string> = {
  totalUsers: '累计用户',
  newUsers7d: '近7天新增',
  activeUsers1d: '近1天活跃',
  calls7d: '近7天调用量',
  errorRate7d: '近7天错误率(%)',
  moderationBlockRate7d: '审核拦截率(%)',
  activeBans: '当前封禁数',
};

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '道法', '通用'];
const GRADES = ['小学', '初中', '高中', '通用'];

const baseInput =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100';
const baseBtn =
  'inline-flex items-center justify-center rounded-xl border-2 px-3.5 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-4';
const btnPrimary = `${baseBtn} border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-200 hover:bg-blue-700 focus:ring-blue-200`;
const btnGhost = `${baseBtn} border-blue-300 bg-blue-50 text-blue-700 shadow-sm hover:border-blue-400 hover:bg-blue-100 focus:ring-blue-100`;

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();

  let data: (T & { success?: boolean; error?: string; details?: string }) | null = null;
  try {
    data = text ? (JSON.parse(text) as T & { success?: boolean; error?: string; details?: string }) : null;
  } catch {
    throw new Error(text || `请求失败（${res.status}）`);
  }

  if (!data) throw new Error(`服务返回空响应（${res.status}）`);
  if (!res.ok || (typeof data.success !== 'undefined' && !data.success)) {
    throw new Error([data.error || '请求失败', data.details].filter(Boolean).join('：'));
  }
  return data;
}

const emptyPromptDraft: PromptDraft = {
  name: '',
  systemPrompt: '',
  teachingStyle: '',
  outputFormat: '',
  safetyConstraints: '',
  antiDivergenceRules: '',
};

export default function OpsAdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('overview');
  const [user, setUser] = useState<OpsUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [promptSubject, setPromptSubject] = useState('数学');
  const [promptGrade, setPromptGrade] = useState('高中');
  const [promptMode, setPromptMode] = useState<'dialog' | 'quick'>('dialog');
  const [showVersionList, setShowVersionList] = useState(false);
  const [promptDraft, setPromptDraft] = useState<PromptDraft>(emptyPromptDraft);
  const [renderPreview, setRenderPreview] = useState('');

  const [models, setModels] = useState<ModelsData | null>(null);
  const [routeForm, setRouteForm] = useState({ llm: '', asr: '', tts: '', ocr: '' });
  const [providerForm, setProviderForm] = useState({
    group: 'llm' as ProviderGroupKey,
    id: '',
    apiKey: '',
    baseUrl: '',
    models: '',
    proxy: '',
  });

  const [users, setUsers] = useState<UserRow[]>([]);
  const [userQuery, setUserQuery] = useState('');

  const [history, setHistory] = useState<BroadcastHistoryItem[]>([]);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');

  const [presets, setPresets] = useState<PresetItem[]>([]);

  const selectedPrompt = useMemo(
    () => prompts.find((item) => item.id === selectedPromptId) || null,
    [prompts, selectedPromptId],
  );
  const canEditSelectedPrompt = selectedPrompt?.status === 'draft';

  useEffect(() => {
    if (!selectedPrompt) {
      setPromptDraft(emptyPromptDraft);
      return;
    }
    setPromptDraft({
      name: selectedPrompt.name || '',
      systemPrompt: selectedPrompt.systemPrompt || '',
      teachingStyle: selectedPrompt.teachingStyle || '',
      outputFormat: selectedPrompt.outputFormat || '',
      safetyConstraints: selectedPrompt.safetyConstraints || '',
      antiDivergenceRules: selectedPrompt.antiDivergenceRules || '',
    });
  }, [selectedPrompt]);

  useEffect(() => {
    if (!notice || notice.kind === 'loading') return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const runWithNotice = useCallback(async (title: string, task: () => Promise<void>, successMessage: string) => {
    setNotice({ kind: 'loading', title: `${title}中`, message: '请稍候，正在处理...' });
    try {
      await task();
      setNotice({ kind: 'success', title: '操作成功', message: successMessage });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '操作失败，请稍后重试';
      setError(msg);
      setNotice({ kind: 'error', title: '操作失败', message: msg });
    }
  }, []);

  const loadOverview = useCallback(async () => {
    const data = await requestJson<OverviewData>('/api/ops/overview');
    setOverview(data);
  }, []);

  const loadPrompts = useCallback(async () => {
    const params = new URLSearchParams({ subject: promptSubject, gradeSegment: promptGrade, mode: promptMode });
    const data = await requestJson<{ items: PromptItem[] }>(`/api/ops/knowledge-prompts?${params.toString()}`);
    const items = data.items || [];
    setPrompts(items);
    if (!selectedPromptId && items[0]) setSelectedPromptId(items[0].id);
    if (selectedPromptId && !items.find((i) => i.id === selectedPromptId)) {
      setSelectedPromptId(items[0]?.id || '');
    }
  }, [promptGrade, promptMode, promptSubject, selectedPromptId]);

  const loadModels = useCallback(async () => {
    const data = await requestJson<ModelsData>('/api/ops/models');
    setModels(data);
    setRouteForm({
      llm: data.defaultRoute.llm || '',
      asr: data.defaultRoute.asr || '',
      tts: data.defaultRoute.tts || '',
      ocr: data.defaultRoute.ocr || '',
    });
  }, []);

  const loadUsers = useCallback(async () => {
    const params = new URLSearchParams();
    if (userQuery.trim()) params.set('q', userQuery.trim());
    const data = await requestJson<{ items: UserRow[] }>(`/api/ops/users?${params.toString()}`);
    setUsers(data.items || []);
  }, [userQuery]);

  const loadMessages = useCallback(async () => {
    const h = await requestJson<{ items: BroadcastHistoryItem[] }>('/api/ops/messages/history?limit=30');
    setHistory(h.items || []);
  }, []);

  const loadPresets = useCallback(async () => {
    const data = await requestJson<{ items: PresetItem[] }>('/api/ops/presets');
    setPresets(data.items || []);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const me = await requestJson<{ user: OpsUser }>('/api/ops/auth/me');
        setUser(me.user);
      } catch {
        router.replace('/ops/login');
      }
    };
    void init();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        if (tab === 'overview') await loadOverview();
        if (tab === 'prompts') await loadPrompts();
        if (tab === 'models') await loadModels();
        if (tab === 'users') await loadUsers();
        if (tab === 'messages') await loadMessages();
        if (tab === 'presets') await loadPresets();
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [loadMessages, loadModels, loadOverview, loadPresets, loadPrompts, loadUsers, tab, user]);

  const logout = async () => {
    await fetch('/api/ops/auth/logout', { method: 'POST' });
    router.push('/ops/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-slate-950/95 px-5 py-3.5 text-white">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4">
          <h1 className="text-lg font-semibold">运营教研后台</h1>
          <button className={`${btnGhost} border-slate-700 bg-slate-900 text-slate-100`} onClick={logout} type="button">退出</button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          {[
            ['overview', '总览看板'],
            ['prompts', '提示词中心'],
            ['models', '模型与提供方'],
            ['users', '用户与会员'],
            ['messages', '运营消息'],
            ['presets', '预置内容'],
          ].map(([k, label]) => (
            <button
              key={k}
              className={`mb-1.5 w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                tab === k ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              onClick={() => setTab(k as TabKey)}
              type="button"
            >
              {label}
            </button>
          ))}
        </aside>

        <main className="space-y-4">
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}
          {loading ? <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">加载中...</div> : null}

          {tab === 'overview' && overview ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold">总览看板</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                {Object.entries(overview.metrics).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">{METRIC_LABELS[k] || k}</div>
                    <div className="mt-1 text-xl font-semibold">{v}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {tab === 'users' ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold">用户与会员</h2>
              <div className="mt-3 flex gap-2">
                <input className={`${baseInput} flex-1`} value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="手机号 / 昵称 / 用户ID" />
                <button className={btnGhost} onClick={loadUsers} type="button">搜索</button>
              </div>
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2 text-left">用户</th><th className="px-3 py-2 text-left">会员</th><th className="px-3 py-2 text-left">到期</th><th className="px-3 py-2 text-left">封禁</th><th className="px-3 py-2 text-left">操作</th></tr></thead>
                  <tbody>{users.map((item) => (<tr key={item.id} className="border-t border-slate-100"><td className="px-3 py-2">{item.displayName} / {item.phone}</td><td className="px-3 py-2">{item.subscriptionType}</td><td className="px-3 py-2">{item.subscriptionExpiresAt || '-'}</td><td className="px-3 py-2">{item.banned ? '是' : '否'}</td><td className="px-3 py-2"><div className="flex flex-wrap gap-2"><button className={btnGhost} onClick={() => void runWithNotice('升级VIP', async () => { await requestJson(`/api/ops/users/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionType: 'vip' }) }); await loadUsers(); }, '已升级为VIP')} type="button">升级VIP</button><button className={btnGhost} onClick={() => void runWithNotice(item.banned ? '解封用户' : '封禁用户', async () => { await requestJson(`/api/ops/users/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ banAction: item.banned ? 'unban' : 'ban' }) }); await loadUsers(); }, item.banned ? '已解封' : '已封禁24小时')} type="button">{item.banned ? '解封' : '封禁24h'}</button></div></td></tr>))}</tbody>
                </table>
              </div>
            </section>
          ) : null}

          {tab === 'messages' ? (
            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold">公告群发</h2>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <input className={baseInput} value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} placeholder="公告标题" />
                  <textarea className={`${baseInput} min-h-24`} value={broadcastContent} onChange={(e) => setBroadcastContent(e.target.value)} placeholder="公告内容" />
                  <div><button className={btnPrimary} type="button" onClick={() => void runWithNotice('发送公告', async () => { await requestJson('/api/ops/messages/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: broadcastTitle, content: broadcastContent }) }); setBroadcastTitle(''); setBroadcastContent(''); await loadMessages(); }, '公告已群发')}>发送公告</button></div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold">公告记录</h2>
                <div className="mt-3 space-y-2">{history.map((item, idx) => (<div key={`${item.sentAt}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"><div className="font-semibold">{item.title}</div><div className="mt-1 text-slate-700">{item.content}</div><div className="mt-1 text-xs text-slate-500">发送人：{item.sender || '-'} · 接收人数：{item.recipients} · {new Date(item.sentAt).toLocaleString()}</div></div>))}</div>
              </div>
            </section>
          ) : null}

          {tab === 'prompts' ? (
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                <h2 className="text-lg font-semibold text-slate-900">提示词中心</h2>
                <p className="mt-1 text-sm text-slate-700">
                  这是给教研老师使用的可视化编辑区，不需要写代码。按下面 3 步走，配置就能生效。
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                  {[
                    ['第1步', '先选学科、年级、模式，再点“查询版本”或“新建草稿”。'],
                    ['第2步', '在结构化编辑里填写老师人设、教学风格和输出格式。'],
                    ['第3步', '先“调试预览”，确认没问题后点“发布”。'],
                  ].map(([title, desc]) => (
                    <div key={title} className="rounded-xl border border-blue-200 bg-white/80 p-3">
                      <div className="text-sm font-bold text-blue-700">{title}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-700">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-sm font-bold text-slate-800">筛选范围</div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600">学科</span>
                    <select className={baseInput} value={promptSubject} onChange={(e) => setPromptSubject(e.target.value)}>
                      {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600">年级段</span>
                    <select className={baseInput} value={promptGrade} onChange={(e) => setPromptGrade(e.target.value)}>
                      {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600">模式</span>
                    <select className={baseInput} value={promptMode} onChange={(e) => setPromptMode(e.target.value as 'dialog' | 'quick')}>
                      <option value="dialog">对话模式</option>
                      <option value="quick">快速模式</option>
                    </select>
                  </label>
                  <div className="flex items-end gap-2">
                    <button className={btnGhost} onClick={loadPrompts} type="button">查询版本</button>
                    <button
                      className={btnPrimary}
                      onClick={() => void runWithNotice('创建草稿', async () => {
                        const data = await requestJson<{ item: PromptItem }>('/api/ops/knowledge-prompts', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ subject: promptSubject, gradeSegment: promptGrade, mode: promptMode }),
                        });
                        await loadPrompts();
                        setSelectedPromptId(data.item.id);
                        setShowVersionList(true);
                      }, '草稿已创建')}
                      type="button"
                    >
                      新建草稿
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
                <div className="rounded-xl border border-slate-200 p-4">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left text-sm font-bold text-slate-800"
                    onClick={() => setShowVersionList((v) => !v)}
                  >
                    <span>版本列表</span>
                    <span className="text-xs text-slate-500">{showVersionList ? '收起' : '展开'}</span>
                  </button>
                  {showVersionList ? (
                    <div className="mt-2 space-y-2">
                      {prompts.length > 0 ? prompts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPromptId(p.id)}
                          className={cn(
                            'w-full rounded-xl border p-3 text-left transition',
                            selectedPromptId === p.id
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-slate-200 bg-slate-50 hover:border-slate-300',
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-slate-900">v{p.version} · {p.name}</div>
                            <span className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-semibold',
                              p.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                            )}>
                              {p.status === 'published' ? '已发布' : '草稿'}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-slate-600">{new Date(p.updatedAt).toLocaleString()}</div>
                        </button>
                      )) : (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                          当前筛选条件下还没有版本，请先点击“新建草稿”。
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                      点击上方“展开”查看该学科的全部版本。
                    </div>
                  )}
                </div>

                <div>
                  {selectedPrompt ? (
                    <form
                      className="space-y-4 rounded-xl border border-slate-200 p-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!canEditSelectedPrompt) {
                          setNotice({ kind: 'error', title: '当前不可编辑', message: '已发布版本不可直接编辑，请新建草稿后修改。' });
                          return;
                        }
                        void runWithNotice('保存草稿', async () => {
                          await requestJson(`/api/ops/knowledge-prompts/${selectedPrompt.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(promptDraft),
                          });
                          await loadPrompts();
                        }, '草稿已保存');
                      }}
                    >
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="text-sm font-bold text-slate-800">结构化编辑与调试</div>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          你可以把它理解成“老师说话方式配置器”：不用写程序，只要按字段填写。每个字段都只负责一件事，避免互相冲突。
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          当前版本：v{selectedPrompt.version} · {selectedPrompt.name} · 状态：
                          {selectedPrompt.status === 'published' ? '已发布' : '草稿'}
                        </p>
                        {!canEditSelectedPrompt ? (
                          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                            已发布版本不可直接编辑。请先新建草稿，修改后再发布。
                          </p>
                        ) : null}
                      </div>

                      <label className="block space-y-1.5">
                        <span className="text-sm font-semibold text-slate-700">版本名称</span>
                        <p className="text-xs text-slate-500">建议写法：学科-年级-模式-风格，例如“数学-高中-对话-鼓励式”。</p>
                        <input className={baseInput} disabled={!canEditSelectedPrompt} value={promptDraft.name} onChange={(e) => setPromptDraft((d) => ({ ...d, name: e.target.value }))} placeholder="输入版本名称" />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-sm font-semibold text-slate-700">系统提示（角色设定）</span>
                        <p className="text-xs text-slate-500">写清楚：老师身份 + 学生对象 + 教学目标。这里决定老师“是什么样的人”。</p>
                        <textarea className={`${baseInput} min-h-24`} disabled={!canEditSelectedPrompt} value={promptDraft.systemPrompt} onChange={(e) => setPromptDraft((d) => ({ ...d, systemPrompt: e.target.value }))} placeholder="例如：你是高中数学老师，主要帮助基础薄弱学生建立二次函数概念..." />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-sm font-semibold text-slate-700">教学风格</span>
                        <p className="text-xs text-slate-500">写“怎么教”：语气、节奏、是否先问后讲、是否鼓励式反馈。</p>
                        <textarea className={`${baseInput} min-h-20`} disabled={!canEditSelectedPrompt} value={promptDraft.teachingStyle} onChange={(e) => setPromptDraft((d) => ({ ...d, teachingStyle: e.target.value }))} placeholder="例如：语气温和，先提问引导，再做简短讲解，每轮最多讲一个关键点..." />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-sm font-semibold text-slate-700">输出格式</span>
                        <p className="text-xs text-slate-500">写“回答长什么样”。建议固定三段，便于学生看懂和复盘。</p>
                        <textarea className={`${baseInput} min-h-20`} disabled={!canEditSelectedPrompt} value={promptDraft.outputFormat} onChange={(e) => setPromptDraft((d) => ({ ...d, outputFormat: e.target.value }))} placeholder="例如：固定输出为“本步反馈 / 需要补充的要点 / 下一步行动”..." />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-sm font-semibold text-slate-700">安全约束</span>
                        <p className="text-xs text-slate-500">写“不能做什么”。保证不会输出危险、违规、不适龄内容。</p>
                        <textarea className={`${baseInput} min-h-20`} disabled={!canEditSelectedPrompt} value={promptDraft.safetyConstraints} onChange={(e) => setPromptDraft((d) => ({ ...d, safetyConstraints: e.target.value }))} placeholder="例如：禁止违法危险指引，涉及医疗法律问题仅给学习建议并提醒咨询专业人士..." />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-sm font-semibold text-slate-700">禁发散规则</span>
                        <p className="text-xs text-slate-500">写“偏题时怎么办”。目标是把学生温和地拉回当前知识点。</p>
                        <textarea className={`${baseInput} min-h-20`} disabled={!canEditSelectedPrompt} value={promptDraft.antiDivergenceRules} onChange={(e) => setPromptDraft((d) => ({ ...d, antiDivergenceRules: e.target.value }))} placeholder="例如：用户偏题时先简短回应，再提示当前学习目标，并给一个回到主线的问题..." />
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button className={btnPrimary} disabled={!canEditSelectedPrompt} type="submit">保存草稿</button>
                        <button className={btnGhost} type="button" onClick={() => void runWithNotice('发布提示词', async () => {
                          await requestJson(`/api/ops/knowledge-prompts/${selectedPrompt.id}/publish`, { method: 'POST' });
                          await loadPrompts();
                        }, '版本已发布')}>发布</button>
                        <button className={btnGhost} type="button" onClick={() => void runWithNotice('回滚版本', async () => {
                          await requestJson(`/api/ops/knowledge-prompts/${selectedPrompt.id}/rollback`, { method: 'POST' });
                          await loadPrompts();
                        }, '已回滚并发布')}>回滚</button>
                        <button className={btnGhost} type="button" onClick={() => void runWithNotice('删除版本', async () => {
                          await requestJson(`/api/ops/knowledge-prompts/${selectedPrompt.id}`, { method: 'DELETE' });
                          await loadPrompts();
                          setSelectedPromptId('');
                        }, '版本已删除')}>删除</button>
                        <button className={btnGhost} type="button" onClick={() => void runWithNotice('调试预览', async () => {
                          const data = await requestJson<{ rendered: { mergedPrompt: string } }>('/api/ops/knowledge-prompts/debug', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              ...promptDraft,
                              variables: { subject: promptSubject, chapter: '函数', student_level: promptGrade, mode: promptMode },
                            }),
                          });
                          setRenderPreview(data.rendered?.mergedPrompt || '');
                        }, '预览已生成')}>调试预览</button>
                      </div>

                      {renderPreview ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-2 text-sm font-semibold text-slate-800">调试预览结果</div>
                          <pre className="whitespace-pre-wrap text-xs text-slate-700">{renderPreview}</pre>
                        </div>
                      ) : null}
                    </form>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                      还没有选中版本。请先展开左侧版本列表，或点击“新建草稿”。
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {tab === 'models' ? (
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold">模型与提供方</h2>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {(['llm', 'asr', 'tts', 'ocr'] as const).map((k) => (
                  <input key={k} className={baseInput} value={routeForm[k]} onChange={(e) => setRouteForm((r) => ({ ...r, [k]: e.target.value }))} placeholder={`${k.toUpperCase()}默认路由`} />
                ))}
              </div>
              <button className={btnPrimary} type="button" onClick={() => void runWithNotice('保存默认路由', async () => { await requestJson('/api/ops/models', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ defaultRoute: routeForm }) }); await loadModels(); }, '默认路由已保存')}>保存默认路由</button>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <select className={baseInput} value={providerForm.group} onChange={(e) => setProviderForm((p) => ({ ...p, group: e.target.value as ProviderGroupKey }))}><option value="llm">LLM</option><option value="asr">ASR</option><option value="tts">TTS</option><option value="ocr">OCR</option><option value="image">Image</option><option value="video">Video</option><option value="webSearch">WebSearch</option></select>
                <input className={baseInput} value={providerForm.id} onChange={(e) => setProviderForm((p) => ({ ...p, id: e.target.value }))} placeholder="提供方ID" />
                <input className={baseInput} value={providerForm.baseUrl} onChange={(e) => setProviderForm((p) => ({ ...p, baseUrl: e.target.value }))} placeholder="Base URL" />
                <input className={baseInput} value={providerForm.apiKey} onChange={(e) => setProviderForm((p) => ({ ...p, apiKey: e.target.value }))} placeholder="API Key（可空）" />
                <input className={baseInput} value={providerForm.models} onChange={(e) => setProviderForm((p) => ({ ...p, models: e.target.value }))} placeholder="模型列表（逗号分隔）" />
                <input className={baseInput} value={providerForm.proxy} onChange={(e) => setProviderForm((p) => ({ ...p, proxy: e.target.value }))} placeholder="代理地址（可空）" />
              </div>
              <div className="flex gap-2">
                <button className={btnPrimary} type="button" onClick={() => void runWithNotice('保存提供方', async () => { await requestJson('/api/ops/models', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(providerForm) }); await loadModels(); }, '提供方已保存并生效')}>保存提供方</button>
                <button className={btnGhost} type="button" onClick={() => void runWithNotice('删除提供方', async () => { await requestJson('/api/ops/models', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group: providerForm.group, id: providerForm.id }) }); await loadModels(); }, '提供方已删除')}>删除提供方</button>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {models
                  ? Object.entries(models.providers).flatMap(([group, rows]) =>
                      rows.map((row) => (
                        <button key={`${group}-${row.id}`} type="button" className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-left text-sm" onClick={() => setProviderForm({ group: group as ProviderGroupKey, id: row.id, apiKey: '', baseUrl: row.config.baseUrl || '', models: (row.config.models || []).join(','), proxy: '' })}>
                          <div className="font-medium text-slate-800">{row.id}</div>
                          <div className="text-slate-500">{group}</div>
                        </button>
                      )),
                    )
                  : null}
              </div>
            </section>
          ) : null}

          {tab === 'presets' ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold">预置内容</h2>
              <div className="mt-3 space-y-2">{presets.map((item) => (<div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"><div className="flex items-center justify-between gap-2"><div className="font-semibold">{item.title}</div><div className="flex gap-2"><button className={btnGhost} onClick={() => void runWithNotice('更新预置状态', async () => { await requestJson(`/api/ops/presets/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentType: item.contentType, title: item.title, payload: item.payload, sortOrder: item.sortOrder, isVisible: !item.isVisible }) }); await loadPresets(); }, '预置状态已更新')} type="button">{item.isVisible ? '设为隐藏' : '设为显示'}</button><button className={btnGhost} onClick={() => void runWithNotice('删除预置', async () => { await requestJson(`/api/ops/presets/${item.id}`, { method: 'DELETE' }); await loadPresets(); }, '预置已删除')} type="button">删除</button></div></div><div className="mt-1 text-slate-600">类型：{item.contentType} · 排序：{item.sortOrder}</div></div>))}</div>
            </section>
          ) : null}
        </main>
      </div>

      {notice ? (
        <div className="pointer-events-none fixed left-1/2 top-4 z-50 w-full max-w-xl -translate-x-1/2 px-4">
          <div
            className={cn(
              'rounded-xl border bg-white/95 px-4 py-3 shadow-lg backdrop-blur',
              notice.kind === 'loading' && 'border-blue-200 text-blue-800',
              notice.kind === 'success' && 'border-emerald-200 text-emerald-800',
              notice.kind === 'error' && 'border-red-200 text-red-800',
            )}
          >
            <div className="text-sm font-semibold">{notice.title}</div>
            <div className="mt-0.5 text-sm opacity-90">{notice.message}</div>
            {notice.kind === 'loading' ? (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500" />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
