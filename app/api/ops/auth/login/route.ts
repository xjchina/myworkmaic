import { NextRequest, NextResponse } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  buildOpsSessionCookie,
  createOpsSessionToken,
  verifyOpsCredentials,
} from '@/lib/server/ops-auth';

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, '请求格式错误');
  }

  const username = (body.username || '').trim();
  const password = body.password || '';
  if (!username || !password) {
    return apiError('MISSING_REQUIRED_FIELD', 400, '请输入后台账号和密码');
  }

  const account = verifyOpsCredentials(username, password);
  if (!account) {
    return apiError('INVALID_REQUEST', 401, '账号或密码错误');
  }

  const token = createOpsSessionToken(account);
  const res = apiSuccess({
    message: '登录成功',
    user: { username: account.username, displayName: account.displayName },
  });
  res.cookies.set(buildOpsSessionCookie(token));
  return res;
}

export function GET() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405 });
}
