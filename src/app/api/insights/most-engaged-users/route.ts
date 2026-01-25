import { NextResponse } from 'next/server';
import { getMostEngagedUsers } from '@/lib/queries';
import { getErrorMessage } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterGridstatus = searchParams.get('filterGridstatus') !== 'false';
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : null;
    const users = await getMostEngagedUsers(filterGridstatus, days);
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching most engaged users:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

