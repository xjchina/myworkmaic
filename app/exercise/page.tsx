'use client';

import { AppShell } from '@/components/shell/app-shell';
import { QuizWorkbench } from '@/components/workbench/quiz-workbench';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';

export default function ExercisePage() {
  const { isLoggedIn } = useAuthGuard();
  if (!isLoggedIn) return null;

  return (
    <AppShell
      activeKey="exercise"
      title={'\u4e92\u52a8\u7ec3\u4e60'}
      description={'\u4e0a\u4f20\u7ec3\u4e60 PDF\uff0c\u4e25\u683c\u6309\u539f\u9898\u63d0\u53d6\u5e76\u5b8c\u6210\u7ec3\u4e60\u3002'}
    >
      <QuizWorkbench />
    </AppShell>
  );
}
