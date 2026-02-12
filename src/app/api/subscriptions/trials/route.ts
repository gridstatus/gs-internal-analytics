import { NextResponse } from 'next/server';
import { getTrialsSelfService, getActiveEnterpriseTrials, toSubscriptionListItem } from '@/lib/queries';
import { jsonError, withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const [selfService, enterprise] = await Promise.all([
        getTrialsSelfService(),
        getActiveEnterpriseTrials(),
      ]);
      return NextResponse.json({
        selfService: selfService.map(toSubscriptionListItem),
        enterprise: enterprise.map((row) => ({
          id: row.id,
          userId: row.user_id,
          username: row.username,
          organizationName: row.organization_name,
          status: row.status,
          pastEndDate: row.past_end_date,
        })),
      });
    } catch (error) {
      console.error('Error fetching trials:', error);
      return jsonError(error);
    }
  });
}
