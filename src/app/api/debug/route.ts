import { NextResponse } from 'next/server';
import { getMonthlyUserCounts } from '@/lib/queries';
import { withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
    const result = await getMonthlyUserCounts();
    // Return last 5 months
    return NextResponse.json(result.slice(-5));
  } catch (error) {
      console.error('Debug error:', error);
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }
  });
}
