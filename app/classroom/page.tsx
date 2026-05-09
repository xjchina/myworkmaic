'use client';

import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';

export default function ClassroomPage() {
  return (
    <AppShell
      activeKey="classroom"
      title="教案课堂"
      actions={
        <Link href="/openmaic" className="btn btn-outline" target="_blank" rel="noreferrer">
          新窗口打开
        </Link>
      }
    >
      <div className="preset-section">
        <div className="section-title">预置教案（无需上传）</div>
        <div className="preset-grid">
          <div className="preset-card">
            <div className="preset-title">光的折射</div>
            <div className="preset-desc">通过实验现象讲解折射规律与全反射。</div>
          </div>
          <div className="preset-card">
            <div className="preset-title">二次函数</div>
            <div className="preset-desc">从图像入手理解顶点、对称轴与应用。</div>
          </div>
          <div className="preset-card">
            <div className="preset-title">宾语从句</div>
            <div className="preset-desc">在语境中掌握连接词和语序。</div>
          </div>
          <div className="preset-card">
            <div className="preset-title">氧化还原反应</div>
            <div className="preset-desc">理解电子转移与化合价变化。</div>
          </div>
        </div>
      </div>

      <div className="embed-section">
        <div className="embed-title">OpenMAIC 课堂生成</div>
        <iframe
          src="/openmaic?embedded=1"
          title="OpenMAIC 课堂生成"
          className="embed-frame"
          loading="lazy"
        />
      </div>

      <style jsx>{`
        .btn {
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
        }
        .btn-outline {
          background: white;
          color: #4a5568;
          border: 2px solid #e2e8f0;
        }
        .preset-section {
          background: white;
          border-radius: 20px;
          padding: 28px;
          margin-bottom: 24px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a365d;
          margin-bottom: 16px;
        }
        .preset-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 14px;
        }
        .preset-card {
          background: #f8fafc;
          border-radius: 14px;
          padding: 18px;
        }
        .preset-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a365d;
          margin-bottom: 6px;
        }
        .preset-desc {
          font-size: 14px;
          color: #64748b;
          line-height: 1.6;
        }
        .embed-section {
          background: white;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }
        .embed-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a365d;
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .embed-frame {
          width: 100%;
          height: 920px;
          border: 0;
          background: #fff;
        }
      `}</style>
    </AppShell>
  );
}
