import { NextResponse } from 'next/server';
import { getSubscriptionsList, toSubscriptionListItem } from '@/lib/queries';
import { jsonError, withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const rows = await getSubscriptionsList();
      const subscriptions = rows.map(toSubscriptionListItem);
      return NextResponse.json({ subscriptions });
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return jsonError(error);
    }
  });
}
