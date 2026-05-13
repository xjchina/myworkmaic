'use client';

import { AppShell } from '@/components/shell/app-shell';
import Link from 'next/link';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';

export default function KnowledgeTreePage() {
  const { isLoggedIn } = useAuthGuard();
  if (!isLoggedIn) return null;
  return (
    <AppShell
      activeKey="knowledge-tree"
      title="🌳 知识树"
      description="学习进度与知识点掌握可视化"
      actions={
        <>
          <button className="btn btn-secondary">📮 2024年 1月</button>
          <Link href="/knowledge-select" className="btn btn-primary">
            ➕ 添加知识点
          </Link>
        </>
      }
    >
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">12</div>
          <div className="stat-label">本月新增知识点</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">35</div>
          <div className="stat-label">总知识点</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">+35%</div>
          <div className="stat-label">掌握度提升</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">7</div>
          <div className="stat-label">连续学习天数</div>
        </div>
      </div>

      <div className="tree-card">
        <div className="card-title">🌳 我的知识树</div>
        <div className="tree-container">
          <div className="node root">物理</div>
          <div className="branches">
            <div className="node done">光学</div>
            <div className="node doing">力学</div>
            <div className="node todo">电磁学</div>
          </div>
          <div className="legend">
            <span className="dot d1" /> 已掌握
            <span className="dot d2" /> 学习中
            <span className="dot d3" /> 待学习
          </div>
        </div>
      </div>

      <div className="achievement-card">
        <div className="card-title">🏳 学习成就</div>
        <div className="achievements">
          <div className="achievement">✅ 连续学习7天</div>
          <div className="achievement">🎉 掌握10个知识点</div>
          <div className="achievement">🔟 连续答对20题</div>
          <div className="achievement locked">🙌 掌握50个知识点</div>
        </div>
      </div>

      <style jsx>{`
        .btn {
          padding: 10px 20px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          border: none;
          cursor: pointer;
        }
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .btn-secondary {
          background: white;
          border: 1px solid #e2e8f0;
          color: #4a5568;
        }
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        }
        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #1a365d;
        }
        .stat-label {
          color: #718096;
          font-size: 13px;
        }
        .tree-card,
        .achievement-card {
          background: white;
          border-radius: 20px;
          padding: 30px;
          margin-bottom: 24px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        }
        .card-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a365d;
          margin-bottom: 20px;
        }
        .tree-container {
          text-align: center;
        }
        .node {
          display: inline-block;
          padding: 12px 20px;
          border-radius: 999px;
          margin: 8px;
          color: #1f2937;
        }
        .node.root {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .node.done {
          background: #c6f6d5;
        }
        .node.doing {
          background: #fef3cd;
        }
        .node.todo {
          background: #e0f2fe;
        }
        .legend {
          margin-top: 16px;
          color: #4a5568;
          font-size: 13px;
        }
        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
          margin: 0 6px 0 16px;
        }
        .dot.d1 {
          background: #48bb78;
        }
        .dot.d2 {
          background: #f6ad55;
        }
        .dot.d3 {
          background: #94a3b8;
        }
        .achievements {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .achievement {
          background: #f7fafc;
          border-radius: 16px;
          padding: 18px;
          text-align: center;
          font-size: 14px;
        }
        .achievement.locked {
          opacity: 0.6;
        }
        @media (max-width: 1200px) {
          .stats-row,
          .achievements {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </AppShell>
  );
}

