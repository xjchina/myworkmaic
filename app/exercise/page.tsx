'use client';

import { AppShell } from '@/components/shell/app-shell';
import { QuizWorkbench } from '@/components/workbench/quiz-workbench';

export default function ExercisePage() {
  return (
    <AppShell
      activeKey="exercise"
      title="互动练习"
      description="上传练习 PDF，严格按原题提取并完成随堂测验。"
    >
      <QuizWorkbench />
    </AppShell>
  );
}
