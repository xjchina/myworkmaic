import { apiError } from '@/lib/server/api-response';

export async function POST() {
  return apiError(
    'INVALID_REQUEST',
    410,
    '会员开通已接入微信支付，请使用 /api/wechat/pay/create 创建真实支付订单。',
  );
}
