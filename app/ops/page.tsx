'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type TabKey = 'overview' | 'prompts' | 'users' | 'messages';
type OpsUser = { username: string; displayName: string };
type Notice = { kind: 'loading' | 'success' | 'error'; title: string; message: string };

type PromptItem = {
  id: string;
  subject: string;
  gradeSegment: string;
  mode: 'dialog' | 'quick';
  stepKey: PromptStepKey;
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

type PromptDraft = {
  name: string;
  systemPrompt: string;
  teachingStyle: string;
  outputFormat: string;
  safetyConstraints: string;
  antiDivergenceRules: string;
};

type PromptStepKey = 'global' | 'step1' | 'step2' | 'step3' | 'step4' | 'step5';

const METRIC_LABELS: Record<string, string> = {
  totalUsers: '累计用户',
  newUsers7d: '近7天新增',
  newUsers30d: '近30天新增',
  activeUsers1d: '近1天活跃',
  activeUsers7d: '近7天活跃',
  calls7d: '近7天调用量',
  errorRate7d: '近7天错误率(%)',
  moderationBlockRate7d: '审核拦截率(%)',
  activeBans: '当前封禁数',
};
const FEATURE_LABELS: Record<string, string> = {
  knowledge: '知识宇宙',
  exercise: '互动练习',
  classroom: '教案课堂',
  'knowledge-universe': '知识宇宙',
  'lesson-classroom': '教案课堂',
  roundtable: '圆桌讨论',
  'interactive-practice': '互动练习',
  'pdf-tools': 'PDF 工具',
  'web-search': '网络搜索',
  'chat-completions': '对话生成',
  moderation: '内容审核',
  tts: '语音合成',
  asr: '语音识别',
  ocr: 'OCR 识别',
  login: '登录服务',
  register: '注册服务',
  announcement: '公告服务',
};
function getFeatureLabel(feature: string): string {
  const key = feature.trim();
  if (FEATURE_LABELS[key]) return FEATURE_LABELS[key];

  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized.includes('knowledge')) return '知识宇宙';
  if (normalized.includes('exercise')) return '互动练习';
  if (normalized.includes('classroom')) return '教案课堂';
  if (normalized.includes('roundtable')) return '圆桌讨论';
  return key;
}

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '道法', '通用'];
const GRADES = ['小学', '初中', '高中', '通用'];
const PROMPT_STEPS: Array<{ key: PromptStepKey; label: string; desc: string }> = [
  { key: 'global', label: '全局规则', desc: '控制老师整体人设、语气、安全边界。' },
  { key: 'step1', label: '第1步 核心概念', desc: '控制核心概念回忆、追问和纠偏。' },
  { key: 'step2', label: '第2步 易错点与重点', desc: '控制易错点、重点识别和补充。' },
  { key: 'step3', label: '第3步 公式/定理', desc: '控制公式定理回忆与适用条件。' },
  { key: 'step4', label: '第4步 典型例题', desc: '控制题型、条件、目标和解题步骤。' },
  { key: 'step5', label: '第5步 方法总结', desc: '控制方法归纳、复盘和迁移提醒。' },
];
const getPromptStepLabel = (key: PromptStepKey | string) =>
  PROMPT_STEPS.find((item) => item.key === key)?.label || '全局规则';
