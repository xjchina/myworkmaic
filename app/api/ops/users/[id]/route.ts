import { randomUUID } from 'crypto';
import { and, eq, gt } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { db } from '@/lib/db';
import { authBans, users } from '@/lib/db/schema';
import { requireOpsAdmin } from '@/lib/server/ops-auth';

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  const { id } = await context.params;
  let body: {
    subscriptionType?: 'free' | 'sub' | 'vip';
    subscriptionExpiresAt?: string | null;
    banAction?: 'ban' | 'unban';
    banHours?: number;
  };

  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, '请求格式错误');
  }

  const userRows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  const user = userRows[0];
  if (!user) return apiError('INVALID_REQUEST', 404, '用户不存在');

  if (body.subscriptionType) {
    const expiresAt =
      body.subscriptionExpiresAt === null
        ? null
        : parseDate(body.subscriptionExpiresAt || undefined) || user.subscriptionExpiresAt;

    await db
      .update(users)
      .set({
        subscriptionType: body.subscriptionType,
        subscriptionExpiresAt: expiresAt,
      })
      .where(eq(users.id, id));
  }

  if (body.banAction === 'ban') {
    const banHours = Number.isFinite(body.banHours) && Number(body.banHours) > 0 ? Number(body.banHours) : 24;
    const expiresAt = new Date(Date.now() + banHours * 60 * 60 * 1000);

    const existing = await db
      .select({ id: authBans.id })
      .from(authBans)
      .where(
        and(
          eq(authBans.scope, 'phone'),
          eq(authBans.identifier, user.phone),
          gt(authBans.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(authBans)
        .set({
          reason: '后台封禁',
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(authBans.id, existing[0].id));
    } else {
      await db.insert(authBans).values({
        id: randomUUID(),
        scope: 'phone',
        identifier: user.phone,
        reason: '后台封禁',
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  if (body.banAction === 'unban') {
    await db
      .delete(authBans)
      .where(and(eq(authBans.scope, 'phone'), eq(authBans.identifier, user.phone)));
  }

  return apiSuccess({ message: '更新成功' });
}
