import { and, eq, or } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { clearAuthCookie, findUserById, getAuthUserId } from '@/lib/server/auth';
import { db } from '@/lib/db';
import {
  authBans,
  authEvents,
  otpTickets,
  shareRewards,
  subscriptionCodes,
  subscriptions,
  usageLogs,
  users,
} from '@/lib/db/schema';

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  const user = await findUserById(userId);
  if (!user) {
    await clearAuthCookie();
    return apiError('INVALID_REQUEST', 404, '账号不存在或已注销');
  }

  await db.transaction(async (tx) => {
    await tx.delete(usageLogs).where(eq(usageLogs.userId, userId));
    await tx.delete(subscriptions).where(eq(subscriptions.userId, userId));
    await tx.delete(subscriptionCodes).where(eq(subscriptionCodes.usedBy, userId));
    await tx.delete(shareRewards).where(
      or(eq(shareRewards.inviterId, userId), eq(shareRewards.inviteeId, userId)),
    );

    await tx
      .update(users)
      .set({ invitedBy: null })
      .where(eq(users.invitedBy, userId));

    await tx.delete(otpTickets).where(eq(otpTickets.phone, user.phone));
    await tx
      .delete(authEvents)
      .where(and(eq(authEvents.scope, 'phone'), eq(authEvents.identifier, user.phone)));
    await tx
      .delete(authBans)
      .where(and(eq(authBans.scope, 'phone'), eq(authBans.identifier, user.phone)));

    await tx.delete(users).where(eq(users.id, userId));
  });

  await clearAuthCookie();
  return apiSuccess({ message: '账号已注销' });
}

