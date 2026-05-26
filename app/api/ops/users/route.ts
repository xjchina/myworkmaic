import { and, count, desc, eq, gt, like, or } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { db } from '@/lib/db';
import { authBans, users } from '@/lib/db/schema';
import { requireOpsAdmin } from '@/lib/server/ops-auth';

function normalizePage(value: string | null, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export async function GET(request: Request) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  const url = new URL(request.url);
  const page = normalizePage(url.searchParams.get('page'), 1);
  const pageSize = Math.min(50, normalizePage(url.searchParams.get('pageSize'), 20));
  const q = (url.searchParams.get('q') || '').trim();

  const whereExpr = q
    ? or(like(users.phone, `%${q}%`), like(users.displayName, `%${q}%`), like(users.id, `%${q}%`))
    : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: users.id,
        phone: users.phone,
        displayName: users.displayName,
        subscriptionType: users.subscriptionType,
        subscriptionExpiresAt: users.subscriptionExpiresAt,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(whereExpr)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(users).where(whereExpr),
  ]);

  const phones = rows.map((row) => row.phone).filter(Boolean);
  const activeBans =
    phones.length > 0
      ? await db
          .select({ identifier: authBans.identifier })
          .from(authBans)
          .where(and(eq(authBans.scope, 'phone'), gt(authBans.expiresAt, new Date())))
      : [];
  const banSet = new Set(activeBans.map((row) => row.identifier));

  return apiSuccess({
    page,
    pageSize,
    total: Number(totalRows[0]?.total ?? 0),
    items: rows.map((row) => ({
      ...row,
      banned: banSet.has(row.phone),
      subscriptionExpiresAt: row.subscriptionExpiresAt
        ? row.subscriptionExpiresAt.toISOString().slice(0, 10)
        : null,
      createdAt: row.createdAt.toISOString(),
      lastLoginAt: row.lastLoginAt.toISOString(),
    })),
  });
}
