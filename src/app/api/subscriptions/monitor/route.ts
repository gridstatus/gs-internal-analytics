import { NextResponse } from 'next/server';
import {
  getLimitNotEnforcedSubscriptions,
  getActiveEnterpriseTrials,
  getPastBillingPeriodSubscriptions,
  toSubscriptionListItem,
} from '@/lib/queries';
import { jsonError, withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const [limitNotEnforced, activeTrials, pastBillingPeriod] = await Promise.all([
        getLimitNotEnforcedSubscriptions(),
        getActiveEnterpriseTrials(),
        getPastBillingPeriodSubscriptions(),
      ]);
      return NextResponse.json({
        limitNotEnforced: limitNotEnforced.map((row) => ({
          id: row.id,
          userId: row.user_id,
          username: row.username,
          organizationName: row.organization_name,
        })),
        activeTrials: activeTrials.map((row) => ({
          id: row.id,
          userId: row.user_id,
          username: row.username,
          organizationName: row.organization_name,
          status: row.status,
          pastEndDate: row.past_end_date,
        })),
        pastBillingPeriod: pastBillingPeriod.map(toSubscriptionListItem),
      });
    } catch (error) {
      console.error('Error fetching subscription monitor data:', error);
      return jsonError(error);
    }
  });
}
