import { NextRequest, NextResponse } from 'next/server';
import {
  WECHAT_NEXT_COOKIE,
  WECHAT_STATE_COOKIE,
  WECHAT_STATE_TTL_SECONDS,
  buildWechatAuthorizeUrl,
  createWechatState,
  readWechatConfig,
  resolveWechatBaseUrl,
  sanitizeNextPath,
} from '@/lib/server/wechat-auth';

export async function GET(request: NextRequest) {
  const { appId, appSecret } = readWechatConfig();
  if (!appId || !appSecret) {
    const url = new URL('/login', request.url);
    url.searchParams.set('error', '微信登录尚未配置，请联系管理员。');
    return NextResponse.redirect(url);
  }

  const baseUrl = resolveWechatBaseUrl(request);
  const callbackUrl = `${baseUrl}/api/auth/wechat/callback`;
  const state = createWechatState();
  const next = sanitizeNextPath(request.nextUrl.searchParams.get('next'));
  const authorizeUrl = buildWechatAuthorizeUrl({
    appId,
    callbackUrl,
    state,
  });

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(WECHAT_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: WECHAT_STATE_TTL_SECONDS,
  });
  response.cookies.set(WECHAT_NEXT_COOKIE, next, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: WECHAT_STATE_TTL_SECONDS,
  });
  return response;
}
