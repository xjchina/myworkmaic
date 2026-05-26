import { apiError, apiSuccess } from '@/lib/server/api-response';
import { listBroadcastAnnouncements } from '@/lib/server/messages';
import { requireOpsAdmin } from '@/lib/server/ops-auth';

function parseLimit(value: string | null): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 20;
  return Math.min(100, Math.floor(n));
}

export async function GET(request: Request) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return apiError('INVALID_REQUEST', auth.status, auth.error);

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get('limit'));
  const items = await listBroadcastAnnouncements(limit);
  return apiSuccess({ items });
}
