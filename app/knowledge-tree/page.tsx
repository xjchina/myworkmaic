'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';
import {
  type KnowledgeNodeStatus,
  type KnowledgeTreeNode,
  readKnowledgeTreeNodes,
  removeKnowledgeTreeNode,
  upsertKnowledgeTreeNode,
  updateKnowledgeTreeNodeStatus,
} from '@/lib/knowledge/tree-persistence';

const STATUS_META: Record<KnowledgeNodeStatus, { label: string; className: string }> = {
  done: { label: '已掌握', className: 'done' },
  doing: { label: '学习中', className: 'doing' },
  todo: { label: '待学习', className: 'todo' },
};

const SUBJECTS = [
  { name: '语文', icon: '📚', styleKey: 'chinese' },
  { name: '数学', icon: '📐', styleKey: 'math' },
  { name: '英语', icon: '🔤', styleKey: 'english' },
  { name: '物理', icon: '⚛️', styleKey: 'physics' },
  { name: '化学', icon: '⚗️', styleKey: 'chemistry' },
  { name: '历史', icon: '📜', styleKey: 'history' },
  { name: '道法', icon: '⚖️', styleKey: 'morality' },
  { name: '生物', icon: '🧬', styleKey: 'biology' },
  { name: '地理', icon: '🌍', styleKey: 'geography' },
] as const;

const TREE_UI_STATE_KEY = 'knowledge-tree:expand-state:v2';

interface MinorPoint {
  id: string;
  title: string;
  node: KnowledgeTreeNode;
}

interface MajorPoint {
  key: string;
  title: string;
  points: MinorPoint[];
}

interface SubjectCard {
  key: string;
  name: string;
  icon: string;
  styleKey: string;
  total: number;
  majors: MajorPoint[];
}

function readTreeUiState(): {
  expandedSubjects: Record<string, boolean>;
  expandedModuleBySubject: Record<string, string | null>;
} {
  if (typeof window === 'undefined') {
    return { expandedSubjects: {}, expandedModuleBySubject: {} };
  }
  try {
    const raw = window.localStorage.getItem(TREE_UI_STATE_KEY);
    if (!raw) return { expandedSubjects: {}, expandedModuleBySubject: {} };
    const parsed = JSON.parse(raw) as {
      expandedSubjects?: Record<string, boolean>;
      expandedModuleBySubject?: Record<string, string | null>;
    };
    return {
      expandedSubjects: parsed.expandedSubjects || {},
      expandedModuleBySubject: parsed.expandedModuleBySubject || {},
    };
  } catch {
    return { expandedSubjects: {}, expandedModuleBySubject: {} };
  }
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('zh-CN');
}

