import { NextResponse } from 'next/server';
import { issueCaptcha } from '@/lib/server/auth-security';

async function handleCaptcha(request: Request) {
  try {
    const captcha = await issueCaptcha(request);
    return NextResponse.json({
      success: true,
      captchaId: captcha.captchaId,
      imageDataUrl: captcha.imageDataUrl,
      expiresInSeconds: captcha.expiresInSeconds,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        errorCode: 'INTERNAL_ERROR',
        error: `生成图形验证码失败：${error instanceof Error ? error.message : '未知错误'}`,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleCaptcha(request);
}

export async function POST(request: Request) {
  return handleCaptcha(request);
}
