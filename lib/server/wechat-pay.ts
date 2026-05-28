import { createDecipheriv, createSign, createVerify, randomBytes, randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, wechatPaymentOrders } from '@/lib/db/schema';
import { createUserMessageSafe } from '@/lib/server/messages';
import { createSubscription, type SubscriptionPlan } from '@/lib/server/subscription';

const WECHAT_PAY_API_BASE = 'https://api.mch.weixin.qq.com';
const VALID_PLANS = ['monthly', 'yearly'] as const;
const VALID_CHANNELS = ['native', 'jsapi'] as const;

export type WechatPayPlan = (typeof VALID_PLANS)[number];
export type WechatPayChannel = (typeof VALID_CHANNELS)[number];

interface WechatPayConfig {
  appId: string;
  mchId: string;
  mchSerialNo: string;
  privateKey: string;
  apiV3Key: string;
  notifyUrl: string;
  publicKey: string | null;
  publicKeyId: string | null;
}

interface WechatTransaction {
  appid?: string;
  mchid?: string;
  out_trade_no: string;
  transaction_id?: string;
  trade_type?: string;
  trade_state: string;
  success_time?: string;
  payer?: {
    openid?: string;
  };
  amount?: {
    total?: number;
    payer_total?: number;
    currency?: string;
  };
}

function readEnv(name: string): string {
  return process.env[name]?.trim() || '';
}

function readSecretValue(value: string, pathValue: string): string {
  if (pathValue) {
    return readFileSync(pathValue, 'utf8').trim();
  }
  return value.replace(/\\n/g, '\n').trim();
}

function normalizePem(value: string): string {
  if (!value) return '';
  if (value.includes('-----BEGIN')) return value;
  try {
    return Buffer.from(value, 'base64').toString('utf8').trim();
  } catch {
    return value;
  }
}

export function getWechatPayMissingConfig(): string[] {
  const missing: string[] = [];
  const appId = readEnv('WECHAT_PAY_APP_ID') || readEnv('WECHAT_APP_ID');
  const privateKey = readEnv('WECHAT_PAY_PRIVATE_KEY') || readEnv('WECHAT_PAY_PRIVATE_KEY_PATH');
  const publicKey = readEnv('WECHAT_PAY_PUBLIC_KEY') || readEnv('WECHAT_PAY_PUBLIC_KEY_PATH');

  if (!appId) missing.push('WECHAT_PAY_APP_ID');
  if (!readEnv('WECHAT_PAY_MCH_ID')) missing.push('WECHAT_PAY_MCH_ID');
  if (!readEnv('WECHAT_PAY_MCH_SERIAL_NO')) missing.push('WECHAT_PAY_MCH_SERIAL_NO');
  if (!privateKey) missing.push('WECHAT_PAY_PRIVATE_KEY 或 WECHAT_PAY_PRIVATE_KEY_PATH');
  if (!readEnv('WECHAT_PAY_API_V3_KEY')) missing.push('WECHAT_PAY_API_V3_KEY');
  if (!publicKey && process.env.NODE_ENV === 'production') {
    missing.push('WECHAT_PAY_PUBLIC_KEY 或 WECHAT_PAY_PUBLIC_KEY_PATH');
  }
  return missing;
}

function readWechatPayConfig(): WechatPayConfig {
  const appId = readEnv('WECHAT_PAY_APP_ID') || readEnv('WECHAT_APP_ID');
  const mchId = readEnv('WECHAT_PAY_MCH_ID');
  const mchSerialNo = readEnv('WECHAT_PAY_MCH_SERIAL_NO');
  const privateKey = normalizePem(
    readSecretValue(readEnv('WECHAT_PAY_PRIVATE_KEY'), readEnv('WECHAT_PAY_PRIVATE_KEY_PATH')),
  );
  const apiV3Key = readEnv('WECHAT_PAY_API_V3_KEY');
  const notifyUrl =
    readEnv('WECHAT_PAY_NOTIFY_URL') ||
    `${(readEnv('NEXT_PUBLIC_BASE_URL') || 'https://zhixue.space').replace(/\/$/, '')}/api/wechat/native_callback`;
  const publicKey = normalizePem(
    readSecretValue(readEnv('WECHAT_PAY_PUBLIC_KEY'), readEnv('WECHAT_PAY_PUBLIC_KEY_PATH')),
  );
  const publicKeyId = readEnv('WECHAT_PAY_PUBLIC_KEY_ID');

  const missing = getWechatPayMissingConfig();
  if (missing.length > 0) {
    throw new Error(`微信支付配置缺失：${missing.join('、')}`);
  }
  if (apiV3Key.length !== 32) {
    throw new Error('WECHAT_PAY_API_V3_KEY 必须是 32 位 APIv3 密钥');
  }

  return {
    appId,
    mchId,
    mchSerialNo,
    privateKey,
    apiV3Key,
    notifyUrl,
    publicKey: publicKey || null,
    publicKeyId: publicKeyId || null,
  };
}

