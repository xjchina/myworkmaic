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
import { SETS_SCENES } from '@/lib/data/demo-data-sets';
import { createLogger } from '@/lib/logger';
import { MediaStageProvider } from '@/lib/contexts/media-stage-context';

const log = createLogger('DemoBiologyClassroom');
const DEMO_BIOLOGY_STAGE_ID = 'builtin-demo-biology';

export default function DemoBiologyClassroomPage() {
  const { isLoggedIn } = useAuthGuard();
  const { setStage, setScenes, setCurrentSceneId } = useStageStore();
  const [ready, setReady] = useState(false);
  const initializedRef = useRef(false);

  const { stop } = useSceneGenerator({
    onComplete: () => {
      log.info('[DemoBiology] Scene generation complete (no-op for demo)');
    },
  });

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const stage = {
      id: DEMO_BIOLOGY_STAGE_ID,
      name: '生物',
      description: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      languageDirective:
        "该课程需完全使用中文进行教学。课程内容来自人教版生物学必修1《分子与细胞》第1章第1节《细胞是生命活动的基本单位》的PDF讲义。所有讲解、术语和概念均使用中文。在介绍科学家姓名时（如施莱登、施旺、虎克、魏尔肖），可使用中文译名并适当提及原名。对于专业术语如'细胞学说'、'归纳法'、'生命系统'等，直接使用中文术语。完全按照PDF讲义内容组织课堂，不补充任何额外知识点。不允许出现任何形式的随堂测验或quiz题目。",
      style: 'professional' as const,
      agentIds: ['default-1', 'default-2', 'default-5'],
    };

    // 内置版本按你的要求去掉随堂测验场景
    const scenes = SETS_SCENES.filter((scene) => scene.type !== 'quiz').map((scene, index) => ({
      ...scene,
      id: `bio_demo_scene_${index + 1}`,
      stageId: DEMO_BIOLOGY_STAGE_ID,
      order: index,
    }));

    setStage(stage);
    setScenes(scenes);
    setCurrentSceneId(scenes[0]?.id ?? null);

    useSettingsStore.getState().setAgentMode('preset');
    useSettingsStore.getState().setSelectedAgentIds(['default-1', 'default-2', 'default-5']);

    const mediaStore = useMediaGenerationStore.getState();
    mediaStore.revokeObjectUrls();
    useMediaGenerationStore.setState({ tasks: {} });
    useWhiteboardHistoryStore.getState().clearHistory();

    log.info('[DemoBiology] Loaded built-in biology classroom');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Demo page initializes once after store hydration.
    setReady(true);

    return () => {
      stop();
    };
  }, [setStage, setScenes, setCurrentSceneId, stop]);

  if (!isLoggedIn) return null;

  return (
    <ThemeProvider>
      <MediaStageProvider value={DEMO_BIOLOGY_STAGE_ID}>
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
