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
import { SETS_STAGE, SETS_SCENES, SETS_STAGE_ID } from '@/lib/data/demo-data-sets';
import { createLogger } from '@/lib/logger';
import { MediaStageProvider } from '@/lib/contexts/media-stage-context';

const log = createLogger('DemoSetsClassroom');

/**
 * Demo Classroom Page — "集合的基本概念"
 *
 * Loads pre-built Stage + Scene data into the store,
 * then renders using the real <Stage /> component —
 * identical experience to an AI-generated classroom.
 */
export default function DemoSetsClassroomPage() {
  const { isLoggedIn } = useAuthGuard();
  const { setStage, setScenes, setCurrentSceneId } = useStageStore();
  const [ready, setReady] = useState(false);
  const initializedRef = useRef(false);

  const { stop } = useSceneGenerator({
    onComplete: () => {
      log.info('[DemoSets] Scene generation complete (no-op for demo)');
    },
  });

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Load demo data into the store
    setStage(SETS_STAGE);
    setScenes(SETS_SCENES);
    setCurrentSceneId(SETS_SCENES[0]?.id ?? null);

    // Set default agents
    useSettingsStore.getState().setAgentMode('preset');
    useSettingsStore.getState().setSelectedAgentIds(['default-1', 'default-2', 'default-5']);

    // Clear previous media / whiteboard state
    const mediaStore = useMediaGenerationStore.getState();
    mediaStore.revokeObjectUrls();
    useMediaGenerationStore.setState({ tasks: {} });
    useWhiteboardHistoryStore.getState().clearHistory();

    log.info('[DemoSets] Loaded demo classroom data');
    setReady(true);

    return () => {
      stop();
    };
  }, [setStage, setScenes, setCurrentSceneId, stop]);

  if (!isLoggedIn) return null;

  return (
    <ThemeProvider>
      <MediaStageProvider value={SETS_STAGE_ID}>
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
