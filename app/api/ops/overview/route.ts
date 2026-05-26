import { and, count, desc, gt, gte, sql } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { db } from '@/lib/db';
import { authBans, usageLogs, users } from '@/lib/db/schema';
import { requireOpsAdmin } from '@/lib/server/ops-auth';

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export async function GET() {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  const now = new Date();
  const d1 = daysAgo(1);
  const d7 = daysAgo(7);
  const d30 = daysAgo(30);

  const [totalUsersRows, newUsers7Rows, newUsers30Rows, active1dRows, usage7Rows, error7Rows, blocked7Rows] =
    await Promise.all([
      db.select({ total: count() }).from(users),
      db.select({ total: count() }).from(users).where(gte(users.createdAt, d7)),
      db.select({ total: count() }).from(users).where(gte(users.createdAt, d30)),
      db
        .select({ total: sql<number>`count(distinct ${usageLogs.userId})` })
        .from(usageLogs)
        .where(gte(usageLogs.createdAt, d1)),
      db.select({ total: count() }).from(usageLogs).where(gte(usageLogs.createdAt, d7)),
      db
        .select({ total: count() })
        .from(usageLogs)
        .where(and(gte(usageLogs.createdAt, d7), sql`${usageLogs.action} like '%error%'`)),
      db
        .select({ total: count() })
        .from(usageLogs)
        .where(and(gte(usageLogs.createdAt, d7), sql`${usageLogs.action} like '%blocked%'`)),
    ]);

  const featureRows = await db
    .select({
      feature: usageLogs.feature,
      total: count(),
    })
    .from(usageLogs)
    .where(gte(usageLogs.createdAt, d7))
    .groupBy(usageLogs.feature)
    .orderBy(desc(count()));

  const banRows = await db
    .select({ total: count() })
    .from(authBans)
    .where(and(eqOrSqlScopePhone(), gt(authBans.expiresAt, now)));

  const totalCalls = Number(usage7Rows[0]?.total ?? 0);
  const totalErrors = Number(error7Rows[0]?.total ?? 0);
  const totalBlocked = Number(blocked7Rows[0]?.total ?? 0);

  return apiSuccess({
    metrics: {
      totalUsers: Number(totalUsersRows[0]?.total ?? 0),
      newUsers7d: Number(newUsers7Rows[0]?.total ?? 0),
      newUsers30d: Number(newUsers30Rows[0]?.total ?? 0),
      activeUsers1d: Number(active1dRows[0]?.total ?? 0),
      calls7d: totalCalls,
      errorRate7d: totalCalls > 0 ? Number(((totalErrors / totalCalls) * 100).toFixed(2)) : 0,
      moderationBlockRate7d:
        totalCalls > 0 ? Number(((totalBlocked / totalCalls) * 100).toFixed(2)) : 0,
      activeBans: Number(banRows[0]?.total ?? 0),
    },
    featureUsage7d: featureRows.map((row) => ({
      feature: row.feature,
      total: Number(row.total ?? 0),
    })),
  });
}

function eqOrSqlScopePhone() {
  return sql`${authBans.scope} = 'phone'`;
}
