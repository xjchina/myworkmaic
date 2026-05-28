import { randomUUID } from 'crypto';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
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
  unreadOnly?: boolean;
}

export interface UserMessageListItem {
  id: string;
  title: string;
  content: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface BroadcastAnnouncementItem {
  title: string;
  content: string;
  actionUrl: string | null;
  sender: string | null;
  sentAt: string;
  recipients: number;
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

export async function listBroadcastAnnouncements(limit = 20): Promise<BroadcastAnnouncementItem[]> {
  const rows = await db
    .select({
      title: userMessages.title,
      content: userMessages.content,
      actionUrl: userMessages.actionUrl,
      metaJson: userMessages.metaJson,
      createdAt: userMessages.createdAt,
    })
    .from(userMessages)
    .where(and(eq(userMessages.category, 'activity'), isNull(userMessages.deletedAt)))
    .orderBy(desc(userMessages.createdAt))
    .limit(Math.min(500, Math.max(20, limit * 8)));

  const grouped = new Map<string, BroadcastAnnouncementItem>();
  for (const row of rows) {
    const ts = row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt);
    const sentAt = Number.isNaN(ts.getTime()) ? new Date().toISOString() : ts.toISOString();
    const key = `${sentAt}|${row.title}|${row.content}|${row.actionUrl || ''}`;
    if (!grouped.has(key)) {
      let sender: string | null = null;
      if (row.metaJson) {
        try {
          const meta = JSON.parse(row.metaJson) as { sender?: string; source?: string; scope?: string };
          if (meta.sender) sender = meta.sender;
        } catch {
          sender = null;
        }
      }
      grouped.set(key, {
        title: row.title,
        content: row.content,
        actionUrl: row.actionUrl,
        sender,
        sentAt,
        recipients: 1,
      });
    } else {
      const current = grouped.get(key)!;
      current.recipients += 1;
    }
  }

  return Array.from(grouped.values())
    .sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))
    .slice(0, Math.max(1, limit));
}

export async function listUserMessages(input: ListUserMessagesInput) {
  const page = normalizePage(input.page, 1);
  const pageSize = normalizePageSize(input.pageSize, 20);

  const conditions = [eq(userMessages.userId, input.userId), isNull(userMessages.deletedAt)];
  if (input.unreadOnly) {
    conditions.push(eq(userMessages.isRead, false));
  }

  const whereExpr = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: userMessages.id,
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

export async function markAllMessagesRead(userId: string): Promise<number> {
  const conditions = [eq(userMessages.userId, userId), eq(userMessages.isRead, false), isNull(userMessages.deletedAt)];

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
