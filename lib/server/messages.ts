import { randomUUID } from 'crypto';
import { and, count, desc, eq, isNull, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userMessages, users } from '@/lib/db/schema';

export type MessageCategory = 'system' | 'learning' | 'security' | 'membership' | 'activity';

export interface CreateUserMessageInput {
  userId: string;
  category: MessageCategory;
  title: string;
  content: string;
  actionUrl?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface ListUserMessagesInput {
  userId: string;
  page?: number;
  pageSize?: number;
  category?: MessageCategory | 'all';
  box?: 'all' | 'announcement' | 'personal';
  unreadOnly?: boolean;
}

export interface UserMessageListItem {
  id: string;
  category: MessageCategory;
  title: string;
  content: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

function normalizePage(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value) || !value) return fallback;
  return Math.max(1, Math.floor(value));
}

function normalizePageSize(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value) || !value) return fallback;
  return Math.min(50, Math.max(1, Math.floor(value)));
}

function asIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function createUserMessage(input: CreateUserMessageInput): Promise<void> {
  await db.insert(userMessages).values({
    id: randomUUID(),
    userId: input.userId,
    category: input.category,
    title: input.title.trim(),
    content: input.content.trim(),
    actionUrl: input.actionUrl || null,
    metaJson: input.meta ? JSON.stringify(input.meta) : null,
  });
}

export async function createUserMessageSafe(input: CreateUserMessageInput): Promise<void> {
  try {
    await createUserMessage(input);
  } catch (error) {
    console.error('[messages] create message failed:', error);
  }
}

export async function createBroadcastAnnouncement(input: {
  title: string;
  content: string;
  actionUrl?: string | null;
  meta?: Record<string, unknown> | null;
}): Promise<number> {
  const allUsers = await db.select({ id: users.id }).from(users);
  if (!allUsers.length) return 0;

  const now = new Date();
  const rows = allUsers.map((user) => ({
    id: randomUUID(),
    userId: user.id,
    category: 'activity' as const,
    title: input.title.trim(),
    content: input.content.trim(),
    actionUrl: input.actionUrl || null,
    metaJson: JSON.stringify({ scope: 'broadcast', ...(input.meta || {}) }),
    isRead: false,
    readAt: null,
    deletedAt: null,
    createdAt: now,
  }));

  await db.insert(userMessages).values(rows);
  return rows.length;
}

export async function listUserMessages(input: ListUserMessagesInput) {
  const page = normalizePage(input.page, 1);
  const pageSize = normalizePageSize(input.pageSize, 20);

  const conditions = [eq(userMessages.userId, input.userId), isNull(userMessages.deletedAt)];
  if (input.category && input.category !== 'all') {
    conditions.push(eq(userMessages.category, input.category));
  }
  if (input.box === 'announcement') {
    conditions.push(eq(userMessages.category, 'activity'));
  } else if (input.box === 'personal') {
    conditions.push(ne(userMessages.category, 'activity'));
  }
  if (input.unreadOnly) {
    conditions.push(eq(userMessages.isRead, false));
  }

  const whereExpr = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: userMessages.id,
        category: userMessages.category,
        title: userMessages.title,
        content: userMessages.content,
        actionUrl: userMessages.actionUrl,
        isRead: userMessages.isRead,
        createdAt: userMessages.createdAt,
        readAt: userMessages.readAt,
      })
      .from(userMessages)
      .where(whereExpr)
      .orderBy(desc(userMessages.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: count() })
      .from(userMessages)
      .where(whereExpr),
  ]);

  return {
    page,
    pageSize,
    total: Number(totalRows[0]?.total ?? 0),
    items: rows.map((row) => ({
      id: row.id,
      category: row.category as MessageCategory,
      title: row.title,
      content: row.content,
      actionUrl: row.actionUrl,
      isRead: Boolean(row.isRead),
      createdAt: asIso(row.createdAt) || new Date().toISOString(),
      readAt: asIso(row.readAt),
    })) satisfies UserMessageListItem[],
  };
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(userMessages)
    .where(and(eq(userMessages.userId, userId), eq(userMessages.isRead, false), isNull(userMessages.deletedAt)));
  return Number(rows[0]?.total ?? 0);
}

export async function markMessageRead(userId: string, messageId: string): Promise<boolean> {
  const target = await db
    .select({ id: userMessages.id, isRead: userMessages.isRead })
    .from(userMessages)
    .where(and(eq(userMessages.id, messageId), eq(userMessages.userId, userId), isNull(userMessages.deletedAt)))
    .limit(1);

  if (!target.length) return false;
  if (target[0].isRead) return true;

  await db
    .update(userMessages)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(userMessages.id, messageId), eq(userMessages.userId, userId), isNull(userMessages.deletedAt)));
  return true;
}

export async function markAllMessagesRead(userId: string, category?: MessageCategory | 'all'): Promise<number> {
  const conditions = [eq(userMessages.userId, userId), eq(userMessages.isRead, false), isNull(userMessages.deletedAt)];
  if (category && category !== 'all') {
    conditions.push(eq(userMessages.category, category));
  }

  const before = await db
    .select({ total: count() })
    .from(userMessages)
    .where(and(...conditions));

  const total = Number(before[0]?.total ?? 0);
  if (total <= 0) return 0;

  await db
    .update(userMessages)
    .set({ isRead: true, readAt: new Date() })
    .where(and(...conditions));

  return total;
}

export async function deleteMessage(userId: string, messageId: string): Promise<boolean> {
  const target = await db
    .select({ id: userMessages.id })
    .from(userMessages)
    .where(and(eq(userMessages.id, messageId), eq(userMessages.userId, userId), isNull(userMessages.deletedAt)))
    .limit(1);

  if (!target.length) return false;

  await db
    .update(userMessages)
    .set({ deletedAt: new Date() })
    .where(and(eq(userMessages.id, messageId), eq(userMessages.userId, userId), isNull(userMessages.deletedAt)));
  return true;
}
