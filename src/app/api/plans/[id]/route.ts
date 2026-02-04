import { NextResponse } from 'next/server';
import { getPlanById, getSubscriptionsByPlanId } from '@/lib/queries';
import { getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';

function mapPlanToDetail(row: Awaited<ReturnType<typeof getPlanById>>[0]) {
  return {
    id: row.id,
    planName: row.plan_name,
    apiRowsReturnedLimit: row.api_rows_returned_limit,
    apiRequestsLimit: row.api_requests_limit,
    apiRowsPerResponseLimit: row.api_rows_per_response_limit,
    alertsLimit: row.alerts_limit,
    dashboardsLimit: row.dashboards_limit,
    downloadsLimit: row.downloads_limit,
    entitlements: row.entitlements,
    perSecondApiRateLimit: row.per_second_api_rate_limit,
    perMinuteApiRateLimit: row.per_minute_api_rate_limit,
    perHourApiRateLimit: row.per_hour_api_rate_limit,
    chartsLimit: row.charts_limit,
  };
}

function mapSubscriptionToListItem(row: Awaited<ReturnType<typeof getSubscriptionsByPlanId>>[0]) {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    planId: row.plan_id,
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const { id } = await params;
      const planId = parseInt(id, 10);
      if (Number.isNaN(planId)) {
        return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 });
      }

      const [planRows, subscriptionRows] = await Promise.all([
        getPlanById(planId),
        getSubscriptionsByPlanId(planId),
      ]);

      if (planRows.length === 0) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }

      const plan = mapPlanToDetail(planRows[0]);
      const subscriptions = subscriptionRows.map(mapSubscriptionToListItem);

      return NextResponse.json({ plan, subscriptions });
    } catch (error) {
      console.error('Error fetching plan detail:', error);
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      );
    }
  });
}
