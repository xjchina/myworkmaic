import { createHmac, createHash } from 'node:crypto';

const SERVICE = 'sms';
const ACTION = 'SendSms';
const VERSION = '2021-01-11';
const ALGORITHM = 'TC3-HMAC-SHA256';

type TencentSmsConfig = {
  secretId: string;
  secretKey: string;
  appId: string;
  signName: string;
  templateId: string;
  region: string;
  endpoint: string;
};

type SendSmsInput = {
  phone: string;
  code: string;
  validMinutes: number;
};

type SendSmsResult = {
  success: boolean;
  message: string;
  requestId?: string;
};

function sha256(message: string): string {
  return createHash('sha256').update(message).digest('hex');
}

function hmacSha256(message: string, key: string | Buffer): Buffer {
  return createHmac('sha256', key).update(message).digest();
}

function readConfig(): TencentSmsConfig | null {
  const secretId = process.env.TENCENT_SMS_SECRET_ID?.trim() || '';
  const secretKey = process.env.TENCENT_SMS_SECRET_KEY?.trim() || '';
  const appId = process.env.TENCENT_SMS_SDK_APP_ID?.trim() || '';
  const signName = process.env.TENCENT_SMS_SIGN_NAME?.trim() || '';
  const templateId = process.env.TENCENT_SMS_TEMPLATE_ID?.trim() || '';
  const region = process.env.TENCENT_SMS_REGION?.trim() || 'ap-guangzhou';
  const endpoint = process.env.TENCENT_SMS_ENDPOINT?.trim() || 'sms.tencentcloudapi.com';

  if (!secretId || !secretKey || !appId || !signName || !templateId) {
    return null;
  }

  return {
    secretId,
    secretKey,
    appId,
    signName,
    templateId,
    region,
    endpoint,
  };
}

export function isTencentSmsEnabled(): boolean {
  return readConfig() !== null;
}

export async function sendTencentSmsCode(input: SendSmsInput): Promise<SendSmsResult> {
  const config = readConfig();
  if (!config) {
    return {
      success: false,
      message: 'Tencent SMS is not configured.',
    };
  }

  const payload = JSON.stringify({
    SmsSdkAppId: config.appId,
    SignName: config.signName,
    TemplateId: config.templateId,
    TemplateParamSet: [input.code, String(input.validMinutes)],
    PhoneNumberSet: [`+86${input.phone}`],
    SessionContext: 'openmaic-otp',
  });

  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const credentialScope = `${date}/${SERVICE}/tc3_request`;

  const canonicalHeaders =
    `content-type:application/json; charset=utf-8\n` +
    `host:${config.endpoint}\n` +
    `x-tc-action:${ACTION.toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';
  const canonicalRequest = [
    'POST',
    '/',
    '',
    canonicalHeaders,
    signedHeaders,
    sha256(payload),
  ].join('\n');

  const stringToSign = [
    ALGORITHM,
    String(timestamp),
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');

  const secretDate = hmacSha256(date, `TC3${config.secretKey}`);
  const secretService = hmacSha256(SERVICE, secretDate);
  const secretSigning = hmacSha256('tc3_request', secretService);
  const signature = createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

  const authorization =
    `${ALGORITHM} ` +
    `Credential=${config.secretId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;

  const response = await fetch(`https://${config.endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json; charset=utf-8',
      Host: config.endpoint,
      'X-TC-Action': ACTION,
      'X-TC-Version': VERSION,
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Region': config.region,
    },
    body: payload,
  });

  const data = (await response.json()) as {
    Response?: {
      Error?: { Code?: string; Message?: string };
      RequestId?: string;
      SendStatusSet?: Array<{ Code?: string; Message?: string }>;
    };
  };

  if (!response.ok) {
    const serverMessage = data?.Response?.Error?.Message || `HTTP ${response.status}`;
    return {
      success: false,
      message: `Tencent SMS request failed: ${serverMessage}`,
      requestId: data?.Response?.RequestId,
    };
  }

  const status = data?.Response?.SendStatusSet?.[0];
  if (status?.Code !== 'Ok') {
    return {
      success: false,
      message: status?.Message || 'Tencent SMS send failed',
      requestId: data?.Response?.RequestId,
    };
  }

  return {
    success: true,
    message: 'SMS sent successfully.',
    requestId: data?.Response?.RequestId,
  };
}

