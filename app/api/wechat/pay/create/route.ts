import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { createWechatPayOrder, getWechatPayMissingConfig } from '@/lib/server/wechat-pay';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  let body: { plan?: string; channel?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, '请求体 JSON 格式不正确。');
  }

  const missing = getWechatPayMissingConfig();
  if (missing.length > 0) {
    return apiError('INTERNAL_ERROR', 500, `微信支付配置缺失：${missing.join('、')}`);
  }

  try {
    const order = await createWechatPayOrder({
      userId,
      plan: body.plan || '',
      channel: body.channel || 'native',
    });
    return apiSuccess({
      message: '微信支付订单已创建',
      data: order,
    });
  } catch (error) {
    return apiError(
      'UPSTREAM_ERROR',
      400,
      error instanceof Error ? error.message : '创建微信支付订单失败',
    );
  }
}
