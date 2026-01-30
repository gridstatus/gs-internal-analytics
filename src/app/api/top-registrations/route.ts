import { NextResponse } from 'next/server';
import { getTopRegistrations } from '@/lib/queries';
import { jsonError, withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
    const data = await getTopRegistrations();

    // Format the data
    const formatted = data.map((row) => ({
      period: row.period.toISOString(),
      periodType: row.period_type,
      registrationCount: Number(row.registration_count),
    }));

    return NextResponse.json({ data: formatted });
  } catch (error) {
      console.error('Error fetching top registrations:', error);
      return jsonError(error);
    }
  });
}

