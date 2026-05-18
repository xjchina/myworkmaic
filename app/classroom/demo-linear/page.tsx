'use client';

import { useEffect, useRef, useState } from 'react';
import { Stage } from '@/components/stage';
import { ThemeProvider } from '@/lib/hooks/use-theme';
import { useStageStore } from '@/lib/store';
import { useWhiteboardHistoryStore } from '@/lib/store/whiteboard-history';
import { useMediaGenerationStore } from '@/lib/store/media-generation';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';
import { useSceneGenerator } from '@/lib/hooks/use-scene-generator';
import { useSettingsStore } from '@/lib/store/settings';
import { SETS_STAGE, SETS_SCENES } from '@/lib/data/demo-data-sets';
import { createLogger } from '@/lib/logger';
import { MediaStageProvider } from '@/lib/contexts/media-stage-context';

const log = createLogger('DemoLinearClassroom');
const DEMO_LINEAR_STAGE_ID = 'builtin-demo-linear-equation';

export default function DemoLinearClassroomPage() {
  const { isLoggedIn } = useAuthGuard();
  const { setStage, setScenes, setCurrentSceneId } = useStageStore();
  const [ready, setReady] = useState(false);
  const initializedRef = useRef(false);

  const { stop } = useSceneGenerator({
    onComplete: () => {
      log.info('[DemoLinear] Scene generation complete (no-op for demo)');
    },
  });

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const stage = {
      ...SETS_STAGE,
      id: DEMO_LINEAR_STAGE_ID,
      name: '什么是一元一次方程',
      description: '内置示例课堂，随系统发布，所有用户可见。',
      updatedAt: Date.now(),
    };
    const scenes = SETS_SCENES.map((scene) => ({
      ...scene,
      stageId: DEMO_LINEAR_STAGE_ID,
    }));

    setStage(stage);
    setScenes(scenes);
    setCurrentSceneId(scenes[0]?.id ?? null);

    useSettingsStore.getState().setAgentMode('preset');
    useSettingsStore.getState().setSelectedAgentIds(['default-1', 'default-2', 'default-3']);

    const mediaStore = useMediaGenerationStore.getState();
    mediaStore.revokeObjectUrls();
    useMediaGenerationStore.setState({ tasks: {} });
    useWhiteboardHistoryStore.getState().clearHistory();

    log.info('[DemoLinear] Loaded built-in linear equation classroom');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Demo page initializes once after store hydration.
    setReady(true);

    return () => {
      stop();
    };
  }, [setStage, setScenes, setCurrentSceneId, stop]);

  if (!isLoggedIn) return null;

  return (
    <ThemeProvider>
      <MediaStageProvider value={DEMO_LINEAR_STAGE_ID}>
        <div className="h-screen flex flex-col overflow-hidden">
          {ready ? (
            <Stage />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center text-muted-foreground">
                <p>正在加载示例课堂...</p>
              </div>
            </div>
          )}
        </div>
      </MediaStageProvider>
    </ThemeProvider>
  );
}
