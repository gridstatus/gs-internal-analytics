import { NextResponse } from 'next/server';
import { getSubscriptionsList } from '@/lib/queries';
import { jsonError, withRequestContext } from '@/lib/api-helpers';

function toItem(row: Awaited<ReturnType<typeof getSubscriptionsList>>[0]) {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    planId: row.plan_id,
    planName: row.plan_name,
    startDate: row.start_date instanceof Date ? row.start_date.toISOString() : String(row.start_date),
    status: row.status,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    stripeSubscriptionId: row.stripe_subscription_id,
    currentBillingPeriodStart:
      row.current_billing_period_start instanceof Date
        ? row.current_billing_period_start.toISOString()
        : String(row.current_billing_period_start),
    currentBillingPeriodEnd:
      row.current_billing_period_end instanceof Date
        ? row.current_billing_period_end.toISOString()
        : row.current_billing_period_end != null
          ? String(row.current_billing_period_end)
          : null,
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at != null ? String(row.created_at) : null,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const rows = await getSubscriptionsList();
      const subscriptions = rows.map(toItem);
      return NextResponse.json({ subscriptions });
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return jsonError(error);
    }
  });
}
