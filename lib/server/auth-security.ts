import { createHash, randomUUID } from 'crypto';
import { and, eq, gte, gt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { authBans, authEvents, captchaTickets } from '@/lib/db/schema';

type AuthAction = 'send_code' | 'login' | 'register' | 'captcha';
type AuthScope = 'ip' | 'device' | 'phone';

type SecurityContext = {
  request: Request;
  action: Exclude<AuthAction, 'captcha'>;
  phone?: string;
};

type SecurityResult = {
  ok: boolean;
  message?: string;
  waitSeconds?: number;
};

type CaptchaIssueResult = {
  captchaId: string;
  imageDataUrl: string;
  expiresInSeconds: number;
};

type CaptchaVerifyInput = {
  request: Request;
  captchaId?: string;
  captchaAnswer?: string;
};

type CaptchaTicketRecord = {
  id: string;
  answer: string;
  issuedIp: string;
  issuedDevice: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
};

const CAPTCHA_EXPIRE_SECONDS = 5 * 60;
const CAPTCHA_MAX_ATTEMPTS = 5;
const CAPTCHA_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function getMemoryCaptchaStore() {
  const holder = globalThis as typeof globalThis & {
    __openmaicCaptchaStore?: Map<string, CaptchaTicketRecord>;
  };
  if (!holder.__openmaicCaptchaStore) {
    holder.__openmaicCaptchaStore = new Map<string, CaptchaTicketRecord>();
  }
  return holder.__openmaicCaptchaStore;
}

function pruneMemoryCaptchaStore() {
  const store = getMemoryCaptchaStore();
  const now = Date.now();
  for (const [id, ticket] of store.entries()) {
    if (ticket.expiresAt.getTime() <= now) {
      store.delete(id);
    }
  }
}

function setMemoryCaptchaTicket(ticket: CaptchaTicketRecord) {
  pruneMemoryCaptchaStore();
  getMemoryCaptchaStore().set(ticket.id, ticket);
}

function getMemoryCaptchaTicket(id: string) {
  pruneMemoryCaptchaStore();
  return getMemoryCaptchaStore().get(id);
}

function deleteMemoryCaptchaTicket(id: string) {
  getMemoryCaptchaStore().delete(id);
}

const RATE_LIMITS: Record<Exclude<AuthAction, 'captcha'>, Array<{ scope: AuthScope; limit: number; windowSec: number; message: string }>> = {
  send_code: [
    { scope: 'ip', limit: 20, windowSec: 60 * 60, message: '当前 IP 请求过于频繁，请稍后再试。' },
    { scope: 'device', limit: 12, windowSec: 60 * 60, message: '当前设备请求过于频繁，请稍后再试。' },
    { scope: 'phone', limit: 6, windowSec: 60 * 60, message: '该手机号请求过于频繁，请稍后再试。' },
  ],
  login: [
    { scope: 'ip', limit: 40, windowSec: 15 * 60, message: '登录尝试过于频繁，请稍后再试。' },
    { scope: 'device', limit: 20, windowSec: 15 * 60, message: '当前设备登录过于频繁，请稍后再试。' },
    { scope: 'phone', limit: 15, windowSec: 15 * 60, message: '该手机号登录过于频繁，请稍后再试。' },
  ],
  register: [
    { scope: 'ip', limit: 15, windowSec: 60 * 60, message: '当前 IP 注册请求过于频繁，请稍后再试。' },
    { scope: 'device', limit: 8, windowSec: 60 * 60, message: '当前设备注册请求过于频繁，请稍后再试。' },
    { scope: 'phone', limit: 4, windowSec: 60 * 60, message: '该手机号注册请求过于频繁，请稍后再试。' },
  ],
};

const BAN_RULES: Record<Exclude<AuthAction, 'captcha'>, Array<{ scope: AuthScope; threshold: number; windowSec: number; banSec: number; reason: string }>> = {
  send_code: [
    { scope: 'ip', threshold: 25, windowSec: 30 * 60, banSec: 30 * 60, reason: '验证码请求异常' },
    { scope: 'device', threshold: 15, windowSec: 30 * 60, banSec: 30 * 60, reason: '验证码请求异常' },
  ],
  login: [
    { scope: 'phone', threshold: 8, windowSec: 30 * 60, banSec: 30 * 60, reason: '登录失败次数过多' },
    { scope: 'ip', threshold: 20, windowSec: 30 * 60, banSec: 30 * 60, reason: '登录失败次数过多' },
    { scope: 'device', threshold: 12, windowSec: 30 * 60, banSec: 30 * 60, reason: '登录失败次数过多' },
  ],
  register: [
    { scope: 'phone', threshold: 6, windowSec: 30 * 60, banSec: 30 * 60, reason: '注册失败次数过多' },
    { scope: 'ip', threshold: 12, windowSec: 30 * 60, banSec: 30 * 60, reason: '注册失败次数过多' },
    { scope: 'device', threshold: 8, windowSec: 30 * 60, banSec: 30 * 60, reason: '注册失败次数过多' },
  ],
};

function normalizePhone(phone?: string): string | null {
  const value = (phone || '').replace(/\D/g, '');
  if (!value) return null;
  return value;
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp.slice(0, 64);
  return 'unknown';
}

export function getDeviceId(request: Request): string {
  const explicit = request.headers.get('x-device-id')?.trim();
  if (explicit) return explicit.slice(0, 128);

  const ua = request.headers.get('user-agent') || 'unknown-user-agent';
  const digest = createHash('sha256').update(ua).digest('hex').slice(0, 32);
  return `ua-${digest}`;
}

function collectIdentifiers(request: Request, phone?: string) {
  const ip = getClientIp(request);
  const device = getDeviceId(request);
  const phoneNumber = normalizePhone(phone);
  return {
    ip,
    device,
    phone: phoneNumber,
  };
}

async function countEvents(params: {
  action: AuthAction;
  scope: AuthScope;
  identifier: string;
  since: Date;
  success?: boolean;
}) {
  const where = [
    eq(authEvents.action, params.action),
    eq(authEvents.scope, params.scope),
    eq(authEvents.identifier, params.identifier),
    gte(authEvents.createdAt, params.since),
  ];

  if (typeof params.success === 'boolean') {
    where.push(eq(authEvents.success, params.success));
  }

  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(authEvents)
    .where(and(...where));

  return Number(rows[0]?.count || 0);
}

async function upsertBan(scope: AuthScope, identifier: string, reason: string, banSec: number) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + banSec * 1000);
  await db
    .insert(authBans)
    .values({
      id: randomUUID(),
      scope,
      identifier,
      reason,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        reason,
        expiresAt,
        updatedAt: now,
      },
    });
}

