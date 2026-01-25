import { NextResponse } from 'next/server';
import { getTopRegistrations } from '@/lib/queries';
import { getErrorMessage } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterGridstatus = searchParams.get('filterGridstatus') !== 'false';
    
    const data = await getTopRegistrations(filterGridstatus);

    // Format the data
    const formatted = data.map((row) => ({
      period: row.period.toISOString(),
      periodType: row.period_type,
      registrationCount: Number(row.registration_count),
    }));

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error('Error fetching top registrations:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

