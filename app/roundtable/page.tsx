'use client';

import { AppShell } from '@/components/shell/app-shell';
import { RoundtableWorkbench } from '@/components/workbench/roundtable-workbench';

export default function RoundtablePage() {
  return (
    <AppShell
      activeKey="roundtable"
      title="圆桌讨论"
      description="独立页面多轮连续辩论：AI老师与AI学生讨论，左侧可回看历史。"
    >
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6">
          <h3 className="text-base font-semibold text-slate-800">讨论入口</h3>
          <p className="mt-2 text-sm text-slate-600">
            用户输入框固定在底部，上方为对话区域；每次辩论自动保存到左侧，随时回忆查看。
          </p>
        </div>
        <RoundtableWorkbench />
      </div>
    </AppShell>
  );
}
