import { NextResponse } from 'next/server';
import { getMonthlyApiUsage } from '@/lib/queries';
import { getErrorMessage } from '@/lib/db';

function formatMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterGridstatus = searchParams.get('filterGridstatus') !== 'false';

    const apiUsage = await getMonthlyApiUsage(filterGridstatus);

    const monthlyData = apiUsage.map((row, index) => {
      const prevRow = index > 0 ? apiUsage[index - 1] : null;

      const requests = Number(row.total_api_requests);
      const prevRequests = prevRow ? Number(prevRow.total_api_requests) : 0;
      const requestsMomChange = prevRequests > 0
        ? Math.round(((requests - prevRequests) / prevRequests) * 100)
        : 0;

      const rows = Number(row.total_api_rows_returned);
      const prevRows = prevRow ? Number(prevRow.total_api_rows_returned) : 0;
      const rowsMomChange = prevRows > 0
        ? Math.round(((rows - prevRows) / prevRows) * 100)
        : 0;

      const users = Number(row.unique_api_users);
      const prevUsers = prevRow ? Number(prevRow.unique_api_users) : 0;
      const usersMomChange = prevUsers > 0
        ? Math.round(((users - prevUsers) / prevUsers) * 100)
        : 0;

      return {
        month: formatMonth(new Date(row.month)),
        totalApiRequests: requests,
        totalApiRowsReturned: rows,
        uniqueApiUsers: users,
        requestsMomChange,
        rowsMomChange,
        usersMomChange,
      };
    });

    return NextResponse.json({ monthlyData });
  } catch (error) {
    console.error('Error fetching API usage:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
