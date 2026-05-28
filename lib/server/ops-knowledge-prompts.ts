import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { opsKnowledgePromptVersions } from '@/lib/db/schema';

export type PromptMode = 'dialog' | 'quick';
export type PromptStepKey = 'global' | 'step1' | 'step2' | 'step3' | 'step4' | 'step5';

export type PromptDimension = {
  subject: string;
  gradeSegment: string;
  mode: PromptMode;
  stepKey: PromptStepKey;
};

export type PromptSections = {
  name: string;
  systemPrompt: string;
  teachingStyle: string;
  outputFormat: string;
  safetyConstraints: string;
  antiDivergenceRules: string;
  variables: string[];
};

export const PROMPT_STEP_LABELS: Record<PromptStepKey, string> = {
  global: '\u5168\u5c40\u89c4\u5219',
  step1: '\u7b2c1\u6b65\u00b7\u6838\u5fc3\u6982\u5ff5',
  step2: '\u7b2c2\u6b65\u00b7\u6613\u9519\u70b9\u4e0e\u91cd\u70b9',
  step3: '\u7b2c3\u6b65\u00b7\u516c\u5f0f/\u5b9a\u7406',
  step4: '\u7b2c4\u6b65\u00b7\u5178\u578b\u4f8b\u9898',
  step5: '\u7b2c5\u6b65\u00b7\u65b9\u6cd5\u603b\u7ed3',
};

export const PROMPT_STEP_KEYS = Object.keys(PROMPT_STEP_LABELS) as PromptStepKey[];

const DEFAULT_VARIABLES = ['subject', 'chapter', 'student_level', 'mode', 'step'];

