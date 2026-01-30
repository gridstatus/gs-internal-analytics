import { NextResponse } from 'next/server';

/**
 * Public keep-alive endpoint. Used by external cron services (e.g. cron-job.org)
 * to keep the free Render instance awake. Render's free tier spins down after 15 minutes of inactivity.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}