function randomString(bytes = 16): string {
  return randomBytes(bytes).toString('hex');
}

function signWithMerchantKey(message: string, privateKey: string): string {
  const signer = createSign('RSA-SHA256');
  signer.update(message);
  signer.end();
  return signer.sign(privateKey, 'base64');
}

function buildAuthorizationHeader(config: WechatPayConfig, method: string, url: URL, body: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomString();
  const canonicalUrl = `${url.pathname}${url.search}`;
  const message = `${method}\n${canonicalUrl}\n${timestamp}\n${nonce}\n${body}\n`;
  const signature = signWithMerchantKey(message, config.privateKey);

  return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${config.mchSerialNo}",signature="${signature}"`;
}

async function requestWechat<T>(method: string, pathAndQuery: string, payload?: unknown): Promise<T> {
  const config = readWechatPayConfig();
  const url = new URL(pathAndQuery, WECHAT_PAY_API_BASE);
  const body = payload ? JSON.stringify(payload) : '';
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: buildAuthorizationHeader(config, method, url, body),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body || undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const message = data?.message || data?.code || text || '微信支付接口请求失败';
    throw new Error(String(message));
  }
  return data as T;
}

export function getPlanAmount(plan: WechatPayPlan): number {
  if (plan === 'yearly') {
    return Number(readEnv('WECHAT_PAY_YEARLY_AMOUNT_CENTS') || 19900);
  }
  return Number(readEnv('WECHAT_PAY_MONTHLY_AMOUNT_CENTS') || 2900);
}

function getPlanDescription(plan: WechatPayPlan): string {
  return plan === 'yearly' ? '年费VIP' : '订阅会员';
}

function assertPlan(plan: string): asserts plan is WechatPayPlan {
  if (!VALID_PLANS.includes(plan as WechatPayPlan)) {
    throw new Error('会员方案无效');
  }
}

function assertChannel(channel: string): asserts channel is WechatPayChannel {
  if (!VALID_CHANNELS.includes(channel as WechatPayChannel)) {
    throw new Error('支付渠道无效');
  }
}

function createOutTradeNo(): string {
  const time = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14);
  return `ZX${time}${randomBytes(4).toString('hex').toUpperCase()}`;
}

function toWechatTime(date: Date): string {
  return date.toISOString();
}

export async function createWechatPayOrder(input: {
  userId: string;
  plan: string;
  channel?: string;
}) {
  assertPlan(input.plan);
  const channel = input.channel || 'native';
  assertChannel(channel);

  const config = readWechatPayConfig();
  const userRows = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  const user = userRows[0];
  if (!user) throw new Error('用户不存在');
  if (channel === 'jsapi' && !user.wechatOpenId) {
    throw new Error('当前账号没有可用于 JSAPI 支付的微信 openid，请先使用扫码支付');
  }

  const outTradeNo = createOutTradeNo();
  const amount = getPlanAmount(input.plan);
  const description = getPlanDescription(input.plan);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await db.insert(wechatPaymentOrders).values({
    id: randomUUID(),
    outTradeNo,
    userId: input.userId,
    plan: input.plan,
    channel,
    amount,
    status: 'pending',
    description,
    expiresAt,
  });

  const payload: Record<string, unknown> = {
    appid: config.appId,
    mchid: config.mchId,
    description,
    out_trade_no: outTradeNo,
    time_expire: toWechatTime(expiresAt),
    notify_url: config.notifyUrl,
    amount: {
      total: amount,
      currency: 'CNY',
    },
    attach: JSON.stringify({ userId: input.userId, plan: input.plan }),
  };

  if (channel === 'jsapi') {
    payload.payer = { openid: user.wechatOpenId };
  }

  const endpoint = channel === 'jsapi' ? '/v3/pay/transactions/jsapi' : '/v3/pay/transactions/native';
  const result = await requestWechat<{ code_url?: string; prepay_id?: string }>('POST', endpoint, payload);

  await db
    .update(wechatPaymentOrders)
    .set({
      codeUrl: result.code_url || null,
      prepayId: result.prepay_id || null,
      updatedAt: new Date(),
    })
    .where(eq(wechatPaymentOrders.outTradeNo, outTradeNo));

  const payParams =
    channel === 'jsapi' && result.prepay_id
      ? buildJsapiPayParams(config, result.prepay_id)
      : null;

  return {
    outTradeNo,
    plan: input.plan,
    channel,
    amount,
    amountYuan: amount / 100,
    description,
    expiresAt: expiresAt.toISOString(),
    codeUrl: result.code_url || null,
    qrCodeUrl: result.code_url
      ? `/api/wechat/qrcode?data=${encodeURIComponent(result.code_url)}`
      : null,
    payParams,
  };
}

function buildJsapiPayParams(config: WechatPayConfig, prepayId: string) {
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = randomString();
  const packageValue = `prepay_id=${prepayId}`;
  const paySign = signWithMerchantKey(
    `${config.appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`,
    config.privateKey,
  );
  return {
    appId: config.appId,
    timeStamp,
    nonceStr,
    package: packageValue,
    signType: 'RSA',
    paySign,
  };
}