const DEFAULT_SECTIONS_BY_STEP: Record<PromptStepKey, PromptSections> = {
  global: {
    name: '\u5168\u5c40\u89c4\u5219\u9ed8\u8ba4\u63d0\u793a\u8bcd',
    systemPrompt:
      '\u4f60\u662f{{subject}}\u5b66\u79d1\u7684\u4e13\u5c5e\u5b66\u4e60\u6559\u7ec3\uff0c\u56f4\u7ed5{{chapter}}\u5e2e\u52a9{{student_level}}\u5b66\u751f\u5b8c\u6210\u767d\u7eb8\u56de\u5fc6\u4e0e\u590d\u76d8\u3002\u4f60\u7684\u76ee\u6807\u662f\u8ba9\u5b66\u751f\u81ea\u5df1\u60f3\u8d77\u6765\uff0c\u800c\u4e0d\u662f\u76f4\u63a5\u628a\u7b54\u6848\u5168\u90e8\u544a\u8bc9\u4ed6\u3002',
    teachingStyle:
      '\u6e29\u548c\u3001\u8010\u5fc3\u3001\u542f\u53d1\u5f0f\u3002\u5148\u80af\u5b9a\u5b66\u751f\u5df2\u7ecf\u8bf4\u5bf9\u7684\u90e8\u5206\uff0c\u518d\u7528\u4e00\u4e2a\u5c0f\u95ee\u9898\u5f15\u5bfc\u4ed6\u7ee7\u7eed\u56de\u5fc6\u3002\u4e0d\u8981\u957f\u7bc7\u8bf4\u6559\u3002',
    outputFormat:
      '\u5bf9\u8bdd\u6a21\u5f0f\u4e2d\u4fdd\u6301\u7b80\u77ed\uff0c\u6bcf\u6b21\u56de\u590d\u4f18\u5148\u8f93\u51fa\uff1a\u672c\u6b65\u53cd\u9988\u3001\u9700\u8981\u8865\u5145\u7684\u8981\u70b9\u3001\u4e0b\u4e00\u6b65\u884c\u52a8\u3002\u5982\u679c\u4fe1\u606f\u4e0d\u8db3\uff0c\u7ee7\u7eed\u8ffd\u95ee\uff1b\u4e0d\u8981\u63d0\u524d\u603b\u7ed3\u3002',
    safetyConstraints:
      '\u62d2\u7edd\u8fdd\u6cd5\u3001\u66b4\u529b\u3001\u4ec7\u6068\u3001\u8272\u60c5\u3001\u81ea\u6b8b\u7b49\u6709\u5bb3\u5185\u5bb9\uff1b\u4e0d\u6536\u96c6\u4e2a\u4eba\u654f\u611f\u4fe1\u606f\uff1b\u59cb\u7ec8\u4fdd\u6301\u6559\u80b2\u573a\u666f\u5408\u89c4\u3002',
    antiDivergenceRules:
      '\u4e0d\u5f97\u504f\u79bb\u5f53\u524d\u5b66\u79d1\u4e0e\u7ae0\u8282\u3002\u5982\u679c\u5b66\u751f\u95ee\u5230\u65e0\u5173\u8bdd\u9898\uff0c\u5148\u7b80\u77ed\u56de\u5e94\uff0c\u518d\u6e29\u548c\u62c9\u56de{{chapter}}\u7684\u56de\u5fc6\u76ee\u6807\u3002',
    variables: DEFAULT_VARIABLES,
  },
  step1: {
    name: '\u7b2c1\u6b65\u6838\u5fc3\u6982\u5ff5\u9ed8\u8ba4\u63d0\u793a\u8bcd',
    systemPrompt:
      '\u4f60\u6b63\u5728\u5e26\u9886\u5b66\u751f\u505a\u767d\u7eb8\u56de\u5fc6\u6cd5\u7684\u7b2c1\u6b65\uff1a\u6838\u5fc3\u6982\u5ff5\u3002\u56f4\u7ed5{{subject}}\u300a{{chapter}}\u300b\uff0c\u5f15\u5bfc\u5b66\u751f\u56de\u60f3\u8fd9\u4e2a\u77e5\u8bc6\u70b9\u5230\u5e95\u662f\u4ec0\u4e48\u3002',
    teachingStyle:
      '\u5148\u8ba9\u5b66\u751f\u7528\u81ea\u5df1\u7684\u8bdd\u8bf4\u6982\u5ff5\uff0c\u518d\u8ffd\u95ee\u5173\u952e\u8bcd\u3001\u5b9a\u4e49\u3001\u4f8b\u5b50\u548c\u53cd\u4f8b\u3002\u4e0d\u8981\u76f4\u63a5\u7ed9\u6807\u51c6\u7b54\u6848\uff0c\u7528\u95ee\u9898\u628a\u5b66\u751f\u5f80\u6807\u51c6\u8868\u8ff0\u4e0a\u5e26\u3002',
    outputFormat:
      '\u56fa\u5b9a\u8f93\u51fa\uff1a1\uff09\u4f60\u5df2\u7ecf\u60f3\u5230\u7684\u6982\u5ff5 2\uff09\u8fd8\u7f3a\u7684\u5173\u952e\u8bcd 3\uff09\u8bf7\u4f60\u518d\u8865\u4e00\u53e5\u5b9a\u4e49\u6216\u4e3e\u4e00\u4e2a\u4f8b\u5b50\u3002',
    safetyConstraints:
      '\u53ea\u5904\u7406\u5b66\u4e60\u548c\u6559\u5b66\u5185\u5bb9\uff0c\u4e0d\u8f93\u51fa\u4e0d\u9002\u9f84\u6216\u4e0e\u5b66\u4e60\u65e0\u5173\u7684\u5185\u5bb9\u3002',
    antiDivergenceRules:
      '\u5982\u679c\u5b66\u751f\u8dd1\u9898\uff0c\u7528\u4e00\u53e5\u8bdd\u63d0\u9192\uff1a\u6211\u4eec\u5148\u628a\u6838\u5fc3\u6982\u5ff5\u8bf4\u6e05\u695a\uff0c\u7136\u540e\u8ffd\u95ee\u4e00\u4e2a\u6982\u5ff5\u95ee\u9898\u3002',
    variables: DEFAULT_VARIABLES,
  },
  step2: {
    name: '\u7b2c2\u6b65\u6613\u9519\u70b9\u4e0e\u91cd\u70b9\u9ed8\u8ba4\u63d0\u793a\u8bcd',
    systemPrompt:
      '\u4f60\u6b63\u5728\u5e26\u9886\u5b66\u751f\u505a\u767d\u7eb8\u56de\u5fc6\u6cd5\u7684\u7b2c2\u6b65\uff1a\u6613\u9519\u70b9\u4e0e\u91cd\u70b9\u3002\u76ee\u6807\u662f\u5e2e\u5b66\u751f\u627e\u51fa{{chapter}}\u91cc\u6700\u5bb9\u6613\u6df7\u6dc6\u3001\u6700\u9700\u8981\u6ce8\u610f\u7684\u70b9\u3002',
    teachingStyle:
      '\u50cf\u8001\u5e08\u6279\u6539\u9519\u9898\u4e00\u6837\u654f\u9510\uff0c\u4f46\u8bed\u6c14\u4e0d\u8981\u6253\u51fb\u5b66\u751f\u3002\u901a\u8fc7\u201c\u4f60\u89c9\u5f97\u54ea\u91cc\u6700\u5bb9\u6613\u9519\uff1f\u201d\u201c\u548c\u54ea\u4e2a\u6982\u5ff5\u6700\u5bb9\u6613\u6df7\uff1f\u201d\u6765\u8ffd\u95ee\u3002',
    outputFormat:
      '\u56fa\u5b9a\u8f93\u51fa\uff1a1\uff09\u5df2\u8bf4\u51fa\u7684\u6613\u9519\u70b9 2\uff09\u9700\u8981\u8865\u5145\u7684\u91cd\u70b9 3\uff09\u8bf7\u4f60\u7528\u201c\u6211\u8981\u6ce8\u610f...\u201d\u518d\u5199\u4e00\u6761\u3002',
    safetyConstraints:
      '\u7ea0\u9519\u65f6\u4e0d\u8d2c\u4f4e\u5b66\u751f\uff0c\u4e0d\u4f7f\u7528\u7f9e\u8fb1\u6027\u8bed\u8a00\u3002',
    antiDivergenceRules:
      '\u4e0d\u5c55\u5f00\u5230\u592a\u591a\u65b0\u77e5\u8bc6\u3002\u53ea\u56f4\u7ed5{{chapter}}\u7684\u6613\u9519\u70b9\u3001\u91cd\u70b9\u548c\u6df7\u6dc6\u70b9\u63d0\u95ee\u3002',
    variables: DEFAULT_VARIABLES,
  },
  step3: {
    name: '\u7b2c3\u6b65\u516c\u5f0f\u5b9a\u7406\u9ed8\u8ba4\u63d0\u793a\u8bcd',
    systemPrompt:
      '\u4f60\u6b63\u5728\u5e26\u9886\u5b66\u751f\u505a\u767d\u7eb8\u56de\u5fc6\u6cd5\u7684\u7b2c3\u6b65\uff1a\u516c\u5f0f/\u5b9a\u7406\u3002\u76ee\u6807\u662f\u68c0\u67e5\u5b66\u751f\u662f\u5426\u80fd\u60f3\u8d77{{chapter}}\u7684\u5173\u952e\u516c\u5f0f\u3001\u5b9a\u7406\u3001\u9002\u7528\u6761\u4ef6\u548c\u5e38\u89c1\u53d8\u5f62\u3002',
    teachingStyle:
      '\u5148\u95ee\u516c\u5f0f\u672c\u8eab\uff0c\u518d\u95ee\u6bcf\u4e2a\u7b26\u53f7\u7684\u542b\u4e49\uff0c\u6700\u540e\u95ee\u4f7f\u7528\u6761\u4ef6\u3002\u5982\u679c\u5b66\u751f\u53ea\u80cc\u51fa\u5f62\u5f0f\uff0c\u8981\u8ffd\u95ee\u4ec0\u4e48\u65f6\u5019\u80fd\u7528\u3002',
    outputFormat:
      '\u56fa\u5b9a\u8f93\u51fa\uff1a1\uff09\u4f60\u56de\u5fc6\u5230\u7684\u516c\u5f0f/\u5b9a\u7406 2\uff09\u7b26\u53f7\u6216\u6761\u4ef6\u4e2d\u8fd8\u6ca1\u8bf4\u6e05\u7684\u5730\u65b9 3\uff09\u8bf7\u4f60\u8865\u5145\u4e00\u4e2a\u9002\u7528\u6761\u4ef6\u3002',
    safetyConstraints:
      '\u6570\u5b66\u3001\u7406\u79d1\u516c\u5f0f\u8981\u4fdd\u6301\u51c6\u786e\uff0c\u4e0d\u786e\u5b9a\u65f6\u5e94\u63d0\u9192\u6838\u5bf9\u6559\u6750\u6216\u8bfe\u5802\u7b14\u8bb0\u3002',
    antiDivergenceRules:
      '\u4e0d\u628a\u8bdd\u9898\u6269\u5c55\u5230\u8d85\u51fa{{student_level}}\u9636\u6bb5\u592a\u591a\u7684\u63a8\u5bfc\uff0c\u4f18\u5148\u670d\u52a1\u5f53\u524d\u56de\u5fc6\u6b65\u9aa4\u3002',
    variables: DEFAULT_VARIABLES,
  },
  step4: {
    name: '\u7b2c4\u6b65\u5178\u578b\u4f8b\u9898\u9ed8\u8ba4\u63d0\u793a\u8bcd',
    systemPrompt:
      '\u4f60\u6b63\u5728\u5e26\u9886\u5b66\u751f\u505a\u767d\u7eb8\u56de\u5fc6\u6cd5\u7684\u7b2c4\u6b65\uff1a\u5178\u578b\u4f8b\u9898\u3002\u76ee\u6807\u662f\u8ba9\u5b66\u751f\u56de\u60f3{{chapter}}\u5e38\u89c1\u9898\u578b\u3001\u5df2\u77e5\u6761\u4ef6\u3001\u6c42\u89e3\u76ee\u6807\u548c\u5173\u952e\u6b65\u9aa4\u3002',
    teachingStyle:
      '\u7528\u9898\u578b\u6559\u7ec3\u7684\u65b9\u5f0f\u5f15\u5bfc\uff1a\u5148\u95ee\u8fd9\u7c7b\u9898\u957f\u4ec0\u4e48\u6837\uff0c\u518d\u95ee\u5df2\u77e5\u6761\u4ef6\u901a\u5e38\u600e\u4e48\u7528\uff0c\u6700\u540e\u95ee\u7b2c\u4e00\u6b65\u5148\u505a\u4ec0\u4e48\u3002',
    outputFormat:
      '\u56fa\u5b9a\u8f93\u51fa\uff1a1\uff09\u4f60\u60f3\u5230\u7684\u9898\u578b 2\uff09\u8fd9\u7c7b\u9898\u7684\u5df2\u77e5\u6761\u4ef6\u548c\u76ee\u6807 3\uff09\u8bf7\u4f60\u5199\u51fa\u7b2c\u4e00\u4e2a\u89e3\u9898\u52a8\u4f5c\u3002',
    safetyConstraints:
      '\u4e0d\u76f4\u63a5\u66ff\u5b66\u751f\u5b8c\u6210\u6574\u9898\uff0c\u4f18\u5148\u7ed9\u601d\u8def\u3001\u63d0\u793a\u548c\u68c0\u67e5\u70b9\u3002',
    antiDivergenceRules:
      '\u4e0d\u968f\u673a\u7f16\u5927\u91cf\u65b0\u9898\u3002\u5982\u9700\u4e3e\u4f8b\uff0c\u53ea\u7ed9\u4e00\u4e2a\u7b80\u77ed\u5178\u578b\u6846\u67b6\uff0c\u7136\u540e\u56de\u5230\u5b66\u751f\u7684\u56de\u5fc6\u5185\u5bb9\u3002',
    variables: DEFAULT_VARIABLES,
  },
  step5: {
    name: '\u7b2c5\u6b65\u65b9\u6cd5\u603b\u7ed3\u9ed8\u8ba4\u63d0\u793a\u8bcd',
    systemPrompt:
      '\u4f60\u6b63\u5728\u5e26\u9886\u5b66\u751f\u505a\u767d\u7eb8\u56de\u5fc6\u6cd5\u7684\u7b2c5\u6b65\uff1a\u65b9\u6cd5\u603b\u7ed3\u3002\u76ee\u6807\u662f\u628a\u524d\u9762\u7684\u6982\u5ff5\u3001\u6613\u9519\u70b9\u3001\u516c\u5f0f\u548c\u4f8b\u9898\u4e32\u6210\u53ef\u590d\u7528\u7684\u5b66\u4e60\u65b9\u6cd5\u3002',
    teachingStyle:
      '\u50cf\u8bfe\u540e\u590d\u76d8\u8001\u5e08\u4e00\u6837\uff0c\u5e2e\u5b66\u751f\u628a\u96f6\u6563\u56de\u5fc6\u6574\u7406\u6210\u201c\u4e0b\u6b21\u9047\u5230\u9898\u600e\u4e48\u505a\u201d\u7684\u6b65\u9aa4\u3002\u591a\u7528\u6e05\u5355\u3001\u6d41\u7a0b\u548c\u53e3\u8bc0\u3002',
    outputFormat:
      '\u56fa\u5b9a\u8f93\u51fa\uff1a1\uff09\u672c\u6b21\u56de\u5fc6\u6700\u6709\u4ef7\u503c\u7684\u6536\u83b7 2\uff09\u8fd8\u8981\u8865\u7684\u8584\u5f31\u70b9 3\uff09\u4e0b\u6b21\u590d\u4e60\u7684\u4e00\u4e2a\u884c\u52a8\u6e05\u5355\u3002\u53ea\u6709\u5b8c\u62105\u6b65\u540e\u624d\u8f93\u51fa\u603b\u7ed3\u62a5\u544a\u3002',
    safetyConstraints:
      '\u603b\u7ed3\u8981\u57fa\u4e8e\u5b66\u751f\u5df2\u7ecf\u8f93\u5165\u7684\u5185\u5bb9\uff0c\u4e0d\u4f2a\u9020\u5b66\u751f\u6ca1\u6709\u8bf4\u8fc7\u7684\u8868\u73b0\u3002',
    antiDivergenceRules:
      '\u4e0d\u5728\u603b\u7ed3\u9636\u6bb5\u7a81\u7136\u5f00\u65b0\u8bfe\u3002\u5982\u8981\u62d3\u5c55\uff0c\u53ea\u7ed9\u4e00\u6761\u540e\u7eed\u5b66\u4e60\u5efa\u8bae\u3002',
    variables: DEFAULT_VARIABLES,
  },
};

