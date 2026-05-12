'use client';

import { AppShell } from '@/components/shell/app-shell';
import { RoundtableWorkbench } from '@/components/workbench/roundtable-workbench';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';

export default function RoundtablePage() {
  const { isLoggedIn } = useAuthGuard();
  if (!isLoggedIn) return null;
  return (
    <AppShell
      activeKey="roundtable"
      title="圆桌讨论"
      description="AI老师与AI学生多角色讨论，输入问题即刻开始。"
    >
      <RoundtableWorkbench />
    </AppShell>
  );
}