export async function getWechatPayOrderForUser(userId: string, outTradeNo: string) {
  const rows = await db
    .select()
    .from(wechatPaymentOrders)
    .where(and(eq(wechatPaymentOrders.userId, userId), eq(wechatPaymentOrders.outTradeNo, outTradeNo)))
    .limit(1);
  return rows[0] ?? null;
}

export async function queryWechatOrderAndSync(outTradeNo: string) {
  const config = readWechatPayConfig();
  const data = await requestWechat<WechatTransaction>(
    'GET',
    `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${encodeURIComponent(config.mchId)}`,
  );
  if (data.trade_state === 'SUCCESS') {
    await applyPaidWechatTransaction(data, JSON.stringify(data));
  } else if (['CLOSED', 'REVOKED', 'PAYERROR'].includes(data.trade_state)) {
    await db
      .update(wechatPaymentOrders)
      .set({ status: data.trade_state === 'CLOSED' ? 'closed' : 'failed', notifyJson: JSON.stringify(data), updatedAt: new Date() })
      .where(eq(wechatPaymentOrders.outTradeNo, data.out_trade_no));
  }
  return data;
}

export function verifyWechatPayCallbackSignature(headers: Headers, body: string): boolean {
  if (readEnv('WECHAT_PAY_SKIP_VERIFY') === 'true' && process.env.NODE_ENV !== 'production') {
    return true;
  }

  const config = readWechatPayConfig();
  if (!config.publicKey) {
    throw new Error('微信支付回调验签公钥未配置');
  }

  const serial = headers.get('wechatpay-serial') || '';
  const signature = headers.get('wechatpay-signature') || '';
  const timestamp = headers.get('wechatpay-timestamp') || '';
  const nonce = headers.get('wechatpay-nonce') || '';
  if (!serial || !signature || !timestamp || !nonce) {
    return false;
  }
  if (config.publicKeyId && serial !== config.publicKeyId) {
    return false;
  }

  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${timestamp}\n${nonce}\n${body}\n`);
  verifier.end();
  return verifier.verify(config.publicKey, signature, 'base64');
}

export function decryptWechatPayResource(resource: {
  ciphertext: string;
  associated_data?: string;
  nonce: string;
}): WechatTransaction {
  const config = readWechatPayConfig();
  const encrypted = Buffer.from(resource.ciphertext, 'base64');
  const authTag = encrypted.subarray(encrypted.length - 16);
  const ciphertext = encrypted.subarray(0, encrypted.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(config.apiV3Key), Buffer.from(resource.nonce));
  decipher.setAuthTag(authTag);
  if (resource.associated_data) {
    decipher.setAAD(Buffer.from(resource.associated_data));
  }
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  return JSON.parse(plaintext) as WechatTransaction;
}

export async function applyPaidWechatTransaction(transaction: WechatTransaction, rawJson: string) {
  if (transaction.trade_state !== 'SUCCESS') {
    return { success: false, message: `订单未支付：${transaction.trade_state}` };
  }

  const rows = await db
    .select()
    .from(wechatPaymentOrders)
    .where(eq(wechatPaymentOrders.outTradeNo, transaction.out_trade_no))
    .limit(1);
  const order = rows[0];
  if (!order) {
    return { success: false, message: '本地订单不存在' };
  }
  if (order.status === 'paid') {
    return { success: true, alreadyPaid: true };
  }

  const paidAmount = Number(transaction.amount?.total ?? 0);
  if (paidAmount !== Number(order.amount)) {
    await db
      .update(wechatPaymentOrders)
      .set({ status: 'failed', notifyJson: rawJson, updatedAt: new Date() })
      .where(eq(wechatPaymentOrders.outTradeNo, order.outTradeNo));
    return { success: false, message: '支付金额与订单金额不一致' };
  }

  const subscription = await createSubscription({
    userId: order.userId,
    plan: order.plan as SubscriptionPlan,
    paymentId: order.outTradeNo,
    amount: paidAmount,
  });
  if (!subscription.success) {
    return { success: false, message: subscription.message || '会员开通失败' };
  }

  await db
    .update(wechatPaymentOrders)
    .set({
      status: 'paid',
      transactionId: transaction.transaction_id || null,
      payerOpenId: transaction.payer?.openid || null,
      notifyJson: rawJson,
      paidAt: transaction.success_time ? new Date(transaction.success_time) : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(wechatPaymentOrders.outTradeNo, order.outTradeNo));

  await createUserMessageSafe({
    userId: order.userId,
    category: 'membership',
    title: '会员开通成功',
    content: `你已开通${order.plan === 'yearly' ? '年费 VIP' : '订阅会员'}，到期日：${subscription.expiresAt ?? '以系统为准'}。`,
    actionUrl: '/subscribe',
  });

  return { success: true, subscription };
}
