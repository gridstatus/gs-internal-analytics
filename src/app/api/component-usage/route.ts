import { NextResponse } from 'next/server';
import { getComponentUsage } from '@/lib/queries';
import { jsonError, withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const data = await getComponentUsage();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error fetching component usage:', error);
      return jsonError(error);
    }
  });
}
