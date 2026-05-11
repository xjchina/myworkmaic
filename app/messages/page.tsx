'use client';

import { AppShell } from '@/components/shell/app-shell';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';

export default function MessagesPage() {
  const { isLoggedIn } = useAuthGuard();
  if (!isLoggedIn) return null;
  return (
    <AppShell activeKey="messages" title="消息" description="系统通知、学习提醒与进度消息。">
      <div
        style={{
          background: 'white',
          borderRadius: 20,
          padding: 28,
          color: '#334155',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, color: '#1a365d' }}>消息中心</h3>
        <p style={{ marginTop: 10, marginBottom: 0, fontSize: 14, color: '#64748b' }}>
          暂无新消息。后续会在这里展示系统通知、练习结果提醒和课堂更新。
        </p>
      </div>
    </AppShell>
  );
}
