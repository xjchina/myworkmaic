import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { usageLogs } from '@/lib/db/schema';
import { getSubscriptionStatus } from '@/lib/server/subscription';

export interface DashboardStats {
  completedClassrooms: number;
  practiceQuestionCount: number;
  discussionTopics: number;
  continuousLearningDays: number;
}

function resolveAnalyticsWindowDays(analytics: 'day' | 'week' | 'full'): number | null {
  if (analytics === 'day') return 1;
  if (analytics === 'week') return 7;
  return null;
}

function buildWindowStart(days: number | null): Date | null {
  if (!days || days <= 0) return null;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

const SHANGHAI_TIMEZONE = 'Asia/Shanghai';
function toDayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function prevDayKey(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function computeStreak(dayKeys: string[]): number {
  if (dayKeys.length === 0) return 0;
  const set = new Set(dayKeys);
  let cursorKey = toDayKey(new Date());

  if (!set.has(cursorKey)) {
    cursorKey = prevDayKey(cursorKey);
  }

  let streak = 0;
  while (set.has(cursorKey)) {
    streak += 1;
    cursorKey = prevDayKey(cursorKey);
  }
  return streak;
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const subscription = await getSubscriptionStatus(userId);
  const windowDays = resolveAnalyticsWindowDays(subscription?.permissions.analytics ?? 'day');
  const windowStart = buildWindowStart(windowDays);

  const classroomWhere = windowStart
    ? and(
        eq(usageLogs.userId, userId),
        eq(usageLogs.feature, 'classroom'),
        eq(usageLogs.action, 'classroom_completed'),
        gte(usageLogs.createdAt, windowStart),
      )
    : and(
        eq(usageLogs.userId, userId),
        eq(usageLogs.feature, 'classroom'),
        eq(usageLogs.action, 'classroom_completed'),
      );

  const [classroomRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usageLogs)
    .where(classroomWhere);

  const exerciseWhere = windowStart
    ? and(
        eq(usageLogs.userId, userId),
        eq(usageLogs.feature, 'exercise'),
        eq(usageLogs.action, 'quiz_generated'),
        gte(usageLogs.createdAt, windowStart),
      )
    : and(
        eq(usageLogs.userId, userId),
        eq(usageLogs.feature, 'exercise'),
        eq(usageLogs.action, 'quiz_generated'),
      );

  const [practiceRow] = await db
    .select({
      total:
        sql<number>`coalesce(sum(case when ${usageLogs.durationSeconds} is null then 0 else ${usageLogs.durationSeconds} end), 0)`,
    })
    .from(usageLogs)
    .where(exerciseWhere);

  const discussionWhere = windowStart
    ? and(
        eq(usageLogs.userId, userId),
        eq(usageLogs.feature, 'roundtable'),
        eq(usageLogs.action, 'topic_started'),
        gte(usageLogs.createdAt, windowStart),
      )
    : and(
        eq(usageLogs.userId, userId),
        eq(usageLogs.feature, 'roundtable'),
        eq(usageLogs.action, 'topic_started'),
      );

  const [discussionRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usageLogs)
    .where(discussionWhere);

  const activityWhere = windowStart
    ? and(eq(usageLogs.userId, userId), gte(usageLogs.createdAt, windowStart))
    : eq(usageLogs.userId, userId);

  const activityRows = await db
    .select({ createdAt: usageLogs.createdAt })
    .from(usageLogs)
    .where(activityWhere);

  const dayKeys = activityRows
    .map((row) => (row.createdAt ? toDayKey(new Date(row.createdAt)) : ''))
    .filter((key) => key.length > 0);

  return {
    completedClassrooms: Number(classroomRow?.count ?? 0),
    practiceQuestionCount: Number(practiceRow?.total ?? 0),
    discussionTopics: Number(discussionRow?.count ?? 0),
    continuousLearningDays: computeStreak(dayKeys),
  };
}
