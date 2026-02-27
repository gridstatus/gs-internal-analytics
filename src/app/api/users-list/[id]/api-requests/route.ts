import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';
import { getLastApiRequestsForUser } from '@/lib/queries/api-usage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const { id } = await params;
      const rows = await getLastApiRequestsForUser(id);
      return NextResponse.json({
        requests: rows.map((r) => ({
          timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : String(r.timestamp),
          rowsReturned: r.rows_returned,
          dataset: r.dataset,
          clientVersion: r.client_version,
        })),
      });
    } catch (error) {
      console.error('Error fetching user API requests:', error);
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      );
    }
  });
}
