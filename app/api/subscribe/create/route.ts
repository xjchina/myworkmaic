import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { checkCombinedCompliance } from '@/lib/server/content-compliance';
import { createSubscription } from '@/lib/server/subscription';
import { createUserMessageSafe } from '@/lib/server/messages';

const VALID_PLANS = ['monthly', 'yearly'] as const;
type Plan = (typeof VALID_PLANS)[number];

export async function POST(request: Request) {
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
    return apiError('INVALID_REQUEST', 400, '请求体 JSON 格式不正确。');
  }

  const plan = body.plan as Plan;
  if (!VALID_PLANS.includes(plan)) {
    return apiError('INVALID_REQUEST', 400, `plan 参数无效，可选：${VALID_PLANS.join(', ')}`);
  }

  const moderation = await checkCombinedCompliance({
    inputs: [body.plan, body.payment_id],
    scene: 'subscribe-create',
    service: process.env.ALIYUN_GREEN_TEXT_SERVICE?.trim() || undefined,
  });
  if (moderation.blocked) {
    return apiError(
      'CONTENT_SENSITIVE',
      400,
      '输入内容未通过审核，请调整后重试。',
      moderation.labels.length ? `命中标签：${moderation.labels.join(', ')}` : undefined,
    );
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

  await createUserMessageSafe({
    userId,
    category: 'membership',
    title: '会员开通成功',
    content: `你已开通${plan === 'yearly' ? '年费 VIP' : '订阅会员'}，到期日：${result.expiresAt ?? '以系统为准'}。`,
    actionUrl: '/subscribe',
  });

  return apiSuccess({
    message: '订阅创建成功',
    data: {
      subscriptionId: result.subscriptionId,
      expiresAt: result.expiresAt,
    },
  });
}
