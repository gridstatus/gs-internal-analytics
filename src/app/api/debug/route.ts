import { NextResponse } from 'next/server';
import { getMonthlyUserCounts } from '@/lib/queries';

export async function GET() {
  try {
    const result = await getMonthlyUserCounts();
    // Return last 5 months
    return NextResponse.json(result.slice(-5));
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
