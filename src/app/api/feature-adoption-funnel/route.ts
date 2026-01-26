import { NextResponse } from 'next/server';
import { jsonError, withRequestContext } from '@/lib/api-helpers';
import { getFeatureAdoptionFunnel } from '@/lib/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const filterGridstatus = searchParams.get('filterGridstatus') !== 'false';
      const data = await getFeatureAdoptionFunnel(filterGridstatus);

      if (data.length === 0) {
        return NextResponse.json({
          total_users: 0,
          dashboard_users: 0,
          chart_users: 0,
          alert_users: 0,
          download_users: 0,
          api_key_users: 0,
          multi_feature_users: 0,
        });
      }

      return NextResponse.json(data[0]);
    } catch (error) {
      console.error('Error in feature-adoption-funnel API:', error);
      return jsonError(error, 500);
    }
  });
}

