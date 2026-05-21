import { randomUUID } from 'crypto';

const WECHAT_AUTHORIZE_URL = 'https://open.weixin.qq.com/connect/qrconnect';
const WECHAT_TOKEN_URL = 'https://api.weixin.qq.com/sns/oauth2/access_token';
const WECHAT_USERINFO_URL = 'https://api.weixin.qq.com/sns/userinfo';

export const WECHAT_STATE_COOKIE = 'openmaic_wechat_state';
export const WECHAT_NEXT_COOKIE = 'openmaic_wechat_next';
export const WECHAT_STATE_TTL_SECONDS = 10 * 60;

export type WechatOauthToken = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  openid: string;
  scope: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

export type WechatUserInfo = {
  openid: string;
  nickname?: string;
  headimgurl?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

export function readWechatConfig() {
  const appId = process.env.WECHAT_APP_ID?.trim() || '';
  const appSecret = process.env.WECHAT_APP_SECRET?.trim() || '';
  const siteBase = process.env.NEXT_PUBLIC_BASE_URL?.trim() || '';
  return { appId, appSecret, siteBase };
}

export function resolveWechatBaseUrl(request: Request): string {
  const cfg = readWechatConfig();
  if (cfg.siteBase) return cfg.siteBase.replace(/\/$/, '');

  const host = request.headers.get('x-forwarded-host')?.trim() || request.headers.get('host')?.trim();
  const protocol = request.headers.get('x-forwarded-proto')?.trim() || 'https';
  if (host) return `${protocol}://${host}`.replace(/\/$/, '');

  return new URL(request.url).origin.replace(/\/$/, '');
}

export function createWechatState() {
  return randomUUID().replace(/-/g, '');
}

export function sanitizeNextPath(input: string | null | undefined): string {
  const value = (input || '').trim();
  if (!value.startsWith('/')) return '/';
  if (value.startsWith('//')) return '/';
  return value;
}

export function buildWechatAuthorizeUrl(args: {
  appId: string;
  callbackUrl: string;
  state: string;
}) {
  const params = new URLSearchParams({
    appid: args.appId,
    redirect_uri: args.callbackUrl,
    response_type: 'code',
    scope: 'snsapi_login',
    state: args.state,
  });

  return `${WECHAT_AUTHORIZE_URL}?${params.toString()}#wechat_redirect`;
}

export async function exchangeWechatToken(args: {
  appId: string;
  appSecret: string;
  code: string;
}) {
  const params = new URLSearchParams({
    appid: args.appId,
    secret: args.appSecret,
    code: args.code,
    grant_type: 'authorization_code',
  });

  const res = await fetch(`${WECHAT_TOKEN_URL}?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });
  const data = (await res.json()) as WechatOauthToken;

  if (!res.ok || data.errcode || !data.openid || !data.access_token) {
    throw new Error(data.errmsg || `微信 Token 交换失败（HTTP ${res.status}）`);
  }

  return data;
}

export async function fetchWechatUserInfo(args: {
  accessToken: string;
  openId: string;
}) {
  const params = new URLSearchParams({
    access_token: args.accessToken,
    openid: args.openId,
    lang: 'zh_CN',
  });

  const res = await fetch(`${WECHAT_USERINFO_URL}?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });
  const data = (await res.json()) as WechatUserInfo;

  if (!res.ok || data.errcode || !data.openid) {
    throw new Error(data.errmsg || `微信用户信息获取失败（HTTP ${res.status}）`);
  }

  return data;
}