const NAV_ITEMS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'overview', label: '数据总览', icon: '01' },
  { key: 'users', label: '用户管理', icon: '02' },
  { key: 'prompts', label: '提示词中心', icon: '03' },
  { key: 'messages', label: '公告管理', icon: '04' },
];
const TAB_META: Record<TabKey, { title: string; subtitle: string }> = {
  overview: { title: '数据总览', subtitle: '查看新增用户、调用量、错误率和审核拦截趋势。' },
  prompts: { title: '提示词中心', subtitle: '可视化管理各学科老师提示词，支持草稿、发布和回滚。' },
  users: { title: '用户与会员', subtitle: '管理账号状态、会员等级以及封禁策略。' },
  messages: { title: '公告管理', subtitle: '发布平台公告，通知将展示在用户端消息区。' },
};

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
  const [promptStepKey, setPromptStepKey] = useState<PromptStepKey>('global');
  const [showVersionList, setShowVersionList] = useState(false);
  const [promptDraft, setPromptDraft] = useState<PromptDraft>(emptyPromptDraft);
  const [renderPreview, setRenderPreview] = useState('');

  const [users, setUsers] = useState<UserRow[]>([]);
  const [userQuery, setUserQuery] = useState('');

  const [history, setHistory] = useState<BroadcastHistoryItem[]>([]);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');

  const selectedPrompt = useMemo(
    () => prompts.find((item) => item.id === selectedPromptId) || null,
    [prompts, selectedPromptId],
  );
  const currentTabMeta = TAB_META[tab];
  const canEditSelectedPrompt = selectedPrompt?.status === 'draft';
  const overviewMetricEntries = useMemo(() => Object.entries(overview?.metrics || {}), [overview]);
  const overviewMaxMetricValue = useMemo(
    () => Math.max(...overviewMetricEntries.map(([, v]) => Number(v) || 0), 1),
    [overviewMetricEntries],
  );
  const featureUsageSorted = useMemo(
    () => [...(overview?.featureUsage7d || [])].sort((a, b) => b.total - a.total),
    [overview],
  );
  const featureUsageTotal = useMemo(
    () => featureUsageSorted.reduce((sum, item) => sum + item.total, 0),
    [featureUsageSorted],
  );
  const healthScore = useMemo(() => {
    if (!overview) return 100;
    const errorRate = Number(overview.metrics.errorRate7d || 0);
    const moderationRate = Number(overview.metrics.moderationBlockRate7d || 0);
    const activeBans = Number(overview.metrics.activeBans || 0);
    const score = 100 - errorRate * 2.2 - moderationRate * 1.3 - Math.min(activeBans, 30) * 0.7;
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [overview]);
  const healthColorClass =
    healthScore >= 85
      ? 'text-emerald-600'
      : healthScore >= 70
        ? 'text-amber-600'
        : 'text-rose-600';

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
    const params = new URLSearchParams({
      subject: promptSubject,
      gradeSegment: promptGrade,
      mode: promptMode,
      stepKey: promptStepKey,
    });
    const data = await requestJson<{ items: PromptItem[] }>(`/api/ops/knowledge-prompts?${params.toString()}`);
    const items = data.items || [];
    setPrompts(items);
    if (!selectedPromptId && items[0]) setSelectedPromptId(items[0].id);
    if (selectedPromptId && !items.find((i) => i.id === selectedPromptId)) {
      setSelectedPromptId(items[0]?.id || '');
    }
  }, [promptGrade, promptMode, promptStepKey, promptSubject, selectedPromptId]);

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
        if (tab === 'users') await loadUsers();
        if (tab === 'messages') await loadMessages();
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [loadMessages, loadOverview, loadPrompts, loadUsers, tab, user]);

  const logout = async () => {
    await fetch('/api/ops/auth/logout', { method: 'POST' });
    router.push('/ops/login');
  };

  if (!user) return null;

  return (
    <div className="h-dvh overflow-hidden bg-[#dfe3e8] text-slate-900">
      <div className="flex h-full w-full">
        <aside className="h-full w-[260px] shrink-0 overflow-y-auto border-r border-slate-800 bg-gradient-to-b from-[#141a2d] to-[#111729] text-slate-100">
          <div className="border-b border-slate-800/80 px-5 py-7">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-xl font-bold">知</div>
              <div>
                <div className="text-2xl font-bold tracking-wide">知识空间</div>
                <div className="text-xs text-slate-400">管理后台</div>
              </div>
            </div>
          </div>
          <nav className="space-y-1.5 p-3">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-lg transition',
                  tab === item.key
                    ? 'bg-indigo-900/60 font-semibold text-white shadow-inner shadow-indigo-900/60'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white',
                )}
                onClick={() => setTab(item.key)}
                type="button"
              >
                <span className={cn(
                  'grid h-7 w-7 place-items-center rounded-md text-xs',
                  tab === item.key ? 'bg-indigo-400/20 text-indigo-200' : 'bg-slate-700/40 text-slate-300',
                )}>
                  {item.icon}
                </span>
                <span className="text-base">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-8 py-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-[38px] font-bold leading-none tracking-tight text-slate-950">{currentTabMeta.title}</h1>
                <p className="mt-3 text-xl text-slate-400">{currentTabMeta.subtitle}</p>
              </div>
              <button className={btnPrimary} onClick={logout} type="button">退出登录</button>
            </div>
          </header>

          <div className="flex-1 p-6">
            <main className="space-y-4">
              {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}
              {loading ? <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">加载中...</div> : null}
              {tab === 'overview' && overview ? (
                <section className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {overviewMetricEntries.map(([k, v], idx) => {
                      const value = Number(v) || 0;
                      const ratio = Math.max(6, Math.min(100, Math.round((value / overviewMaxMetricValue) * 100)));
                      const bgClass = ['from-blue-50 to-indigo-50', 'from-cyan-50 to-sky-50', 'from-emerald-50 to-teal-50', 'from-violet-50 to-fuchsia-50'][idx % 4];
                      return (
                        <div key={k} className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${bgClass} p-4 shadow-sm`}>
                          <div className="text-xs font-semibold text-slate-600">{METRIC_LABELS[k] || k}</div>
                          <div className="mt-2 text-2xl font-bold text-slate-900">{value.toLocaleString()}</div>
                          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/80">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${ratio}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-slate-900">功能调用占比（近7天）</h2>
                        <span className="text-xs text-slate-500">总调用 {featureUsageTotal.toLocaleString()}</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {featureUsageSorted.length ? (
                          featureUsageSorted.map((item, idx) => {
                            const ratio = featureUsageTotal > 0 ? (item.total / featureUsageTotal) * 100 : 0;
                            const barColor = ['bg-blue-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-violet-500'][idx % 5];
                            return (
                              <div key={`${item.feature}-${idx}`} className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-semibold text-slate-700">{getFeatureLabel(item.feature)}</span>
                                  <span className="text-slate-500">{item.total.toLocaleString()} 次 · {ratio.toFixed(1)}%</span>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(2, ratio)}%` }} />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">暂无功能调用数据</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <h2 className="text-base font-bold text-slate-900">平台健康指数</h2>
                      <p className="mt-1 text-xs text-slate-500">根据错误率、审核拦截率和封禁数综合计算</p>
                      <div className="mt-4 flex items-center gap-4">
                        <div
                          className="grid h-28 w-28 place-items-center rounded-full"
                          style={{
                            background: `conic-gradient(#3b82f6 ${healthScore * 3.6}deg, #e2e8f0 0deg)`,
                          }}
                        >
                          <div className="grid h-22 w-22 place-items-center rounded-full bg-white">
                            <div className={cn('text-2xl font-extrabold', healthColorClass)}>{healthScore}</div>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between gap-5">
                            <span className="text-slate-500">错误率</span>
                            <span className="font-semibold text-slate-800">{Number(overview.metrics.errorRate7d || 0).toFixed(2)}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-5">
                            <span className="text-slate-500">审核拦截率</span>
                            <span className="font-semibold text-slate-800">{Number(overview.metrics.moderationBlockRate7d || 0).toFixed(2)}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-5">
                            <span className="text-slate-500">封禁用户</span>
                            <span className="font-semibold text-slate-800">{Number(overview.metrics.activeBans || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
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
                      <tbody>{users.map((item) => (<tr key={item.id} className="border-t border-slate-100"><td className="px-3 py-2">{item.displayName} / {item.phone}</td><td className="px-3 py-2">{item.subscriptionType}</td><td className="px-3 py-2">{item.subscriptionExpiresAt || '-'}</td><td className="px-3 py-2">{item.banned ? '是' : '否'}</td><td className="px-3 py-2"><div className="flex flex-wrap gap-2"><button className={btnGhost} onClick={() => void runWithNotice(item.subscriptionType === 'vip' ? '\u53d8\u4e3a\u666e\u901a\u7528\u6237' : '\u5347\u7ea7VIP', async () => { await requestJson(`/api/ops/users/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.subscriptionType === 'vip' ? { subscriptionType: 'free', subscriptionExpiresAt: null } : { subscriptionType: 'vip' }) }); await loadUsers(); }, item.subscriptionType === 'vip' ? '\u5df2\u53d8\u4e3a\u666e\u901a\u7528\u6237' : '\u5df2\u5347\u7ea7\u4e3aVIP')} type="button">{item.subscriptionType === 'vip' ? '\u53d8\u4e3a\u666e\u901a\u7528\u6237' : '\u5347\u7ea7VIP'}</button><button className={btnGhost} onClick={() => void runWithNotice(item.banned ? '解封用户' : '封禁用户', async () => { await requestJson(`/api/ops/users/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ banAction: item.banned ? 'unban' : 'ban' }) }); await loadUsers(); }, item.banned ? '已解封' : '已封禁24小时')} type="button">{item.banned ? '解封' : '封禁24h'}</button></div></td></tr>))}</tbody>
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
                  这是给教研老师使用的可视化编辑区，不需要写代码。支持按“全局规则 + 知识宇宙 5 步”分别配置，发布后用户端会按当前步骤自动读取。
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                  {[
                    ['第1步', '先选学科、年级、模式和知识宇宙步骤。'],
                    ['第2步', '填写该老师在这个步骤里的角色、风格、输出格式和边界。'],
                    ['第3步', '先“调试预览”，确认没问题后发布，用户端立即按步骤生效。'],
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
                <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
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
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600">知识宇宙步骤</span>
                    <select className={baseInput} value={promptStepKey} onChange={(e) => setPromptStepKey(e.target.value as PromptStepKey)}>
                      {PROMPT_STEPS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
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
                          body: JSON.stringify({ subject: promptSubject, gradeSegment: promptGrade, mode: promptMode, stepKey: promptStepKey }),
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
                            <div className="text-sm font-semibold text-slate-900">v{p.version} · {getPromptStepLabel(p.stepKey)} · {p.name}</div>
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
                          {selectedPrompt.status === 'published' ? '已发布' : '草稿'} · 生效步骤：{getPromptStepLabel(selectedPrompt.stepKey)}
                        </p>
                        <p className="mt-2 rounded-md border border-blue-100 bg-white px-2 py-1 text-xs leading-5 text-slate-600">
                          当前正在编辑“{getPromptStepLabel(selectedPrompt.stepKey)}”。如果选“全局规则”，它会影响这个学科老师的整体人设；如果选第 1-5 步，它只会在知识宇宙运行到对应步骤时叠加生效。
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
                              variables: {
                                subject: promptSubject,
                                chapter: '函数',
                                student_level: promptGrade,
                                mode: promptMode,
                                step: getPromptStepLabel(promptStepKey),
                              },
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

        </main>
      </div>
        </div>
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
