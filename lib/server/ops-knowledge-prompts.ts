import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { opsKnowledgePromptVersions } from '@/lib/db/schema';

export type PromptMode = 'dialog' | 'quick';

export type PromptDimension = {
  subject: string;
  gradeSegment: string;
  mode: PromptMode;
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

const DEFAULT_VARIABLES = ['subject', 'chapter', 'student_level', 'mode'];

const DEFAULT_SECTIONS: PromptSections = {
  name: '默认提示词',
  systemPrompt:
    '你是{{subject}}学科的学习教练，围绕{{chapter}}帮助学生完成回忆与复盘，学生水平是{{student_level}}。',
  teachingStyle: '启发式提问，逐步引导，先肯定后纠偏，语言简洁清晰。',
  outputFormat:
    '输出包含：1) 本步反馈 2) 需要补充的要点 3) 下一步行动。若已完成全部步骤，输出总结报告。',
  safetyConstraints:
    '拒绝违法、暴力、仇恨、色情、自残等有害内容；拒绝收集个人敏感信息；保持教育场景合规。',
  antiDivergenceRules:
    '不得偏离当前学科与章节；不得泛聊无关话题；若用户跑题，温和拉回当前学习目标。',
  variables: DEFAULT_VARIABLES,
};

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
  const merged: PromptSections = {
    ...DEFAULT_SECTIONS,
    name: sections.name ?? DEFAULT_SECTIONS.name,
    systemPrompt: sections.systemPrompt ?? DEFAULT_SECTIONS.systemPrompt,
    teachingStyle: sections.teachingStyle ?? DEFAULT_SECTIONS.teachingStyle,
    outputFormat: sections.outputFormat ?? DEFAULT_SECTIONS.outputFormat,
    safetyConstraints: sections.safetyConstraints ?? DEFAULT_SECTIONS.safetyConstraints,
    antiDivergenceRules: sections.antiDivergenceRules ?? DEFAULT_SECTIONS.antiDivergenceRules,
    variables: sections.variables || DEFAULT_VARIABLES,
  };

  const id = randomUUID();
  await db.insert(opsKnowledgePromptVersions).values({
    id,
    subject: dim.subject,
    gradeSegment: dim.gradeSegment,
    mode: dim.mode,
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
    throw new Error('仅草稿版本可编辑');
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
    },
    {
      name: `${target.name}（回滚）`,
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
    `教学风格：${rendered.teachingStyle}`,
    `输出格式：${rendered.outputFormat}`,
    `安全约束：${rendered.safetyConstraints}`,
    `禁发散规则：${rendered.antiDivergenceRules}`,
  ].join('\n');

  return { ...rendered, mergedPrompt };
}

export async function resolvePublishedKnowledgePrompt(
  dim: Pick<PromptDimension, 'subject' | 'mode'> & { gradeSegment?: string },
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
          eq(opsKnowledgePromptVersions.status, 'published'),
        ),
      )
      .orderBy(desc(opsKnowledgePromptVersions.version))
      .limit(1);
    if (rows[0]) return toPromptRecord(rows[0]);
  }

  return null;
}

export function getDefaultKnowledgePromptSections() {
  return DEFAULT_SECTIONS;
}
