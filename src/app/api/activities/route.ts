import { NextResponse } from 'next/server';
import { getUserActivities, getNewUsersLast3Months } from '@/lib/queries';
import { getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';

function formatMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const [activities, newUsers] = await Promise.all([
      getUserActivities(),
      getNewUsersLast3Months(),
    ]);

    return NextResponse.json({
      activities: activities.map(a => ({
        userId: a.user_id,
        username: a.username,
        activityDate: a.activity_date,
        activityType: a.activity_type,
        activityDetail: a.activity_detail,
      })),
      newUsersSummary: newUsers.map(n => ({
        month: formatMonth(new Date(n.month)),
        newUsers: Number(n.new_users),
      })),
    });
  } catch (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      );
    }
  });
}

