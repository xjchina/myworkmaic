'use client';

import { Stage } from '@/components/stage';
import { ThemeProvider } from '@/lib/hooks/use-theme';
import { useStageStore } from '@/lib/store';
import { loadImageMapping } from '@/lib/utils/image-storage';
import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useSceneGenerator } from '@/lib/hooks/use-scene-generator';
import { useMediaGenerationStore } from '@/lib/store/media-generation';
import { useWhiteboardHistoryStore } from '@/lib/store/whiteboard-history';
import { createLogger } from '@/lib/logger';
import { MediaStageProvider } from '@/lib/contexts/media-stage-context';
import { generateMediaForOutlines } from '@/lib/media/media-orchestrator';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';

const log = createLogger('Classroom');

export default function ClassroomDetailPage() {
  return (
    <Suspense fallback={null}>
      <ClassroomDetailContent />
    </Suspense>
  );
}

function ClassroomDetailContent() {
  const { isLoggedIn } = useAuthGuard();
  const params = useParams();
  const searchParams = useSearchParams();
  const classroomId = params?.id as string;

  const { loadFromStorage } = useStageStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialRoundtableQuestion, setInitialRoundtableQuestion] = useState<string | null>(null);

  const generationStartedRef = useRef(false);

  const { generateRemaining, retrySingleOutline, stop } = useSceneGenerator({
    onComplete: () => {
      log.info('[Classroom] All scenes generated');
    },
  });

  const loadClassroom = useCallback(async () => {
    try {
      await loadFromStorage(classroomId);

      // If IndexedDB had no data, try server-side storage (API-generated classrooms)
      if (!useStageStore.getState().stage) {
        log.info('No IndexedDB data, trying server-side storage for:', classroomId);
        try {
          const res = await fetch(`/api/classroom?id=${encodeURIComponent(classroomId)}`);
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.classroom) {
              const { stage, scenes } = json.classroom;
              useStageStore.getState().setStage(stage);
              useStageStore.setState({
                scenes,
                currentSceneId: scenes[0]?.id ?? null,
              });
              log.info('Loaded from server-side storage:', classroomId);

              // Hydrate server-generated agents into IndexedDB + registry.
              if (stage.generatedAgentConfigs?.length) {
                const { saveGeneratedAgents } = await import('@/lib/orchestration/registry/store');
                await saveGeneratedAgents(stage.id, stage.generatedAgentConfigs);
                log.info('Hydrated server-generated agents for stage:', stage.id);
              }
            }
          }
        } catch (fetchErr) {
          log.warn('Server-side storage fetch failed:', fetchErr);
        }
      }

      // Restore completed media generation tasks from IndexedDB
      await useMediaGenerationStore.getState().restoreFromDB(classroomId);

      // Restore agents for this stage
      const { loadGeneratedAgentsForStage, useAgentRegistry } =
        await import('@/lib/orchestration/registry/store');
      const generatedAgentIds = await loadGeneratedAgentsForStage(classroomId);
      const { useSettingsStore } = await import('@/lib/store/settings');

      if (generatedAgentIds.length > 0) {
        useSettingsStore.getState().setAgentMode('auto');
        useSettingsStore.getState().setSelectedAgentIds(generatedAgentIds);
      } else {
        const stage = useStageStore.getState().stage;
        const stageAgentIds = stage?.agentIds;
        const registry = useAgentRegistry.getState();
        const cleanIds = stageAgentIds?.filter((id) => {
          const a = registry.getAgent(id);
          return a && !a.isGenerated;
        });
        useSettingsStore.getState().setAgentMode('preset');
        useSettingsStore
          .getState()
          .setSelectedAgentIds(
            cleanIds && cleanIds.length > 0 ? cleanIds : ['default-1', 'default-2', 'default-3'],
          );
      }

      // Interactive classrooms should not contain quiz scenes.
      const stageState = useStageStore.getState();
      if (stageState.stage?.interactiveMode) {
        const filteredScenes = stageState.scenes.filter((scene) => scene.type !== 'quiz');
        const filteredOutlines = stageState.outlines.filter((outline) => outline.type !== 'quiz');
        const filteredGenerating = stageState.generatingOutlines.filter(
          (outline) => outline.type !== 'quiz',
        );

        if (
          filteredScenes.length !== stageState.scenes.length ||
          filteredOutlines.length !== stageState.outlines.length
        ) {
          useStageStore.setState({
            scenes: filteredScenes,
            outlines: filteredOutlines,
            generatingOutlines: filteredGenerating,
            currentSceneId: filteredScenes.some((scene) => scene.id === stageState.currentSceneId)
              ? stageState.currentSceneId
              : filteredScenes[0]?.id ?? null,
          });
          await useStageStore.getState().saveToStorage();
          log.info('[Classroom] Removed quiz scenes from interactive classroom:', classroomId);
        }
      }
    } catch (loadError) {
      log.error('Failed to load classroom:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load classroom');
    } finally {
      setLoading(false);
    }
  }, [classroomId, loadFromStorage]);

  useEffect(() => {
    const autoDiscuss = searchParams?.get('autodiscuss') === '1';
    if (!autoDiscuss) {
      setInitialRoundtableQuestion(null);
      return;
    }

    try {
      const pendingRaw = sessionStorage.getItem('pendingRoundtableQuestion');
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw) as { stageId?: string; question?: string };
        if (pending.stageId === classroomId && pending.question?.trim()) {
          setInitialRoundtableQuestion(pending.question.trim());
        }
        sessionStorage.removeItem('pendingRoundtableQuestion');
        return;
      }
    } catch {
      sessionStorage.removeItem('pendingRoundtableQuestion');
    }

    const queryQuestion = searchParams?.get('question');
    if (queryQuestion?.trim()) {
      setInitialRoundtableQuestion(queryQuestion.trim());
    }
  }, [classroomId, searchParams]);

  useEffect(() => {
    // Reset loading state on course switch to unmount Stage during transition.
    setLoading(true);
    setError(null);
    generationStartedRef.current = false;

    // Clear previous classroom media tasks.
    const mediaStore = useMediaGenerationStore.getState();
    mediaStore.revokeObjectUrls();
    useMediaGenerationStore.setState({ tasks: {} });

    // Clear whiteboard history from previous course.
    useWhiteboardHistoryStore.getState().clearHistory();

    loadClassroom();

    return () => {
      stop();
    };
  }, [classroomId, loadClassroom, stop]);

  // Auto-resume generation for pending outlines.
  useEffect(() => {
    if (loading || error || generationStartedRef.current) return;

    const state = useStageStore.getState();
    const { outlines, scenes, stage } = state;

    const completedOrders = new Set(scenes.map((s) => s.order));
    const hasPending = outlines.some((o) => !completedOrders.has(o.order));

    if (hasPending && stage) {
      generationStartedRef.current = true;

      const genParamsStr = sessionStorage.getItem('generationParams');
      const params = genParamsStr ? JSON.parse(genParamsStr) : {};

      const storageIds = (params.pdfImages || [])
        .map((img: { storageId?: string }) => img.storageId)
        .filter(Boolean);

      loadImageMapping(storageIds).then((imageMapping) => {
        generateRemaining({
          pdfImages: params.pdfImages,
          imageMapping,
          stageInfo: {
            name: stage.name || '',
            description: stage.description,
            style: stage.style,
          },
          agents: params.agents,
          userProfile: params.userProfile,
          languageDirective: params.languageDirective || stage.languageDirective,
        });
      });
    } else if (outlines.length > 0 && stage) {
      generationStartedRef.current = true;
      generateMediaForOutlines(outlines, stage.id).catch((resumeError) => {
        log.warn('[Classroom] Media generation resume error:', resumeError);
      });
    }
  }, [loading, error, generateRemaining]);

  if (!isLoggedIn) return null;

  return (
    <ThemeProvider>
      <MediaStageProvider value={classroomId}>
        <div className="h-screen flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center text-muted-foreground">
                <p>Loading classroom...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center">
                <p className="text-destructive mb-4">Error: {error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    loadClassroom();
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <Stage
              onRetryOutline={retrySingleOutline}
              initialRoundtableQuestion={initialRoundtableQuestion}
            />
          )}
        </div>
      </MediaStageProvider>
    </ThemeProvider>
  );
}