async function checkBan(scope: AuthScope, identifier: string) {
  const rows = await db
    .select({ reason: authBans.reason, expiresAt: authBans.expiresAt })
    .from(authBans)
    .where(and(eq(authBans.scope, scope), eq(authBans.identifier, identifier), gt(authBans.expiresAt, new Date())))
    .limit(1);

  return rows[0] ?? null;
}

export async function enforceAuthSecurity(context: SecurityContext): Promise<SecurityResult> {
  const ids = collectIdentifiers(context.request, context.phone);

  const banChecks: Array<{ scope: AuthScope; identifier: string | null }> = [
    { scope: 'ip', identifier: ids.ip },
    { scope: 'device', identifier: ids.device },
    { scope: 'phone', identifier: ids.phone },
  ];

  for (const item of banChecks) {
    if (!item.identifier) continue;
    const activeBan = await checkBan(item.scope, item.identifier);
    if (activeBan) {
      const waitSeconds = Math.max(1, Math.ceil((activeBan.expiresAt.getTime() - Date.now()) / 1000));
      return {
        ok: false,
        message: `操作受限：${activeBan.reason}，请 ${waitSeconds} 秒后重试。`,
        waitSeconds,
      };
    }
  }

  const rules = RATE_LIMITS[context.action];
  for (const rule of rules) {
    const identifier = rule.scope === 'ip' ? ids.ip : rule.scope === 'device' ? ids.device : ids.phone;
    if (!identifier) continue;

    const since = new Date(Date.now() - rule.windowSec * 1000);
    const count = await countEvents({
      action: context.action,
      scope: rule.scope,
      identifier,
      since,
    });

    if (count >= rule.limit) {
      return {
        ok: false,
        message: rule.message,
        waitSeconds: rule.windowSec,
      };
    }
  }

  return { ok: true };
}

export async function recordAuthResult(params: {
  request: Request;
  action: Exclude<AuthAction, 'captcha'>;
  phone?: string;
  success: boolean;
  reason?: string;
}) {
  const now = new Date();
  const ids = collectIdentifiers(params.request, params.phone);
  const targets: Array<{ scope: AuthScope; identifier: string | null }> = [
    { scope: 'ip', identifier: ids.ip },
    { scope: 'device', identifier: ids.device },
    { scope: 'phone', identifier: ids.phone },
  ];

  for (const target of targets) {
    if (!target.identifier) continue;
    await db.insert(authEvents).values({
      id: randomUUID(),
      action: params.action,
      scope: target.scope,
      identifier: target.identifier,
      success: params.success,
      reason: params.reason || null,
      createdAt: now,
    });
  }

  if (params.success) return;

  const rules = BAN_RULES[params.action];
  for (const rule of rules) {
    const identifier = rule.scope === 'ip' ? ids.ip : rule.scope === 'device' ? ids.device : ids.phone;
    if (!identifier) continue;

    const failedCount = await countEvents({
      action: params.action,
      scope: rule.scope,
      identifier,
      since: new Date(Date.now() - rule.windowSec * 1000),
      success: false,
    });

    if (failedCount >= rule.threshold) {
      await upsertBan(rule.scope, identifier, rule.reason, rule.banSec);
    }
  }
}

