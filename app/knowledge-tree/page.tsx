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

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString();
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

  const subjects = useMemo(() => {
    return Array.from(new Set(nodes.map((item) => item.subject))).sort((a, b) => a.localeCompare(b, 'zh'));
  }, [nodes]);

  const months = useMemo(() => {
    return Array.from(new Set(nodes.map((item) => monthKey(item.createdAt)))).sort((a, b) => b.localeCompare(a));
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return nodes.filter((item) => {
      if (subjectFilter !== 'all' && item.subject !== subjectFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (monthFilter !== 'all' && monthKey(item.createdAt) !== monthFilter) return false;
      if (!query) return true;
      const haystack = `${item.subject} ${item.chapter} ${item.summary} ${item.keywords.join(' ')}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [monthFilter, nodes, search, statusFilter, subjectFilter]);

  const groupedBySubject = useMemo(() => {
    const map = new Map<string, KnowledgeTreeNode[]>();
    for (const node of filteredNodes) {
      if (!map.has(node.subject)) map.set(node.subject, []);
      map.get(node.subject)!.push(node);
    }
    return Array.from(map.entries());
  }, [filteredNodes]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthAdded = nodes.filter((item) => monthKey(item.createdAt) === thisMonth).length;
    const total = nodes.length;
    const done = nodes.filter((item) => item.status === 'done').length;
    const masteryRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      monthAdded,
      total,
      masteryRate,
      streak: computeStreak(nodes),
    };
  }, [nodes]);

  const handleStatusChange = (id: string, status: KnowledgeNodeStatus) => {
    setNodes(updateKnowledgeTreeNodeStatus(id, status));
  };

  const handleDelete = (id: string) => {
    const confirmed = window.confirm('确定删除这个知识点吗？');
    if (!confirmed) return;
    setNodes(removeKnowledgeTreeNode(id));
  };

  const handleToggleCollapse = (id: string) => {
    setCollapsedNodeIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleAddManual = () => {
    const subject = manualSubject.trim();
    const chapter = manualChapter.trim();
    if (!subject || !chapter) return;
    const keywords = manualKeywords
      .split(/[，,、]/)
      .map((item) => item.trim())
      .filter(Boolean);

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

  if (!isLoggedIn) return null;

  return (
    <AppShell
      activeKey="knowledge-tree"
      title="🌳 知识树"
      description="把知识宇宙里的学习成果沉淀为可追踪、可复习、可管理的知识地图"
      actions={
        <>
          <select
            className="month-select"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
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
            <input
              value={manualSubject}
              onChange={(e) => setManualSubject(e.target.value)}
              placeholder="学科（如：数学）"
            />
            <input
              value={manualChapter}
              onChange={(e) => setManualChapter(e.target.value)}
              placeholder="章节（如：集合的概念）"
            />
            <input
              value={manualKeywords}
              onChange={(e) => setManualKeywords(e.target.value)}
              placeholder="关键词（逗号分隔）"
            />
            <button className="btn btn-primary" type="button" onClick={handleAddManual}>
              保存到知识树
            </button>
          </div>
        </section>
      )}

      <section className="filter-card">
        <input
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索章节、关键词、总结..."
        />
        <div className="filter-row">
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="all">全部学科</option>
            {subjects.map((subject) => (
              <option value={subject} key={subject}>
                {subject}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | KnowledgeNodeStatus)}
          >
            <option value="all">全部状态</option>
            <option value="done">已掌握</option>
            <option value="doing">学习中</option>
            <option value="todo">待学习</option>
          </select>
        </div>
      </section>

      <section className="tree-card">
        <div className="card-title">🌿 知识树结构</div>
        {groupedBySubject.length === 0 ? (
          <div className="empty">
            暂无知识点，请先去知识宇宙完成一次梳理，或手动新增。
          </div>
        ) : (
          <div className="subject-groups">
            {groupedBySubject.map(([subject, list]) => (
              <div key={subject} className="subject-group">
                <div className="subject-root">{subject}</div>
                <div className="subject-branches">
                  {list.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      className={`branch-node ${STATUS_META[node.status].className}`}
                      onClick={() => setSearch(node.chapter)}
                      title={`${node.chapter} · ${STATUS_META[node.status].label}`}
                    >
                      {node.chapter}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="list-card">
        <div className="card-title">📚 知识点明细</div>
        {filteredNodes.length === 0 ? (
          <div className="empty">当前筛选条件下暂无知识点。</div>
        ) : (
          <div className="node-list">
            {filteredNodes.map((node) => (
              <article key={node.id} className="node-card">
                <div className="node-head">
                  <div>
                    <h4>{node.chapter}</h4>
                    <p>
                      {node.subject} · 最近更新 {formatDate(node.updatedAt)}
                    </p>
                  </div>
                  <div className="node-head-actions">
                    <button
                      className="collapse-btn"
                      type="button"
                      onClick={() => handleToggleCollapse(node.id)}
                    >
                      {collapsedNodeIds[node.id] ? '展开' : '收起'}
                    </button>
                    <button className="delete-btn" type="button" onClick={() => handleDelete(node.id)}>
                      删除
                    </button>
                  </div>
                </div>

                {!collapsedNodeIds[node.id] && (
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

                    <div className="status-actions">
                      {(Object.keys(STATUS_META) as KnowledgeNodeStatus[]).map((status) => (
                        <button
                          type="button"
                          key={status}
                          className={`status-btn ${node.status === status ? 'active' : ''} ${STATUS_META[status].className}`}
                          onClick={() => handleStatusChange(node.id, status)}
                        >
                          {STATUS_META[status].label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="achievement-card">
        <div className="card-title">🏅 学习成就</div>
        <div className="achievements">
          <div className={`achievement ${stats.streak >= 7 ? 'unlocked' : 'locked'}`}>连续学习 7 天</div>
          <div className={`achievement ${stats.total >= 10 ? 'unlocked' : 'locked'}`}>累计 10 个知识点</div>
          <div className={`achievement ${stats.masteryRate >= 60 ? 'unlocked' : 'locked'}`}>掌握率达 60%</div>
          <div className={`achievement ${stats.total >= 50 ? 'unlocked' : 'locked'}`}>累计 50 个知识点</div>
        </div>
      </section>

      <style jsx>{`
        .btn {
          padding: 10px 16px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          height: 40px;
          display: inline-flex;
          align-items: center;
        }
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .btn-secondary {
          background: white;
          border: 1px solid #e2e8f0;
          color: #334155;
        }
        .month-select {
          height: 40px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 0 10px;
          background: white;
          color: #334155;
          font-size: 14px;
        }
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        }
        .stat-value {
          font-size: 30px;
          font-weight: 700;
          color: #1a365d;
          line-height: 1.2;
        }
        .stat-label {
          margin-top: 4px;
          color: #718096;
          font-size: 13px;
        }
        .manual-card,
        .filter-card,
        .tree-card,
        .list-card,
        .achievement-card {
          background: white;
          border-radius: 18px;
          padding: 22px;
          margin-bottom: 18px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        }
        .manual-card h3 {
          margin: 0 0 12px;
          color: #1a365d;
          font-size: 16px;
        }
        .manual-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }
        .manual-grid input {
          height: 40px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 0 12px;
          font-size: 14px;
          color: #334155;
        }
        .search-input {
          width: 100%;
          height: 42px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 0 12px;
          font-size: 14px;
          margin-bottom: 10px;
        }
        .filter-row {
          display: flex;
          gap: 10px;
        }
        .filter-row select {
          flex: 1;
          height: 38px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 0 10px;
        }
        .card-title {
          font-size: 17px;
          font-weight: 700;
          color: #1a365d;
          margin-bottom: 14px;
        }
        .subject-groups {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .subject-group {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 12px;
          background: #f8fafc;
        }
        .subject-root {
          display: inline-flex;
          padding: 6px 12px;
          border-radius: 999px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 13px;
          font-weight: 700;
        }
        .subject-branches {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .branch-node {
          border: none;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
        }
        .branch-node.done {
          background: #dcfce7;
          color: #166534;
        }
        .branch-node.doing {
          background: #fef3c7;
          color: #92400e;
        }
        .branch-node.todo {
          background: #e0f2fe;
          color: #0c4a6e;
        }
        .node-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .node-card {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px;
          background: #fbfdff;
        }
        .node-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }
        .node-head-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .node-head h4 {
          margin: 0;
          font-size: 16px;
          color: #0f172a;
        }
        .node-head p {
          margin: 4px 0 0;
          font-size: 12px;
          color: #64748b;
        }
        .delete-btn {
          border: none;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 12px;
          cursor: pointer;
        }
        .collapse-btn {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 12px;
          cursor: pointer;
        }
        .keywords {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .keyword {
          padding: 4px 10px;
          background: #eef2ff;
          color: #4338ca;
          border-radius: 999px;
          font-size: 12px;
        }
        .summary {
          margin: 10px 0;
          font-size: 13px;
          color: #334155;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .status-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .status-btn {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 12px;
          cursor: pointer;
          background: white;
          color: #334155;
        }
        .status-btn.active.done {
          border-color: #22c55e;
          background: #dcfce7;
          color: #166534;
        }
        .status-btn.active.doing {
          border-color: #f59e0b;
          background: #fef3c7;
          color: #92400e;
        }
        .status-btn.active.todo {
          border-color: #38bdf8;
          background: #e0f2fe;
          color: #0c4a6e;
        }
        .empty {
          padding: 30px 16px;
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          text-align: center;
          color: #64748b;
          background: #f8fafc;
          font-size: 14px;
        }
        .achievements {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .achievement {
          border-radius: 12px;
          padding: 14px;
          text-align: center;
          font-size: 13px;
          font-weight: 600;
        }
        .achievement.unlocked {
          background: #ecfdf5;
          color: #166534;
          border: 1px solid #86efac;
        }
        .achievement.locked {
          background: #f1f5f9;
          color: #94a3b8;
          border: 1px solid #e2e8f0;
        }
        @media (max-width: 1200px) {
          .stats-row,
          .achievements {
            grid-template-columns: repeat(2, 1fr);
          }
          .manual-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 768px) {
          .stats-row,
          .achievements,
          .manual-grid {
            grid-template-columns: 1fr;
          }
          .filter-row {
            flex-direction: column;
          }
        }
      `}</style>
    </AppShell>
  );
}
