import {
  getDefaultKnowledgePromptSections,
  renderKnowledgePromptTemplate,
  resolvePublishedKnowledgePrompt,
  type PromptMode,
  type PromptStepKey,
} from '@/lib/server/ops-knowledge-prompts';

const GENERAL = '\u901A\u7528';
const UNTITLED_CHAPTER = '\u672A\u547D\u540D\u7AE0\u8282';

export async function resolveKnowledgeRecallSystemPrompt(input: {
  subject: string;
  chapter: string;
  studentLevel?: string;
  mode: PromptMode;
  stepKey?: PromptStepKey;
  includeAllSteps?: boolean;
}) {
  const variables = {
    subject: input.subject || GENERAL,
    chapter: input.chapter || UNTITLED_CHAPTER,
    student_level: input.studentLevel || GENERAL,
    mode: input.mode,
  };

  const globalPrompt = await resolvePublishedKnowledgePrompt({
    subject: input.subject || GENERAL,
    gradeSegment: input.studentLevel,
    mode: input.mode,
    stepKey: 'global',
  });

  const globalSections = globalPrompt
    ? {
        systemPrompt: globalPrompt.systemPrompt,
        teachingStyle: globalPrompt.teachingStyle,
        outputFormat: globalPrompt.outputFormat,
        safetyConstraints: globalPrompt.safetyConstraints,
        antiDivergenceRules: globalPrompt.antiDivergenceRules,
      }
    : getDefaultKnowledgePromptSections();

  const renderedGlobal = renderKnowledgePromptTemplate(globalSections, {
    ...variables,
    student_level: input.studentLevel || globalPrompt?.gradeSegment || GENERAL,
    step: '\u5168\u5c40\u89c4\u5219',
  });

  const stepKeys: PromptStepKey[] = input.includeAllSteps
    ? ['step1', 'step2', 'step3', 'step4', 'step5']
    : input.stepKey && input.stepKey !== 'global'
      ? [input.stepKey]
      : [];
  const stepPrompts = await Promise.all(
    stepKeys.map(async (stepKey) => ({
      stepKey,
      prompt: await resolvePublishedKnowledgePrompt({
        subject: input.subject || GENERAL,
        gradeSegment: input.studentLevel,
        mode: input.mode,
        stepKey,
        allowGlobalStepFallback: false,
      }),
    })),
  );

  const stepBlocks = stepPrompts
    .filter((item) => item.prompt)
    .map((item) => {
      const prompt = item.prompt!;
      const rendered = renderKnowledgePromptTemplate(
        {
          systemPrompt: prompt.systemPrompt,
          teachingStyle: prompt.teachingStyle,
          outputFormat: prompt.outputFormat,
          safetyConstraints: prompt.safetyConstraints,
          antiDivergenceRules: prompt.antiDivergenceRules,
        },
        {
          ...variables,
          student_level: input.studentLevel || prompt.gradeSegment || GENERAL,
          step: item.stepKey,
        },
      );
      return `\u5f53\u524d\u6b65\u9aa4\u4e13\u5c5e\u63d0\u793a\u8bcd\uff08${item.stepKey}\uff09\n${rendered.mergedPrompt}`;
    });

  const activeStepPrompt = stepPrompts.find((item) => item.prompt)?.prompt || null;

  return {
    systemPrompt: [renderedGlobal.mergedPrompt, ...stepBlocks].filter(Boolean).join('\n\n'),
    source: activeStepPrompt || globalPrompt
      ? {
          id: (activeStepPrompt || globalPrompt)!.id,
          subject: (activeStepPrompt || globalPrompt)!.subject,
          gradeSegment: (activeStepPrompt || globalPrompt)!.gradeSegment,
          mode: (activeStepPrompt || globalPrompt)!.mode,
          stepKey: (activeStepPrompt || globalPrompt)!.stepKey,
          version: (activeStepPrompt || globalPrompt)!.version,
          status: (activeStepPrompt || globalPrompt)!.status,
        }
      : null,
  };
}

export function knowledgeStepNumberToPromptStepKey(step: number): PromptStepKey {
  if (step <= 1) return 'step1';
  if (step === 2) return 'step2';
  if (step === 3) return 'step3';
  if (step === 4) return 'step4';
  return 'step5';
}