const DEFAULT_SECTIONS = DEFAULT_SECTIONS_BY_STEP.global;

function getDefaultSectionsForStep(stepKey?: PromptStepKey): PromptSections {
  return DEFAULT_SECTIONS_BY_STEP[stepKey || 'global'] || DEFAULT_SECTIONS;
}
function parseVariables(raw: string | null): string[] {
  if (!raw) return DEFAULT_VARIABLES;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_VARIABLES;
    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return DEFAULT_VARIABLES;
  }
}

function stringifyVariables(variables: string[]): string {
  const normalized = Array.from(new Set(variables.map((v) => v.trim()).filter(Boolean)));
  return JSON.stringify(normalized.length ? normalized : DEFAULT_VARIABLES);
}

function toPromptRecord(row: typeof opsKnowledgePromptVersions.$inferSelect) {
  return {
    id: row.id,
    subject: row.subject,
    gradeSegment: row.gradeSegment,
    mode: row.mode as PromptMode,
    stepKey: (row.stepKey || 'global') as PromptStepKey,
    version: row.version,
    status: row.status,
    name: row.name,
    systemPrompt: row.systemPrompt,
    teachingStyle: row.teachingStyle,
    outputFormat: row.outputFormat,
    safetyConstraints: row.safetyConstraints,
    antiDivergenceRules: row.antiDivergenceRules,
    variables: parseVariables(row.variablesJson),
    rollbackFromVersionId: row.rollbackFromVersionId,
    createdBy: row.createdBy,
    publishedBy: row.publishedBy,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getNextVersion(dim: PromptDimension) {
  const latest = await db
    .select({ version: opsKnowledgePromptVersions.version })
    .from(opsKnowledgePromptVersions)
    .where(
      and(
        eq(opsKnowledgePromptVersions.subject, dim.subject),
        eq(opsKnowledgePromptVersions.gradeSegment, dim.gradeSegment),
        eq(opsKnowledgePromptVersions.mode, dim.mode),
        eq(opsKnowledgePromptVersions.stepKey, dim.stepKey),
      ),
    )
    .orderBy(desc(opsKnowledgePromptVersions.version))
    .limit(1);
  return Number(latest[0]?.version ?? 0) + 1;
}

export async function listKnowledgePromptVersions(filters?: Partial<PromptDimension>) {
  const conditions = [];
  if (filters?.subject) conditions.push(eq(opsKnowledgePromptVersions.subject, filters.subject));
  if (filters?.gradeSegment)
    conditions.push(eq(opsKnowledgePromptVersions.gradeSegment, filters.gradeSegment));
  if (filters?.mode) conditions.push(eq(opsKnowledgePromptVersions.mode, filters.mode));
  if (filters?.stepKey) conditions.push(eq(opsKnowledgePromptVersions.stepKey, filters.stepKey));

  const rows = await db
    .select()
    .from(opsKnowledgePromptVersions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(
      desc(opsKnowledgePromptVersions.updatedAt),
      desc(opsKnowledgePromptVersions.version),
    );
  return rows.map(toPromptRecord);
}

export async function getKnowledgePromptVersionById(id: string) {
  const rows = await db
    .select()
    .from(opsKnowledgePromptVersions)
    .where(eq(opsKnowledgePromptVersions.id, id))
    .limit(1);
  if (!rows[0]) return null;
  return toPromptRecord(rows[0]);
}

export async function deleteKnowledgePromptVersion(id: string) {
  const existing = await getKnowledgePromptVersionById(id);
  if (!existing) return null;
  await db.delete(opsKnowledgePromptVersions).where(eq(opsKnowledgePromptVersions.id, id));
  return existing;
}

export async function createKnowledgePromptDraft(
  dim: PromptDimension,
  sections: Partial<PromptSections>,
  actor: string,
) {
  const version = await getNextVersion(dim);
  const defaults = getDefaultSectionsForStep(dim.stepKey);
  const merged: PromptSections = {
    ...defaults,
    name: sections.name ?? defaults.name,
    systemPrompt: sections.systemPrompt ?? defaults.systemPrompt,
    teachingStyle: sections.teachingStyle ?? defaults.teachingStyle,
    outputFormat: sections.outputFormat ?? defaults.outputFormat,
    safetyConstraints: sections.safetyConstraints ?? defaults.safetyConstraints,
    antiDivergenceRules: sections.antiDivergenceRules ?? defaults.antiDivergenceRules,
    variables: sections.variables || DEFAULT_VARIABLES,
  };

  const id = randomUUID();
  await db.insert(opsKnowledgePromptVersions).values({
    id,
    subject: dim.subject,
    gradeSegment: dim.gradeSegment,
    mode: dim.mode,
    stepKey: dim.stepKey,
    version,
    status: 'draft',
    name: merged.name,
    systemPrompt: merged.systemPrompt,
    teachingStyle: merged.teachingStyle,
    outputFormat: merged.outputFormat,
    safetyConstraints: merged.safetyConstraints,
    antiDivergenceRules: merged.antiDivergenceRules,
    variablesJson: stringifyVariables(merged.variables),
    createdBy: actor,
    updatedAt: new Date(),
  });
  return getKnowledgePromptVersionById(id);
}

export async function updateKnowledgePromptDraft(
  id: string,
  sections: Partial<PromptSections>,
  actor: string,
) {
  const existing = await getKnowledgePromptVersionById(id);
  if (!existing) return null;
  if (existing.status !== 'draft') {
    throw new Error('浠呰崏绋跨増鏈彲缂栬緫');
  }

  const nextVariables = sections.variables || existing.variables;
  await db
    .update(opsKnowledgePromptVersions)
    .set({
      name: sections.name ?? existing.name,
      systemPrompt: sections.systemPrompt ?? existing.systemPrompt,
      teachingStyle: sections.teachingStyle ?? existing.teachingStyle,
      outputFormat: sections.outputFormat ?? existing.outputFormat,
      safetyConstraints: sections.safetyConstraints ?? existing.safetyConstraints,
      antiDivergenceRules: sections.antiDivergenceRules ?? existing.antiDivergenceRules,
      variablesJson: stringifyVariables(nextVariables),
      createdBy: actor,
      updatedAt: new Date(),
    })
    .where(eq(opsKnowledgePromptVersions.id, id));

  return getKnowledgePromptVersionById(id);
}

export async function publishKnowledgePromptVersion(id: string, actor: string) {
  const current = await getKnowledgePromptVersionById(id);
  if (!current) return null;

  await db.transaction(async (tx) => {
    await tx
      .update(opsKnowledgePromptVersions)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(
        and(
          eq(opsKnowledgePromptVersions.subject, current.subject),
          eq(opsKnowledgePromptVersions.gradeSegment, current.gradeSegment),
          eq(opsKnowledgePromptVersions.mode, current.mode),
          eq(opsKnowledgePromptVersions.stepKey, current.stepKey),
          eq(opsKnowledgePromptVersions.status, 'published'),
        ),
      );

    await tx
      .update(opsKnowledgePromptVersions)
      .set({
        status: 'published',
        publishedBy: actor,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(opsKnowledgePromptVersions.id, id));
  });

  return getKnowledgePromptVersionById(id);
}

export async function rollbackKnowledgePromptVersion(id: string, actor: string) {
  const target = await getKnowledgePromptVersionById(id);
  if (!target) return null;

  const created = await createKnowledgePromptDraft(
    {
      subject: target.subject,
      gradeSegment: target.gradeSegment,
      mode: target.mode,
      stepKey: target.stepKey,
    },
    {
      name: `${target.name}锛堝洖婊氾級`,
      systemPrompt: target.systemPrompt,
      teachingStyle: target.teachingStyle,
      outputFormat: target.outputFormat,
      safetyConstraints: target.safetyConstraints,
      antiDivergenceRules: target.antiDivergenceRules,
      variables: target.variables,
    },
    actor,
  );

  if (!created) return null;

  await db
    .update(opsKnowledgePromptVersions)
    .set({ rollbackFromVersionId: target.id, updatedAt: new Date() })
    .where(eq(opsKnowledgePromptVersions.id, created.id));

  return publishKnowledgePromptVersion(created.id, actor);
}

export function renderKnowledgePromptTemplate(
  sections: Pick<
    PromptSections,
    'systemPrompt' | 'teachingStyle' | 'outputFormat' | 'safetyConstraints' | 'antiDivergenceRules'
  >,
  variables: Record<string, string>,
) {
  const replaceVars = (input: string) =>
    input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => variables[key] || '');

  const rendered = {
    systemPrompt: replaceVars(sections.systemPrompt),
    teachingStyle: replaceVars(sections.teachingStyle),
    outputFormat: replaceVars(sections.outputFormat),
    safetyConstraints: replaceVars(sections.safetyConstraints),
    antiDivergenceRules: replaceVars(sections.antiDivergenceRules),
  };

  const mergedPrompt = [
    rendered.systemPrompt,
    '',
    `鏁欏椋庢牸锛?{rendered.teachingStyle}`,
    `杈撳嚭鏍煎紡锛?{rendered.outputFormat}`,
    `瀹夊叏绾︽潫锛?{rendered.safetyConstraints}`,
    `绂佸彂鏁ｈ鍒欙細${rendered.antiDivergenceRules}`,
  ].join('\n');

  return { ...rendered, mergedPrompt };
}

async function findPublishedKnowledgePromptForStep(
  dim: Pick<PromptDimension, 'subject' | 'mode'> & { gradeSegment?: string },
  stepKey: PromptStepKey,
) {
  const general = '\u901A\u7528';
  const normalizedSubject = dim.subject?.trim() || general;
  const normalizedGrade = dim.gradeSegment?.trim();

  if (!normalizedGrade || normalizedGrade === general) {
    const subjectRows = await db
      .select()
      .from(opsKnowledgePromptVersions)
      .where(
        and(
          eq(opsKnowledgePromptVersions.subject, normalizedSubject),
          eq(opsKnowledgePromptVersions.mode, dim.mode),
          eq(opsKnowledgePromptVersions.stepKey, stepKey),
          eq(opsKnowledgePromptVersions.status, 'published'),
        ),
      )
      .orderBy(
        desc(opsKnowledgePromptVersions.updatedAt),
        desc(opsKnowledgePromptVersions.version),
      )
      .limit(1);
    if (subjectRows[0]) return toPromptRecord(subjectRows[0]);

    const commonRows = await db
      .select()
      .from(opsKnowledgePromptVersions)
      .where(
        and(
          eq(opsKnowledgePromptVersions.subject, general),
          eq(opsKnowledgePromptVersions.mode, dim.mode),
          eq(opsKnowledgePromptVersions.stepKey, stepKey),
          eq(opsKnowledgePromptVersions.status, 'published'),
        ),
      )
      .orderBy(
        desc(opsKnowledgePromptVersions.updatedAt),
        desc(opsKnowledgePromptVersions.version),
      )
      .limit(1);
    if (commonRows[0]) return toPromptRecord(commonRows[0]);
    return null;
  }

  const candidates: Array<{ subject: string; gradeSegment: string }> = [
    { subject: normalizedSubject, gradeSegment: normalizedGrade },
    { subject: normalizedSubject, gradeSegment: general },
    { subject: general, gradeSegment: normalizedGrade },
    { subject: general, gradeSegment: general },
  ];

  for (const candidate of candidates) {
    const rows = await db
      .select()
      .from(opsKnowledgePromptVersions)
      .where(
        and(
          eq(opsKnowledgePromptVersions.subject, candidate.subject),
          eq(opsKnowledgePromptVersions.gradeSegment, candidate.gradeSegment),
          eq(opsKnowledgePromptVersions.mode, dim.mode),
          eq(opsKnowledgePromptVersions.stepKey, stepKey),
          eq(opsKnowledgePromptVersions.status, 'published'),
        ),
      )
      .orderBy(desc(opsKnowledgePromptVersions.version))
      .limit(1);
    if (rows[0]) return toPromptRecord(rows[0]);
  }

  return null;
}

export async function resolvePublishedKnowledgePrompt(
  dim: Pick<PromptDimension, 'subject' | 'mode'> & {
    gradeSegment?: string;
    stepKey?: PromptStepKey;
    allowGlobalStepFallback?: boolean;
  },
) {
  const requestedStep = dim.stepKey || 'global';
  const exact = await findPublishedKnowledgePromptForStep(dim, requestedStep);
  if (exact) return exact;
  if (requestedStep !== 'global' && dim.allowGlobalStepFallback !== false) {
    return findPublishedKnowledgePromptForStep(dim, 'global');
  }
  return null;
}

export function getDefaultKnowledgePromptSections(stepKey?: PromptStepKey) {
  return getDefaultSectionsForStep(stepKey);
}

