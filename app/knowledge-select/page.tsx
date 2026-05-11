'use client';

import { AppShell } from '@/components/shell/app-shell';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';

const subjects = [
  { icon: '📻', name: '数学' },
  { icon: '⚿', name: '物理' },
  { icon: '🧪', name: '化学' },
  { icon: '📋', name: '英语' },
  { icon: '📃', name: '语文' },
  { icon: '📍', name: '生物' },
];

export default function KnowledgeSelectPage() {
  const { isLoggedIn } = useAuthGuard();
  const router = useRouter();
  if (!isLoggedIn) return null;

  return (
    <AppShell
      activeKey="knowledge"
      title="🌌 知识宇宙"
      description="选择学科，开始今天的知识梳理"
    >
      <div className="hero">
        <h2>开始今天的知识梳理</h2>
        <p>选择学科，用自己的话告诉AI今天学了什么</p>
      </div>

      <div className="subject-grid">
        {subjects.map((s) => (
          <button
            key={s.name}
            className="subject-card"
            onClick={() => router.push(`/knowledge-chat?subject=${encodeURIComponent(s.name)}`)}
          >
            <div className="subject-icon">{s.icon}</div>
            <div className="subject-name">{s.name}</div>
          </button>
        ))}
      </div>

      <div className="custom-input">
        <h3>或输入其他学科</h3>
        <input placeholder="例如：地理、历史、政治..." />
        <button className="btn-start" onClick={() => router.push('/knowledge-chat')}>
          开始梳理 →
        </button>
      </div>

      <style jsx>{`
        .hero {
          text-align: center;
          margin-bottom: 32px;
        }
        .hero h2 {
          font-size: 32px;
          color: #1a365d;
          margin-bottom: 10px;
        }
        .hero p {
          color: #718096;
        }
        .subject-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }
        .subject-card {
          background: white;
          border-radius: 20px;
          padding: 30px 20px;
          text-align: center;
          cursor: pointer;
          border: none;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }
        .subject-card:hover {
          transform: translateY(-4px);
        }
        .subject-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
        .subject-name {
          font-size: 18px;
          font-weight: 600;
          color: #2d3748;
        }
        .custom-input {
          background: white;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }
        .custom-input h3 {
          text-align: center;
          color: #2d3748;
          margin-bottom: 16px;
        }
        .custom-input input {
          width: 100%;
          padding: 16px 20px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 16px;
          margin-bottom: 16px;
          outline: none;
        }
        .btn-start {
          width: 100%;
          background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);
          color: white;
          border: none;
          padding: 16px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        @media (max-width: 768px) {
          .subject-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .hero h2 {
            font-size: 26px;
          }
        }
      `}</style>
    </AppShell>
  );
}

