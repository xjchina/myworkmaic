import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { getSubscriptionStatus } from '@/lib/server/subscription';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  const status = await getSubscriptionStatus(userId);
  if (!status) {
    return apiError('INVALID_REQUEST', 404, '用户不存在');
  }

  return apiSuccess({
    data: {
      subscriptionType: status.subscriptionType,
      plan: status.plan,
      status: status.status,
      expiresAt: status.expiresAt,
      remainingDays: status.remainingDays,
      permissions: {
        classroomDaily: status.permissions.classroomDaily,
        knowledgeSteps: status.permissions.knowledgeSteps,
        exerciseDaily: status.permissions.exerciseDaily,
        dataExport: status.permissions.dataExport,
        analytics: status.permissions.analytics,
        dataHistory: status.permissions.dataHistory,
      },
    },
  });
}
