'use client';

export interface TrackUsagePayload {
  feature: string;
  action?: string;
  subject?: string;
  durationSeconds?: number;
}

export async function trackUsage(payload: TrackUsagePayload): Promise<void> {
  try {
    await fetch('/api/usage/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature: payload.feature,
        action: payload.action,
        subject: payload.subject,
        duration_seconds: payload.durationSeconds,
      }),
      keepalive: true,
    });
  } catch {
    // Non-blocking telemetry: ignore errors.
  }
}

