import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getAuthUserId } from '@/lib/server/auth';
import { getWechatPayOrderForUser, queryWechatOrderAndSync } from '@/lib/server/wechat-pay';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return apiError('INVALID_REQUEST', 401, '请先登录');
  }

  const url = new URL(request.url);
  const outTradeNo = url.searchParams.get('outTradeNo')?.trim() || '';
  if (!outTradeNo) {
    return apiError('INVALID_REQUEST', 400, '缺少订单号');
  }

  let order = await getWechatPayOrderForUser(userId, outTradeNo);
  if (!order) {
    return apiError('INVALID_REQUEST', 404, '订单不存在');
  }

  if (order.status === 'pending') {
    try {
      await queryWechatOrderAndSync(outTradeNo);
      order = await getWechatPayOrderForUser(userId, outTradeNo);
    } catch {
      // 回调通常会完成状态同步；主动查单失败时保持本地状态，避免打断前端轮询。
    }
  }

  return apiSuccess({
    data: {
      outTradeNo: order?.outTradeNo ?? outTradeNo,
      status: order?.status ?? 'pending',
      plan: order?.plan ?? null,
      amount: order?.amount ?? null,
      paidAt: order?.paidAt ? order.paidAt.toISOString() : null,
    },
  });
}
