import { NextResponse } from 'next/server';
import { jsonError, withRequestContext } from '@/lib/api-helpers';
import { getSubscriptionChurn } from '@/lib/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const data = await getSubscriptionChurn();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error in subscription-churn API:', error);
      return jsonError(error, 500);
    }
  });
}