function monthKey(ts: number) {
  const date = new Date(ts);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function startOfDay(ts: number) {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function computeStreak(nodes: KnowledgeTreeNode[]) {
  if (nodes.length === 0) return 0;
  const daySet = new Set(nodes.map((item) => startOfDay(item.updatedAt)));
  let cursor = startOfDay(Date.now());
  if (!daySet.has(cursor)) cursor -= 24 * 60 * 60 * 1000;

  let streak = 0;
  while (daySet.has(cursor)) {
    streak += 1;
    cursor -= 24 * 60 * 60 * 1000;
  }
  return streak;
}

function normalizeSubject(raw: string): string {
  const text = String(raw || '').trim();
  if (!text) return '未分类';
  if (text === '道德与法治' || text === '政治') return '道法';
  if (text.includes('道德') || text.includes('法治') || text.includes('政治')) return '道法';
  return text;
}

function splitChapterPath(chapter: string): string[] {
  const source = String(chapter || '').trim();
  if (!source) return ['未命名知识点'];
  const parts = source
    .split(/\s*(?:>|：|:|\/|\\|->|→|::|·|、)\s*/g)
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [source];
}

function buildSubjectCards(nodes: KnowledgeTreeNode[]): SubjectCard[] {
  const subjectMap = new Map<string, { icon: string; styleKey: string; majors: Map<string, MinorPoint[]> }>();

  for (const subject of SUBJECTS) {
    subjectMap.set(subject.name, {
      icon: subject.icon,
      styleKey: subject.styleKey,
      majors: new Map(),
    });
  }

  for (const node of nodes) {
    const normalizedSubject = normalizeSubject(node.subject);
    if (!subjectMap.has(normalizedSubject)) {
      subjectMap.set(normalizedSubject, { icon: '📘', styleKey: 'other', majors: new Map() });
    }

    const segments = splitChapterPath(node.chapter);
    const major = segments[0] || '未分类模块';
    const minor = segments.length > 1 ? segments.slice(1).join(' / ') : major;

    const subjectData = subjectMap.get(normalizedSubject)!;
    if (!subjectData.majors.has(major)) subjectData.majors.set(major, []);
    subjectData.majors.get(major)!.push({
      id: node.id,
      title: minor,
      node: { ...node, subject: normalizedSubject },
    });
  }

  const orderedNames = [
    ...SUBJECTS.map((s) => s.name),
    ...Array.from(subjectMap.keys()).filter((name) => !SUBJECTS.some((s) => s.name === name)),
  ];

  return orderedNames.map((name) => {
    const subjectData = subjectMap.get(name)!;
    const majors = Array.from(subjectData.majors.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'zh'))
      .map(([majorTitle, points]) => ({
        key: `${name}::${majorTitle}`,
        title: majorTitle,
        points: points.slice().sort((a, b) => a.title.localeCompare(b.title, 'zh')),
      }));

    return {
      key: name,
      name,
      icon: subjectData.icon,
      styleKey: subjectData.styleKey,
      total: majors.reduce((sum, major) => sum + major.points.length, 0),
      majors,
    };
  });
}

export default function KnowledgeTreePage() {
  const { isLoggedIn } = useAuthGuard();
  const [nodes, setNodes] = useState<KnowledgeTreeNode[]>([]);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | KnowledgeNodeStatus>('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSubject, setManualSubject] = useState('');
  const [manualChapter, setManualChapter] = useState('');
  const [manualKeywords, setManualKeywords] = useState('');
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Record<string, boolean>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>(
    () => readTreeUiState().expandedSubjects,
  );
  const [expandedModuleBySubject, setExpandedModuleBySubject] = useState<Record<string, string | null>>(
    () => readTreeUiState().expandedModuleBySubject,
  );

  const reload = useCallback(() => {
    setNodes(readKnowledgeTreeNodes());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => reload(), 0);
    const onFocus = () => reload();
    const onStorage = () => reload();
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [reload]);

  useEffect(() => {
    window.localStorage.setItem(
      TREE_UI_STATE_KEY,
      JSON.stringify({ expandedSubjects, expandedModuleBySubject }),
    );
  }, [expandedSubjects, expandedModuleBySubject]);

  const subjects = useMemo(() => {
    const normalized = nodes.map((item) => normalizeSubject(item.subject));
    const dynamic = Array.from(new Set(normalized)).sort((a, b) => a.localeCompare(b, 'zh'));
    const fixed = SUBJECTS.map((s) => s.name).filter((name) => dynamic.includes(name));
    const other = dynamic.filter((name) => !SUBJECTS.some((s) => s.name === name));
    return [...fixed, ...other];
  }, [nodes]);

  const months = useMemo(() => {
    return Array.from(new Set(nodes.map((item) => monthKey(item.createdAt)))).sort((a, b) => b.localeCompare(a));
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return nodes.filter((item) => {
      const normalizedSubject = normalizeSubject(item.subject);
      if (subjectFilter !== 'all' && normalizedSubject !== subjectFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (monthFilter !== 'all' && monthKey(item.createdAt) !== monthFilter) return false;
      if (!query) return true;
      const haystack = `${normalizedSubject} ${item.chapter} ${item.summary} ${item.keywords.join(' ')}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [monthFilter, nodes, search, statusFilter, subjectFilter]);

  const subjectCards = useMemo(() => buildSubjectCards(filteredNodes), [filteredNodes]);
  const totalTreePoints = useMemo(
    () => subjectCards.reduce((sum, item) => sum + item.total, 0),
    [subjectCards],
  );

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthAdded = nodes.filter((item) => monthKey(item.createdAt) === thisMonth).length;
    const total = nodes.length;
    const done = nodes.filter((item) => item.status === 'done').length;
    const masteryRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { monthAdded, total, masteryRate, streak: computeStreak(nodes) };
  }, [nodes]);

  const effectiveSelectedNodeId = useMemo(() => {
    if (filteredNodes.length === 0) return null;
    if (selectedNodeId && filteredNodes.some((item) => item.id === selectedNodeId)) return selectedNodeId;
    return filteredNodes[0].id;
  }, [filteredNodes, selectedNodeId]);

  const handleStatusChange = (id: string, status: KnowledgeNodeStatus) => {
    setNodes(updateKnowledgeTreeNodeStatus(id, status));
  };

  const handleDelete = (id: string) => {
    const confirmed = window.confirm('确定删除这个知识点吗？');
    if (!confirmed) return;
    setNodes(removeKnowledgeTreeNode(id));
  };

  const handleToggleCollapse = (id: string) => {
    setCollapsedNodeIds((prev) => ({ ...prev, [id]: prev[id] === false ? true : false }));
  };

  const handleAddManual = () => {
    const subject = normalizeSubject(manualSubject.trim());
    const chapter = manualChapter.trim();
    if (!subject || !chapter) return;
    const keywords = manualKeywords.split(/[，,、]/).map((item) => item.trim()).filter(Boolean);

    setNodes(
      upsertKnowledgeTreeNode({
        subject,
        chapter,
        summary: '手动新增知识点',
        keywords,
        sourceMode: 'manual',
        status: 'todo',
      }),
    );

    setManualOpen(false);
    setManualSubject('');
    setManualChapter('');
    setManualKeywords('');
  };

  const handleToggleSubject = (subjectName: string, hasContent: boolean) => {
    if (!hasContent) return;
    setExpandedSubjects((prev) => {
      const nextOpen = !prev[subjectName];
      if (!nextOpen) {
        setExpandedModuleBySubject((prevModules) => ({ ...prevModules, [subjectName]: null }));
      }
      return { ...prev, [subjectName]: nextOpen };
    });
  };

  const handleToggleMajor = (subjectName: string, majorKey: string) => {
    setExpandedModuleBySubject((prev) => {
      const current = prev[subjectName] || null;
      return { ...prev, [subjectName]: current === majorKey ? null : majorKey };
    });
  };

  if (!isLoggedIn) return null;

  return (
    <AppShell
      activeKey="knowledge-tree"
      title="🌳 知识树"
      description="把知识宇宙中的学习结果沉淀为可追踪、可复习的分层知识树。"
      actions={
        <>
          <select className="month-select" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
            <option value="all">全部月份</option>
            {months.map((month) => (
              <option value={month} key={month}>
                {month}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" type="button" onClick={() => setManualOpen((v) => !v)}>
            {manualOpen ? '取消新增' : '手动新增'}
          </button>
          <Link href="/knowledge-select" className="btn btn-primary">
            进入知识宇宙
          </Link>
        </>
      }
    >
      <div className="knowledge-layout">
        <aside className="tree-panel">
          <section className="tree-card sticky">
            <div className="card-title">📚 知识树总览</div>
            {totalTreePoints === 0 ? (
              <div className="tree-empty">
                <div className="tree-empty-title">📚 知识树总览</div>
                <div className="tree-empty-desc">目前还没有收录任何知识点，快去添加吧！</div>
              </div>
            ) : (
              <div className="subject-list">
                {subjectCards.map((subject) => {
                  const expanded = Boolean(expandedSubjects[subject.name]);
                  const hasContent = subject.total > 0;
                  return (
                    <div
                      key={subject.key}
                      className={`subject-card subject-${subject.styleKey} ${expanded ? 'expanded' : ''} ${hasContent ? '' : 'empty-subject'}`}
                    >
                      <button
                        type="button"
                        className="subject-header"
                        onClick={() => handleToggleSubject(subject.name, hasContent)}
                        disabled={!hasContent}
                      >
                        <div className="subject-left">
                          <span className="subject-icon" aria-hidden="true">
                            {subject.icon}
                          </span>
                          <span className="subject-name">{subject.name}</span>
                          {hasContent ? (
                            <span className="subject-count">（{subject.total} 个知识点）</span>
                          ) : (
                            <span className="subject-empty-tag">暂无知识点</span>
                          )}
                        </div>
                        {hasContent && <span className={`subject-arrow ${expanded ? 'up' : ''}`}>▼</span>}
                      </button>

                      <div className={`subject-content ${expanded ? 'open' : ''}`}>
                        {subject.majors.map((major) => {
                          const majorOpen = expandedModuleBySubject[subject.name] === major.key;
                          return (
                            <div key={major.key} className="major-item">
                              <button type="button" className="major-header" onClick={() => handleToggleMajor(subject.name, major.key)}>
                                <span className="major-title">{major.title}</span>
                                <span className="major-meta">
                                  <span className="major-count">{major.points.length}</span>
                                  <span className={`major-arrow ${majorOpen ? 'up' : ''}`}>▼</span>
                                </span>
                              </button>
                              <div className={`minor-list-wrap ${majorOpen ? 'open' : ''}`}>
                                <ul className="minor-list">
                                  {major.points.map((point) => (
                                    <li key={point.id}>
                                      <button
                                        type="button"
                                        className={`minor-item ${effectiveSelectedNodeId === point.id ? 'active' : ''}`}
                                        onClick={() => setSelectedNodeId(point.id)}
                                        title={`${point.node.chapter} · ${STATUS_META[point.node.status].label}`}
                                      >
                                        {point.title}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </aside>

        <div className="content-panel">
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value">{stats.monthAdded}</div>
              <div className="stat-label">本月新增知识点</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">总知识点</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.masteryRate}%</div>
              <div className="stat-label">掌握度</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.streak}</div>
              <div className="stat-label">连续学习天数</div>
            </div>
          </div>

          {manualOpen && (
            <section className="manual-card">
              <h3>手动新增知识点</h3>
              <div className="manual-grid">
                <input value={manualSubject} onChange={(e) => setManualSubject(e.target.value)} placeholder="学科（如：数学）" />
                <input value={manualChapter} onChange={(e) => setManualChapter(e.target.value)} placeholder="章节（如：函数 > 二次函数）" />
                <input value={manualKeywords} onChange={(e) => setManualKeywords(e.target.value)} placeholder="关键词（逗号分隔）" />
                <button className="btn btn-primary" type="button" onClick={handleAddManual}>
                  保存到知识树
                </button>
              </div>
            </section>
          )}

          <section className="filter-card">
            <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索章节、关键词、总结..." />
            <div className="filter-row">
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                <option value="all">全部学科</option>
                {subjects.map((subject) => (
                  <option value={subject} key={subject}>
                    {subject}
                  </option>
                ))}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | KnowledgeNodeStatus)}>
                <option value="all">全部状态</option>
                <option value="done">已掌握</option>
                <option value="doing">学习中</option>
                <option value="todo">待学习</option>
              </select>
            </div>
          </section>

          <section className="list-card">
            <div className="card-title">📎 知识点明细</div>
            {filteredNodes.length === 0 ? (
              <div className="empty">当前筛选条件下暂无知识点。</div>
            ) : (
              <div className="node-list">
                {filteredNodes.map((node) => (
                  <article key={node.id} className={`node-card ${effectiveSelectedNodeId === node.id ? 'active' : ''}`}>
                    <div className="node-head">
                      <button type="button" className="node-title-btn" onClick={() => setSelectedNodeId(node.id)}>
                        <h4>{node.chapter}</h4>
                        <p>
                          {normalizeSubject(node.subject)} · 最近更新 {formatDate(node.updatedAt)}
                        </p>
                      </button>
                      <div className="node-head-actions">
                        <button className="collapse-btn" type="button" onClick={() => handleToggleCollapse(node.id)}>
                          {collapsedNodeIds[node.id] === false ? '收起' : '展开'}
                        </button>
                        <div className="status-actions-inline">
                          {(Object.keys(STATUS_META) as KnowledgeNodeStatus[]).map((status) => (
                            <button
                              type="button"
                              key={status}
                              className={`status-btn compact ${node.status === status ? 'active' : ''} ${STATUS_META[status].className}`}
                              onClick={() => handleStatusChange(node.id, status)}
                            >
                              {STATUS_META[status].label}
                            </button>
                          ))}
                        </div>
                        <button className="delete-btn" type="button" onClick={() => handleDelete(node.id)}>
                          删除
                        </button>
                      </div>
                    </div>

                    {collapsedNodeIds[node.id] === false && (
                      <>
                        {node.keywords.length > 0 && (
                          <div className="keywords">
                            {node.keywords.map((keyword) => (
                              <span key={keyword} className="keyword">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="summary">{node.summary || '暂无总结'}</p>
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="achievement-card">
            <div className="card-title">🎯 学习成就</div>
            <div className="achievements">
              <div className={`achievement ${stats.streak >= 7 ? 'unlocked' : 'locked'}`}>连续学习 7 天</div>
              <div className={`achievement ${stats.total >= 10 ? 'unlocked' : 'locked'}`}>累计 10 个知识点</div>
              <div className={`achievement ${stats.masteryRate >= 60 ? 'unlocked' : 'locked'}`}>掌握率达 60%</div>
              <div className={`achievement ${stats.total >= 50 ? 'unlocked' : 'locked'}`}>累计 50 个知识点</div>
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        .btn { padding: 10px 16px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 600; border: none; cursor: pointer; height: 40px; display: inline-flex; align-items: center; }
        .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .btn-secondary { background: white; border: 1px solid #e2e8f0; color: #334155; }
        .month-select { height: 40px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0 10px; background: white; color: #334155; font-size: 14px; }
        .knowledge-layout { display: grid; grid-template-columns: minmax(310px, 390px) minmax(0, 1fr); gap: 18px; align-items: start; }
        .tree-panel, .content-panel { min-width: 0; }
        .sticky { position: sticky; top: 14px; }
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 18px; }
        .stat-card { background: white; border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06); }
        .stat-value { font-size: 30px; font-weight: 700; color: #1a365d; line-height: 1.2; }
        .stat-label { margin-top: 4px; color: #718096; font-size: 13px; }
        .manual-card, .filter-card, .tree-card, .list-card, .achievement-card { background: white; border-radius: 18px; padding: 22px; margin-bottom: 18px; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06); }
        .tree-card { border: 1px solid #e6edf8; }
        .card-title { font-size: 17px; font-weight: 700; color: #1a365d; margin-bottom: 14px; }
        .tree-empty { border: 1px dashed #cbd5e1; border-radius: 12px; padding: 26px 16px; text-align: center; color: #64748b; background: #f8fafc; }
        .tree-empty-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; color: #334155; }
        .tree-empty-desc { font-size: 14px; }
        .subject-list { display: flex; flex-direction: column; gap: 10px; max-height: calc(100vh - 270px); overflow: auto; padding-right: 4px; }
        .subject-card { --subject-main: #2563eb; --subject-soft: #f5f9ff; --subject-soft-hover: #e8f1ff; --subject-border: #dbeafe; background: var(--subject-soft); border: 1px solid var(--subject-border); border-radius: 14px; transition: box-shadow 0.2s ease, background 0.2s ease; }
        .subject-card.expanded { box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08); background: var(--subject-soft-hover); }
        .subject-card.empty-subject { background: #fbfcfd; border-color: #edf2f7; }
        .subject-header { width: 100%; border: none; background: transparent; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 16px; border-radius: 14px; cursor: pointer; color: #1f2937; text-align: left; transition: background 0.2s ease, transform 0.15s ease; }
        .subject-header:hover { background: var(--subject-soft-hover); }
        .subject-header:active { transform: scale(0.995); }
        .subject-header:disabled { cursor: not-allowed; color: #9ca3af; }
        .subject-left { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
        .subject-icon { font-size: 16px; line-height: 1; }
        .subject-name { font-size: 16px; font-weight: 600; color: #1f2937; }
        .subject-count { font-size: 14px; color: #64748b; }
        .subject-empty-tag { font-size: 14px; color: #9ca3af; }
        .empty-subject .subject-name, .empty-subject .subject-icon { color: #9ca3af; opacity: 0.85; }
        .subject-arrow, .major-arrow { font-size: 14px; color: #475569; transition: transform 0.2s ease; transform: rotate(0deg); }
        .subject-arrow.up, .major-arrow.up { transform: rotate(180deg); }
        .subject-content { display: none; }
        .subject-content.open { display: block; padding: 0 8px 10px; animation: fadeInSoft 0.16s ease-out; }
        .major-item { margin-left: 16px; margin-top: 6px; }
        .major-header { width: calc(100% - 2px); border: 1px solid var(--subject-border); background: #eef4ff; border-radius: 10px; padding: 9px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; color: #334155; font-size: 15px; font-weight: 600; }
        .major-title { flex: 1; text-align: center; }
        .major-meta { display: inline-flex; align-items: center; gap: 8px; }
        .major-count { min-width: 22px; height: 22px; border-radius: 999px; border: 1px solid #cbd5e1; background: white; font-size: 12px; color: #475569; display: inline-flex; align-items: center; justify-content: center; }
        .minor-list-wrap { display: none; }
        .minor-list-wrap.open { display: block; animation: fadeInSoft 0.14s ease-out; }
        .minor-list { list-style: none; margin: 6px 0 0; padding: 0 0 0 16px; border-left: 1px solid #d1d5db; }
        .minor-item { width: 100%; border: none; background: transparent; text-align: left; padding: 7px 0 7px 10px; font-size: 14px; color: #334155; cursor: pointer; border-bottom: 1px solid #e5e7eb; }
        .minor-item:hover { color: var(--subject-main); }
        .minor-item.active { color: var(--subject-main); font-weight: 600; }
        .subject-chinese { --subject-main: #f97316; --subject-soft: #fff8f1; --subject-soft-hover: #ffefe2; --subject-border: #fdba74; }
        .subject-math { --subject-main: #2563eb; --subject-soft: #f5f9ff; --subject-soft-hover: #e8f1ff; --subject-border: #93c5fd; }
        .subject-english { --subject-main: #0ea5e9; --subject-soft: #f3fbff; --subject-soft-hover: #e4f6ff; --subject-border: #7dd3fc; }
        .subject-physics { --subject-main: #8b5cf6; --subject-soft: #f8f5ff; --subject-soft-hover: #eee7ff; --subject-border: #c4b5fd; }
        .subject-chemistry { --subject-main: #14b8a6; --subject-soft: #f2fffc; --subject-soft-hover: #e3fbf6; --subject-border: #99f6e4; }
        .subject-history { --subject-main: #a16207; --subject-soft: #fffdf4; --subject-soft-hover: #fff7de; --subject-border: #fcd34d; }
        .subject-morality { --subject-main: #db2777; --subject-soft: #fff6fb; --subject-soft-hover: #ffeaf5; --subject-border: #f9a8d4; }
        .subject-biology { --subject-main: #16a34a; --subject-soft: #f5fff8; --subject-soft-hover: #e8fcee; --subject-border: #86efac; }
        .subject-geography { --subject-main: #0891b2; --subject-soft: #f3feff; --subject-soft-hover: #e3fafe; --subject-border: #67e8f9; }
        @keyframes fadeInSoft {
          from { opacity: 0; transform: translateY(-2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .manual-card h3 { margin: 0 0 12px; color: #1a365d; font-size: 16px; }
        .manual-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .manual-grid input { height: 40px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0 12px; font-size: 14px; color: #334155; }
        .search-input { width: 100%; height: 42px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0 12px; font-size: 14px; margin-bottom: 10px; }
        .filter-row { display: flex; gap: 10px; }
        .filter-row select { flex: 1; height: 38px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0 10px; }
        .node-list { display: flex; flex-direction: column; gap: 12px; }
        .node-card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; background: #fbfdff; }
        .node-card.active { border-color: #818cf8; box-shadow: 0 0 0 2px #e0e7ff; }
        .node-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
        .node-head-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .node-title-btn { border: none; background: transparent; text-align: left; padding: 0; cursor: pointer; flex: 1; min-width: 0; }
        .node-head h4 { margin: 0; font-size: 16px; color: #0f172a; }
        .node-head p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
        .delete-btn { border: none; background: #fee2e2; color: #991b1b; border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
        .collapse-btn { border: 1px solid #cbd5e1; background: #ffffff; color: #334155; border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
        .keywords { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; }
        .keyword { padding: 4px 10px; background: #eef2ff; color: #4338ca; border-radius: 999px; font-size: 12px; }
        .summary { margin: 10px 0; font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-wrap; }
        .status-actions-inline { display: inline-flex; gap: 6px; flex-wrap: wrap; }
        .status-btn { border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; background: white; color: #334155; white-space: nowrap; }
        .status-btn.compact { padding: 5px 9px; font-size: 12px; border-radius: 999px; }
        .status-btn.active.done { border-color: #22c55e; background: #dcfce7; color: #166534; }
        .status-btn.active.doing { border-color: #f59e0b; background: #fef3c7; color: #92400e; }
        .status-btn.active.todo { border-color: #38bdf8; background: #e0f2fe; color: #0c4a6e; }
        .empty { padding: 30px 16px; border: 1px dashed #cbd5e1; border-radius: 12px; text-align: center; color: #64748b; background: #f8fafc; font-size: 14px; }
        .achievements { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .achievement { border-radius: 12px; padding: 14px; text-align: center; font-size: 13px; font-weight: 600; }
        .achievement.unlocked { background: #ecfdf5; color: #166534; border: 1px solid #86efac; }
        .achievement.locked { background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; }
        @media (max-width: 1200px) {
          .knowledge-layout { grid-template-columns: 1fr; }
          .sticky { position: static; }
          .stats-row, .achievements { grid-template-columns: repeat(2, 1fr); }
          .manual-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 768px) {
          .stats-row, .achievements, .manual-grid { grid-template-columns: 1fr; }
          .filter-row { flex-direction: column; }
          .node-head { flex-direction: column; }
          .node-head-actions { width: 100%; }
        }
      `}</style>
    </AppShell>
  );
}
