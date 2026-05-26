import { randomUUID } from 'crypto';
import { asc, eq } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { db } from '@/lib/db';
import { opsPresetContents } from '@/lib/db/schema';
import { requireOpsAdmin } from '@/lib/server/ops-auth';
import { isMissingTableError, missingTableHint } from '@/lib/server/ops-db-error';

export async function GET(request: Request) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  try {
    const url = new URL(request.url);
    const type = (url.searchParams.get('type') || '').trim();

    const rows = await db
      .select()
      .from(opsPresetContents)
      .where(type ? eq(opsPresetContents.contentType, type) : undefined)
      .orderBy(asc(opsPresetContents.sortOrder), asc(opsPresetContents.createdAt));

    return apiSuccess({
      items: rows.map((row) => ({
        ...row,
        payload: JSON.parse(row.payloadJson),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return apiSuccess({ items: [], warning: missingTableHint() });
    }
    const detail = error instanceof Error ? error.message : String(error || '');
    return apiError('INTERNAL_ERROR', 500, '读取预置内容失败', detail || undefined);
  }
}

export async function POST(request: Request) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  try {
    let body: {
      contentType?: string;
      title?: string;
      summary?: string;
      payload?: unknown;
      sortOrder?: number;
      isVisible?: boolean;
    };
    try {
      body = await request.json();
    } catch {
      return apiError('INVALID_REQUEST', 400, '请求格式错误');
    }

    if (!body.contentType || !body.title || typeof body.payload === 'undefined') {
      return apiError('MISSING_REQUIRED_FIELD', 400, '请填写类型、标题与内容');
    }

    const id = randomUUID();
    await db.insert(opsPresetContents).values({
      id,
      contentType: body.contentType,
      title: body.title,
      summary: body.summary || null,
      payloadJson: JSON.stringify(body.payload),
      sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 0,
      isVisible: body.isVisible ?? true,
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
    return apiError('INTERNAL_ERROR', 500, '创建预置内容失败', detail || undefined);
  }
}
