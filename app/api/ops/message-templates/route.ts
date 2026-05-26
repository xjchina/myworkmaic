import { randomUUID } from 'crypto';
import { desc } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { db } from '@/lib/db';
import { opsMessageTemplates } from '@/lib/db/schema';
import { requireOpsAdmin } from '@/lib/server/ops-auth';
import { isMissingTableError, missingTableHint } from '@/lib/server/ops-db-error';

export async function GET() {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  try {
    const rows = await db
      .select()
      .from(opsMessageTemplates)
      .orderBy(desc(opsMessageTemplates.updatedAt));

    return apiSuccess({
      items: rows.map((row) => ({
        ...row,
        variables: row.variablesJson ? JSON.parse(row.variablesJson) : [],
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return apiSuccess({ items: [], warning: missingTableHint() });
    }
    const detail = error instanceof Error ? error.message : String(error || '');
    return apiError('INTERNAL_ERROR', 500, '读取模板失败', detail || undefined);
  }
}

export async function POST(request: Request) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  try {
    let body: {
      name?: string;
      category?: string;
      titleTemplate?: string;
      contentTemplate?: string;
      actionUrl?: string;
      variables?: string[];
    };
    try {
      body = await request.json();
    } catch {
      return apiError('INVALID_REQUEST', 400, '请求格式错误');
    }

    if (!body.name || !body.titleTemplate || !body.contentTemplate) {
      return apiError('MISSING_REQUIRED_FIELD', 400, '请填写模板名、标题模板和内容模板');
    }

    const id = randomUUID();
    await db.insert(opsMessageTemplates).values({
      id,
      name: body.name,
      category: body.category || 'system',
      titleTemplate: body.titleTemplate,
      contentTemplate: body.contentTemplate,
      actionUrl: body.actionUrl || null,
      variablesJson: JSON.stringify(body.variables || []),
      createdBy: auth.session.username,
      updatedBy: auth.session.username,
      updatedAt: new Date(),
    });

    return apiSuccess({ message: '创建成功', id }, 201);
  } catch (error) {
    if (isMissingTableError(error)) {
      return apiError('INVALID_REQUEST', 400, missingTableHint());
    }
    const detail = error instanceof Error ? error.message : String(error || '');
    return apiError('INTERNAL_ERROR', 500, '创建模板失败', detail || undefined);
  }
}
