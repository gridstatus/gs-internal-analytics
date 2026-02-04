import { NextResponse } from 'next/server';
import { getSubscriptionById } from '@/lib/queries';
import { getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';

function toDetail(row: Awaited<ReturnType<typeof getSubscriptionById>>[0]) {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    planId: row.plan_id,
    planName: row.plan_name,
    startDate: row.start_date instanceof Date ? row.start_date.toISOString() : String(row.start_date),
    status: row.status,
    cancelAtPeriodEnd: row.cancel_at_period_end,
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
    enforceApiUsageLimit: row.enforce_api_usage_limit,
    apiRowsReturnedLimitOverride: row.api_rows_returned_limit_override,
    apiRequestsLimitOverride: row.api_requests_limit_override,
    apiRowsPerResponseLimitOverride: row.api_rows_per_response_limit_override,
    alertsLimitOverride: row.alerts_limit_override,
    dashboardsLimitOverride: row.dashboards_limit_override,
    downloadsLimitOverride: row.downloads_limit_override,
    entitlementOverrides: row.entitlement_overrides,
    perSecondApiRateLimitOverride: row.per_second_api_rate_limit_override,
    perMinuteApiRateLimitOverride: row.per_minute_api_rate_limit_override,
    perHourApiRateLimitOverride: row.per_hour_api_rate_limit_override,
    chartsLimitOverride: row.charts_limit_override,
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
      const subscriptionId = parseInt(id, 10);
      if (Number.isNaN(subscriptionId)) {
        return NextResponse.json({ error: 'Invalid subscription id' }, { status: 400 });
      }

      const rows = await getSubscriptionById(subscriptionId);
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }

      const subscription = toDetail(rows[0]);
      return NextResponse.json({ subscription });
    } catch (error) {
      console.error('Error fetching subscription detail:', error);
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      );
    }
  });
}
