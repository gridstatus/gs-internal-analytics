import { NextResponse } from 'next/server';
import { getPlansList } from '@/lib/queries';
import { jsonError, withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const rows = await getPlansList();
      const plans = rows.map((row) => ({
        id: row.id,
        planName: row.plan_name,
      }));
      return NextResponse.json({ plans });
    } catch (error) {
      console.error('Error fetching plans:', error);
      return jsonError(error);
    }
  });
}
