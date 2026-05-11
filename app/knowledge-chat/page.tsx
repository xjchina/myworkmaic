'use client';

import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';

export default function KnowledgeChatPage() {
  const { isLoggedIn } = useAuthGuard();
  if (!isLoggedIn) return null;
  return (
    <AppShell
      activeKey="knowledge"
      title="📕 知识点讲解"
      description="聊天模式 · 五步梳理法（第 1/5 步）"
      actions={
        <Link href="/knowledge-select" className="back-btn">
          ← 返回选择
        </Link>
      }
    >
      <div className="chat-wrapper">
        <div className="knowledge-list-panel">
          <div className="panel-title">📎 物理 - 光学</div>
          <div className="knowledge-item active">
            <div className="knowledge-item-name">光的折射</div>
            <div className="knowledge-item-status">正在学习</div>
          </div>
          <div className="knowledge-item">
            <div className="knowledge-item-name">全反射</div>
            <div className="knowledge-item-status">未开始</div>
          </div>
          <div className="knowledge-item">
            <div className="knowledge-item-name">凸透镜成像</div>
            <div className="knowledge-item-status">未开始</div>
          </div>
        </div>

        <div className="chat-container">
          <div className="chat-header">
            <div className="ai-avatar">🤖</div>
            <div className="chat-info">
              <h3>AI学习助手</h3>
              <span>在线</span>
            </div>
          </div>

          <div className="chat-messages">
            <div className="knowledge-card">
              <div className="knowledge-card-title">📉 今日学习：光的折射</div>
              <div className="knowledge-card-content">
                光的折射是指光从一种介质进入另一种介质时，传播方向发生改变的现象。
              </div>
            </div>

            <div className="message ai">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                同学你好！今天我们来学习“光的折射”。
                <br />
                你可以先说说你理解的现象或例子。
              </div>
            </div>

            <div className="message user">
              <div className="message-avatar">👩</div>
              <div className="message-content">筷子放到水里看起来会弯，这是不是折射？</div>
            </div>
          </div>

          <div className="chat-input-area">
            <textarea className="chat-input" rows={1} placeholder="输入你的问题..." />
            <button className="send-btn">→</button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .back-btn {
          padding: 10px 20px;
          border-radius: 10px;
          background: white;
          border: 1px solid #e2e8f0;
          color: #4a5568;
          text-decoration: none;
        }
        .chat-wrapper {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
          min-height: 620px;
        }
        .knowledge-list-panel {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        }
        .panel-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a365d;
          margin-bottom: 16px;
        }
        .knowledge-item {
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 8px;
          background: #f7fafc;
        }
        .knowledge-item.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .knowledge-item-name {
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 4px;
        }
        .knowledge-item-status {
          font-size: 12px;
          opacity: 0.8;
        }
        .chat-container {
          background: white;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        }
        .chat-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ai-avatar {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .chat-info h3 {
          margin: 0 0 2px;
          font-size: 15px;
          color: #1a365d;
        }
        .chat-info span {
          font-size: 12px;
          color: #48bb78;
        }
        .chat-messages {
          flex: 1;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .knowledge-card {
          background: linear-gradient(135deg, #fef3cd 0%, #fff9db 100%);
          padding: 16px 20px;
          border-radius: 12px;
          border-left: 4px solid #f6ad55;
        }
        .knowledge-card-title {
          font-size: 13px;
          color: #856404;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .knowledge-card-content {
          font-size: 14px;
          color: #5d4503;
        }
        .message {
          display: flex;
          gap: 12px;
          max-width: 85%;
        }
        .message.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }
        .message-avatar {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e2e8f0;
        }
        .message-content {
          background: #f7fafc;
          padding: 14px 18px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.7;
          color: #2d3748;
        }
        .message.user .message-content {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .chat-input-area {
          padding: 20px 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 12px;
        }
        .chat-input {
          flex: 1;
          padding: 14px 18px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          resize: none;
          outline: none;
        }
        .send-btn {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
        }
        @media (max-width: 1024px) {
          .chat-wrapper {
            grid-template-columns: 1fr;
          }
          .knowledge-list-panel {
            display: none;
          }
        }
      `}</style>
    </AppShell>
  );
}

