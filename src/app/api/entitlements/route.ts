import { NextResponse } from 'next/server';
import { getDistinctEntitlements } from '@/lib/queries';
import { jsonError } from '@/lib/api-helpers';

export async function GET() {
  try {
    const rows = await getDistinctEntitlements();
    const entitlements = rows.map((r) => r.entitlement);
    return NextResponse.json({ entitlements });
  } catch (error) {
    console.error('Error fetching entitlements:', error);
    return jsonError(error);
  }
}
