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
import { DEMO_STAGE, DEMO_SCENES, DEMO_STAGE_ID } from '@/lib/data/demo-data';
import { createLogger } from '@/lib/logger';
import { MediaStageProvider } from '@/lib/contexts/media-stage-context';

const log = createLogger('DemoClassroom');

/**
 * Demo Classroom Page
 *
 * Loads pre-built Stage + Scene data into the store,
 * then renders using the real <Stage /> component —
 * identical experience to an AI-generated classroom.
 */
export default function DemoClassroomPage() {
  const { isLoggedIn } = useAuthGuard();
  const { setStage, setScenes, setCurrentSceneId } = useStageStore();
  const [ready, setReady] = useState(false);
  const initializedRef = useRef(false);

  const { stop } = useSceneGenerator({
    onComplete: () => {
      log.info('[DemoClassroom] Scene generation complete (no-op for demo)');
    },
  });

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Load demo data into the store
    setStage(DEMO_STAGE);
    setScenes(DEMO_SCENES);
    setCurrentSceneId(DEMO_SCENES[0]?.id ?? null);

    // Set default agents
    useSettingsStore.getState().setAgentMode('preset');
    useSettingsStore.getState().setSelectedAgentIds(['default-1', 'default-2', 'default-3']);

    // Clear previous media / whiteboard state
    const mediaStore = useMediaGenerationStore.getState();
    mediaStore.revokeObjectUrls();
    useMediaGenerationStore.setState({ tasks: {} });
    useWhiteboardHistoryStore.getState().clearHistory();

    log.info('[DemoClassroom] Loaded demo classroom data');
    setReady(true);

    return () => {
      stop();
    };
  }, [setStage, setScenes, setCurrentSceneId, stop]);

  if (!isLoggedIn) return null;

  return (
    <ThemeProvider>
      <MediaStageProvider value={DEMO_STAGE_ID}>
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
