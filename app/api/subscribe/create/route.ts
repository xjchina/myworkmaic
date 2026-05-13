import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { createSubscription } from '@/lib/server/subscription';

const VALID_PLANS = ['monthly', 'yearly'] as const;
type Plan = (typeof VALID_PLANS)[number];

export async function POST(request: Request) {
  // This endpoint is designed to be called from a trusted payment callback.
  // For production, add webhook signature verification (e.g., WeChat Pay signature).
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  let body: {
    plan?: string;
    payment_id?: string;
    amount?: number;
  };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const plan = body.plan as Plan;
  if (!VALID_PLANS.includes(plan)) {
    return apiError('INVALID_REQUEST', 400, `plan 参数无效，可选：${VALID_PLANS.join(', ')}`);
  }

  const result = await createSubscription({
    userId,
    plan,
    paymentId: body.payment_id,
    amount: body.amount,
  });

  if (!result.success) {
    return apiError('INVALID_REQUEST', 400, result.message ?? '订阅创建失败');
  }

  return apiSuccess({
    message: '订阅创建成功',
    data: {
      subscriptionId: result.subscriptionId,
      expiresAt: result.expiresAt,
    },
  });
}
