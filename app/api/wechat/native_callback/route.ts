import { NextResponse } from 'next/server';
import {
  applyPaidWechatTransaction,
  decryptWechatPayResource,
  verifyWechatPayCallbackSignature,
} from '@/lib/server/wechat-pay';

export const runtime = 'nodejs';

function fail(message: string, status = 400) {
  return NextResponse.json({ code: 'FAIL', message }, { status });
}

export async function POST(request: Request) {
  const body = await request.text();

  try {
    const verified = verifyWechatPayCallbackSignature(request.headers, body);
    if (!verified) {
      return fail('微信支付回调验签失败', 401);
    }

    const payload = JSON.parse(body) as {
      event_type?: string;
      resource?: {
        ciphertext: string;
        associated_data?: string;
        nonce: string;
      };
    };

    if (payload.event_type !== 'TRANSACTION.SUCCESS' || !payload.resource) {
      return new NextResponse(null, { status: 204 });
    }

    const transaction = decryptWechatPayResource(payload.resource);
    if (!transaction.out_trade_no?.startsWith('ZX')) {
      return new NextResponse(null, { status: 204 });
    }

    const result = await applyPaidWechatTransaction(transaction, JSON.stringify(transaction));
    if (!result.success) {
      return fail(result.message || '处理支付回调失败', 500);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '处理支付回调异常';
    return fail(message, 500);
  }
}
