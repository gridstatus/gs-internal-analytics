import { NextResponse } from 'next/server';
import { getMostEngagedUsers } from '@/lib/queries';
import { getErrorMessage } from '@/lib/db';
import { withRequestContext, getFilterInternal, getFilterFree } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const filterInternal = getFilterInternal(searchParams);
      const filterFree = getFilterFree(searchParams);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : null;
    const users = await getMostEngagedUsers(filterInternal, filterFree, days);
    return NextResponse.json({ users });
  } catch (error) {
      console.error('Error fetching most engaged users:', error);
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      );
    }
  });
}

