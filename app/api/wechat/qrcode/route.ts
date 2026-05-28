import QRCode from 'qrcode';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const data = url.searchParams.get('data') || '';
  if (!data || data.length > 1024 || !data.startsWith('weixin://wxpay/')) {
    return new Response('Invalid QR data', { status: 400 });
  }

  const svg = await QRCode.toString(data, {
    type: 'svg',
    width: 240,
    margin: 1,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
