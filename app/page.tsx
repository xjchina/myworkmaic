'use client';

import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';

export default function HomePage() {
  return (
    <AppShell
      activeKey="home"
      title="欢迎回来，小明"
      description="今天是学习的好日子，继续加油。"
      actions={
        <>
          <button className="btn btn-outline" type="button">
            数据报告
          </button>
          <Link className="btn btn-primary" href="/classroom">
            快速开始
          </Link>
        </>
      }
    >
      <div className="feature-grid">
        <Link href="/classroom" className="feature-card">
          <div className="feature-icon i-classroom">📘</div>
          <div className="feature-title">教案课堂</div>
          <div className="feature-desc">上传老师教案 PDF，AI 智能讲解授课，支持互动实验。</div>
          <div className="feature-tags">
            <span className="feature-tag">PDF 教案</span>
            <span className="feature-tag">智能讲解</span>
          </div>
        </Link>

        <Link href="/exercise" className="feature-card active">
          <div className="feature-icon i-exercise">📝</div>
          <div className="feature-title">互动练习</div>
          <div className="feature-desc">上传练习 PDF，AI 严格按原题生成测验并批改。</div>
          <div className="feature-tags">
            <span className="feature-tag">PDF 练习题</span>
            <span className="feature-tag">AI 解析</span>
          </div>
        </Link>

        <Link href="/roundtable" className="feature-card">
          <div className="feature-icon i-roundtable">💬</div>
          <div className="feature-title">圆桌讨论</div>
          <div className="feature-desc">围绕学生提问发起讨论，老师与 AI 学生多视角协作推理。</div>
          <div className="feature-tags">
            <span className="feature-tag">同学互助</span>
            <span className="feature-tag">讨论学习</span>
          </div>
        </Link>
      </div>

      <div className="quick-section">
        <div className="quick-title">快捷工具</div>
        <div className="quick-grid">
          <Link href="/pdf-tools" className="quick-item">
            <div className="quick-icon q1">📄</div>
            <div className="quick-label">Word 转 PDF</div>
          </Link>
          <Link href="/knowledge-select" className="quick-item">
            <div className="quick-icon q2">🌌</div>
            <div className="quick-label">知识宇宙</div>
          </Link>
          <Link href="/knowledge-tree" className="quick-item">
            <div className="quick-icon q3">🌳</div>
            <div className="quick-label">知识树</div>
          </Link>
        </div>
      </div>

      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-icon s1">📘</div>
          <div className="stat-value">3</div>
          <div className="stat-label">已完成教案</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon s2">📝</div>
          <div className="stat-value">24</div>
          <div className="stat-label">练习题数</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon s3">💬</div>
          <div className="stat-value">8</div>
          <div className="stat-label">讨论话题</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon s4">🔥</div>
          <div className="stat-value">7</div>
          <div className="stat-label">连续学习(天)</div>
        </div>
      </div>

      <style jsx>{`
        .btn {
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          cursor: pointer;
        }
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .btn-outline {
          background: white;
          color: #4a5568;
          border: 2px solid #e2e8f0;
        }
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 32px;
        }
        .feature-card {
          background: white;
          border-radius: 20px;
          padding: 28px;
          transition: all 0.3s ease;
          cursor: pointer;
          border: 2px solid transparent;
          text-decoration: none;
          color: inherit;
        }
        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
        }
        .feature-card.active {
          border-color: #667eea;
        }
        .feature-icon {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin-bottom: 20px;
          color: white;
        }
        .i-classroom {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .i-exercise {
          background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%);
        }
        .i-roundtable {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }
        .feature-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a365d;
          margin-bottom: 8px;
        }
        .feature-desc {
          font-size: 14px;
          color: #718096;
          line-height: 1.5;
        }
        .feature-tags {
          display: flex;
          gap: 8px;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .feature-tag {
          background: #f7fafc;
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 12px;
          color: #4a5568;
        }
        .quick-section {
          background: white;
          border-radius: 20px;
          padding: 28px;
        }
        .quick-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a365d;
          margin-bottom: 20px;
        }
        .quick-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .quick-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 20px;
          background: #f7fafc;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          color: inherit;
          border: none;
        }
        .quick-item:hover {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          transform: translateY(-3px);
        }
        .quick-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .q1 {
          background: #dbeafe;
        }
        .q2 {
          background: #dcfce7;
        }
        .q3 {
          background: #fef3c7;
        }
        .quick-label {
          font-size: 13px;
          font-weight: 500;
          text-align: center;
        }
        .stats-section {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-top: 32px;
        }
        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
        }
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-bottom: 16px;
          color: white;
        }
        .s1 {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .s2 {
          background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%);
        }
        .s3 {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }
        .s4 {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }
        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #1a365d;
        }
        .stat-label {
          color: #718096;
          font-size: 14px;
          margin-top: 4px;
        }
        @media (max-width: 1200px) {
          .feature-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .quick-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .stats-section {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .feature-grid {
            grid-template-columns: 1fr;
          }
          .quick-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AppShell>
  );
}

