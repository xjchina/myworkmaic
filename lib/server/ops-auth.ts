import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const OPS_COOKIE_NAME = 'ops_admin_session';
const DEFAULT_SESSION_TTL_SEC = 60 * 60 * 12;

type OpsAccount = {
  username: string;
  password: string;
  displayName: string;
};

type OpsSessionPayload = {
  username: string;
  displayName: string;
  exp: number;
  nonce: string;
};

function getSessionSecret(): string {
  return process.env.OPS_ADMIN_SESSION_SECRET?.trim() || 'change-this-ops-admin-session-secret';
}

function parseAccounts(): OpsAccount[] {
  const raw = process.env.OPS_ADMIN_ACCOUNTS?.trim();
  if (!raw) {
    const username = process.env.OPS_ADMIN_USERNAME?.trim() || 'opsadmin';
    const password = process.env.OPS_ADMIN_PASSWORD?.trim() || 'opsadmin123';
    const displayName = process.env.OPS_ADMIN_DISPLAY_NAME?.trim() || '运营管理员';
    return [{ username, password, displayName }];
  }

  // OPS_ADMIN_ACCOUNTS format:
  // username:password:displayName,username2:password2:displayName2
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [username, password, displayName] = item.split(':');
      return {
        username: (username || '').trim(),
        password: (password || '').trim(),
        displayName: (displayName || username || '').trim() || '运营管理员',
      };
    })
    .filter((item) => item.username && item.password);
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf-8').toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf-8');
}

function signPart(part: string): string {
  return createHmac('sha256', getSessionSecret()).update(part).digest('base64url');
}

function secureCompare(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

export function verifyOpsCredentials(username: string, password: string) {
  const account = parseAccounts().find((item) => item.username === username);
  if (!account || account.password !== password) return null;
  return { username: account.username, displayName: account.displayName };
}

export function createOpsSessionToken(input: { username: string; displayName: string }): string {
  const payload: OpsSessionPayload = {
    username: input.username,
    displayName: input.displayName,
    exp: Math.floor(Date.now() / 1000) + DEFAULT_SESSION_TTL_SEC,
    nonce: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  };
  const part = base64UrlEncode(JSON.stringify(payload));
  const sig = signPart(part);
  return `${part}.${sig}`;
}

export function parseOpsSessionToken(token: string | undefined | null): OpsSessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [part, sig] = token.split('.', 2);
  const expected = signPart(part);
  if (!secureCompare(sig, expected)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(part)) as OpsSessionPayload;
    if (!parsed?.username || !parsed.exp || !parsed.displayName) return null;
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getOpsAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(OPS_COOKIE_NAME)?.value;
  return parseOpsSessionToken(token);
}

export async function requireOpsAdmin() {
  const session = await getOpsAdminSession();
  if (!session) {
    return { ok: false as const, status: 401, error: '请先登录后台管理系统' };
  }
  return { ok: true as const, session };
}

export function buildOpsSessionCookie(token: string) {
  return {
    name: OPS_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DEFAULT_SESSION_TTL_SEC,
  };
}

export function buildOpsLogoutCookie() {
  return {
    name: OPS_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  };
}