function randomCaptchaText(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * CAPTCHA_CHARS.length);
    out += CAPTCHA_CHARS[idx];
  }
  return out;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function buildCaptchaSvg(text: string): string {
  const width = 140;
  const height = 44;
  const chars = text.split('');

  const letters = chars
    .map((char, index) => {
      const x = 16 + index * 28 + randomInt(-2, 2);
      const y = 30 + randomInt(-2, 2);
      const rotate = randomInt(-20, 20);
      return `<text x="${x}" y="${y}" font-size="24" fill="#1f2937" transform="rotate(${rotate} ${x} ${y})" font-family="Arial, sans-serif" font-weight="700">${escapeXml(char)}</text>`;
    })
    .join('');

  const lines = Array.from({ length: 5 })
    .map(() => {
      const x1 = randomInt(0, width);
      const y1 = randomInt(0, height);
      const x2 = randomInt(0, width);
      const y2 = randomInt(0, height);
      const opacity = Math.random() * 0.35 + 0.15;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64748b" stroke-width="1" opacity="${opacity.toFixed(2)}" />`;
    })
    .join('');

  const dots = Array.from({ length: 20 })
    .map(() => {
      const cx = randomInt(0, width);
      const cy = randomInt(0, height);
      const r = randomInt(1, 2);
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#94a3b8" opacity="0.25" />`;
    })
    .join('');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <rect x="0" y="0" width="${width}" height="${height}" rx="8" fill="#f8fafc" stroke="#cbd5e1" />`,
    `  ${lines}`,
    `  ${dots}`,
    `  ${letters}`,
    '</svg>',
  ].join('\n');
}

export async function issueCaptcha(request: Request): Promise<CaptchaIssueResult> {
  const now = new Date();
  const captchaId = randomUUID();
  const answer = randomCaptchaText(4);
  const issuedIp = getClientIp(request);
  const issuedDevice = getDeviceId(request);
  const expiresAt = new Date(now.getTime() + CAPTCHA_EXPIRE_SECONDS * 1000);

  const payload: CaptchaTicketRecord = {
    id: captchaId,
    answer,
    issuedIp,
    issuedDevice,
    attempts: 0,
    expiresAt,
    createdAt: now,
  };

  try {
    await db.insert(captchaTickets).values(payload);
  } catch {
    setMemoryCaptchaTicket(payload);
  }

  const svg = buildCaptchaSvg(answer);
  const imageDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return {
    captchaId,
    imageDataUrl,
    expiresInSeconds: CAPTCHA_EXPIRE_SECONDS,
  };
}
export async function verifyCaptcha(input: CaptchaVerifyInput): Promise<SecurityResult> {
  const captchaId = (input.captchaId || '').trim();
  const captchaAnswer = (input.captchaAnswer || '').trim().toUpperCase();

  if (!captchaId || !captchaAnswer) {
    return { ok: false, message: '请输入图形验证码。' };
  }

  let ticket: CaptchaTicketRecord | undefined;
  let ticketSource: 'db' | 'memory' = 'db';

  try {
    const rows = await db.select().from(captchaTickets).where(eq(captchaTickets.id, captchaId)).limit(1);
    if (rows[0]) {
      ticket = {
        id: rows[0].id,
        answer: rows[0].answer,
        issuedIp: rows[0].issuedIp,
        issuedDevice: rows[0].issuedDevice,
        attempts: rows[0].attempts,
        expiresAt: rows[0].expiresAt,
        createdAt: rows[0].createdAt,
      };
    }
  } catch {
    ticketSource = 'memory';
  }

  if (!ticket) {
    ticket = getMemoryCaptchaTicket(captchaId);
    if (ticket) ticketSource = 'memory';
  }

  if (!ticket) {
    return { ok: false, message: '图形验证码不存在或已失效，请刷新后重试。' };
  }

  const deleteTicket = async () => {
    if (ticketSource === 'memory') {
      deleteMemoryCaptchaTicket(captchaId);
      return;
    }
    try {
      await db.delete(captchaTickets).where(eq(captchaTickets.id, captchaId));
    } catch {
      deleteMemoryCaptchaTicket(captchaId);
    }
  };

  const increaseAttempt = async () => {
    if (ticketSource === 'memory') {
      setMemoryCaptchaTicket({ ...ticket!, attempts: ticket!.attempts + 1 });
      return;
    }
    try {
      await db
        .update(captchaTickets)
        .set({ attempts: ticket!.attempts + 1 })
        .where(eq(captchaTickets.id, captchaId));
    } catch {
      setMemoryCaptchaTicket({ ...ticket!, attempts: ticket!.attempts + 1 });
    }
  };

  if (new Date() > ticket.expiresAt) {
    await deleteTicket();
    return { ok: false, message: '图形验证码已过期，请刷新后重试。' };
  }

  if (ticket.attempts >= CAPTCHA_MAX_ATTEMPTS) {
    await deleteTicket();
    return { ok: false, message: '图形验证码尝试次数过多，请刷新后重试。' };
  }

  const ip = getClientIp(input.request);
  const deviceId = getDeviceId(input.request);
  if (ticket.issuedIp !== ip || ticket.issuedDevice !== deviceId) {
    await deleteTicket();
    return { ok: false, message: '图形验证码校验环境已变化，请刷新后重试。' };
  }

  if (ticket.answer !== captchaAnswer) {
    await increaseAttempt();
    return { ok: false, message: '图形验证码错误。' };
  }

  await deleteTicket();
  return { ok: true };
}
