'use client';

import Link from 'next/link';
import { BookOpen, Sparkles, Box } from 'lucide-react';
import { AppShell } from '@/components/shell/app-shell';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';

export default function ClassroomPage() {
  const { isLoggedIn } = useAuthGuard();
  if (!isLoggedIn) return null;

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
      {/* ── Built-in demo classroom ── */}
      <div className="card-section">
        <div className="section-title">内置示例课堂</div>
        <div className="card-grid">
          <article className="info-card demo-card-sets">
            <div className="demo-badge-sets">
              <Sparkles className="size-3.5" />
              内置示例
            </div>
            <div className="card-title">集合的基本概念</div>
            <div className="card-desc">
              高中数学 AI 课堂示例：集合概念、元素特性、表示方法、Venn 图 + 随堂测验，真实 AI 生成的教学体验。
            </div>
            <div className="demo-meta">
              <span className="meta-tag slides">6 页幻灯片</span>
              <span className="meta-tag quiz">12 道测验</span>
              <span className="meta-tag discuss">圆桌讨论</span>
            </div>
            <Link className="action-btn demo-action-sets" href="/classroom/demo-sets">
              <BookOpen className="size-4" />
              进入示例课堂
            </Link>
          </article>
          <article className="info-card">
            <div className="card-title">3D Spark 实验台</div>
            <div className="card-desc">进入独立 3D 页面，使用内置示例模型进行旋转、缩放、平移互动学习。</div>
            <Link className="action-btn" href="/classroom/3d-lab">
              <Box className="size-4" />
              进入实验
            </Link>
          </article>
        </div>
      </div>

      <div className="embed-section">
        <iframe
          src="/openmaic?embedded=1"
          title="课堂生成"
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
        .card-section {
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
        .card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 14px;
        }
        .info-card {
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .demo-card-sets {
          background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 50%, #fefce8 100%);
          border-color: #86efac;
        }
        .demo-badge-sets {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          color: white;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          width: fit-content;
        }
        .demo-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .meta-tag {
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }
        .meta-tag.slides {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .meta-tag.quiz {
          background: #dcfce7;
          color: #166534;
        }
        .meta-tag.discuss {
          background: #fce7f3;
          color: #9d174d;
        }
        .action-btn {
          align-self: flex-start;
          background: linear-gradient(135deg, #2563eb 0%, #4338ca 100%);
          color: #fff;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .demo-action-sets {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          padding: 9px 16px;
          font-weight: 600;
        }
        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a365d;
          margin-bottom: 6px;
          line-height: 1.5;
        }
        .card-desc {
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
