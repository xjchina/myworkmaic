import { NextRequest, NextResponse } from 'next/server';
import {
  bindWechatIdentity,
  createWechatUser,
  ensureWechatPhonePlaceholder,
  findUserByWechatOpenId,
  findUserByWechatUnionId,
  isPhoneBound,
  setAuthCookie,
  updateLastLoginAt,
} from '@/lib/server/auth';
import {
  WECHAT_NEXT_COOKIE,
  WECHAT_STATE_COOKIE,
  exchangeWechatToken,
  fetchWechatUserInfo,
  readWechatConfig,
  resolveWechatBaseUrl,
  sanitizeNextPath,
} from '@/lib/server/wechat-auth';
import { checkCombinedCompliance } from '@/lib/server/content-compliance';
import { createUserMessageSafe } from '@/lib/server/messages';

function redirectWithError(request: NextRequest, message: string) {
  const baseUrl = resolveWechatBaseUrl(request);
  const url = new URL('/login', baseUrl);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { appId, appSecret } = readWechatConfig();
  if (!appId || !appSecret) {
    return redirectWithError(request, '微信登录尚未配置，请联系管理员。');
  }

  const code = request.nextUrl.searchParams.get('code')?.trim() || '';
  const state = request.nextUrl.searchParams.get('state')?.trim() || '';
  if (!code || !state) {
    return redirectWithError(request, '微信回调参数缺失，请重试。');
  }

  const savedState = request.cookies.get(WECHAT_STATE_COOKIE)?.value || '';
  const nextPath = sanitizeNextPath(request.cookies.get(WECHAT_NEXT_COOKIE)?.value || '/');
  if (!savedState || savedState !== state) {
    return redirectWithError(request, '微信登录状态校验失败，请重新扫码。');
  }

  try {
    const token = await exchangeWechatToken({ appId, appSecret, code });
    const userInfo = await fetchWechatUserInfo({
      accessToken: token.access_token,
      openId: token.openid,
    });
    const moderation = await checkCombinedCompliance({
      inputs: [userInfo.nickname],
      scene: 'wechat-profile',
      service: process.env.ALIYUN_GREEN_TEXT_SERVICE?.trim() || undefined,
    });
    const safeNickname = moderation.blocked ? '微信用户' : (userInfo.nickname || '微信用户');

    let user = await findUserByWechatOpenId(token.openid);
    let isNewUser = false;

    if (!user && token.unionid) {
      user = await findUserByWechatUnionId(token.unionid);
      if (user) {
        await bindWechatIdentity(user.id, {
          openId: token.openid,
          unionId: token.unionid,
        });
      }
    }

    if (!user) {
      user = await createWechatUser({
        openId: token.openid,
        unionId: token.unionid || userInfo.unionid || null,
        displayName: safeNickname,
        avatar: userInfo.headimgurl || null,
      });
      isNewUser = true;
    }

    if (!user) {
      return redirectWithError(request, '微信登录失败，请稍后重试。');
    }

    const finalPhone = await ensureWechatPhonePlaceholder(user.id, user.phone);
    await setAuthCookie(user.id);
    await updateLastLoginAt(user.id);
    await createUserMessageSafe({
      userId: user.id,
      category: 'security',
      title: isNewUser ? '微信账号创建成功' : '微信登录成功',
      content: isNewUser
        ? '你已通过微信完成首次登录，请尽快绑定手机号以便后续使用验证码或密码登录。'
        : '你已通过微信扫码登录账号。',
      actionUrl: isPhoneBound(finalPhone) ? '/account' : '/bind-phone',
    });

    const baseUrl = resolveWechatBaseUrl(request);
    const phoneBound = isPhoneBound(finalPhone);
    const targetPath = phoneBound
      ? nextPath
      : `/bind-phone?next=${encodeURIComponent(nextPath)}`;
    const response = NextResponse.redirect(new URL(targetPath, baseUrl));
    response.cookies.delete(WECHAT_STATE_COOKIE);
    response.cookies.delete(WECHAT_NEXT_COOKIE);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : '微信登录失败，请稍后重试。';
    return redirectWithError(request, message.slice(0, 80));
  }
}
