import {
  getDefaultKnowledgePromptSections,
  renderKnowledgePromptTemplate,
  resolvePublishedKnowledgePrompt,
  type PromptMode,
} from '@/lib/server/ops-knowledge-prompts';

const GENERAL = '\u901A\u7528';
const UNTITLED_CHAPTER = '\u672A\u547D\u540D\u7AE0\u8282';

export async function resolveKnowledgeRecallSystemPrompt(input: {
  subject: string;
  chapter: string;
  studentLevel?: string;
  mode: PromptMode;
}) {
  const published = await resolvePublishedKnowledgePrompt({
    subject: input.subject || GENERAL,
    gradeSegment: input.studentLevel,
    mode: input.mode,
  });

  const sections = published
    ? {
        systemPrompt: published.systemPrompt,
        teachingStyle: published.teachingStyle,
        outputFormat: published.outputFormat,
        safetyConstraints: published.safetyConstraints,
        antiDivergenceRules: published.antiDivergenceRules,
      }
    : getDefaultKnowledgePromptSections();

  const rendered = renderKnowledgePromptTemplate(sections, {
    subject: input.subject || GENERAL,
    chapter: input.chapter || UNTITLED_CHAPTER,
    student_level: input.studentLevel || published?.gradeSegment || GENERAL,
    mode: input.mode,
  });

  return {
    systemPrompt: rendered.mergedPrompt,
    source: published
      ? {
          id: published.id,
          subject: published.subject,
          gradeSegment: published.gradeSegment,
          mode: published.mode,
          version: published.version,
          status: published.status,
        }
      : null,
  };
}
