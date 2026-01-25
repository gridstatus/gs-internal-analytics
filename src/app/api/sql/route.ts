import { NextResponse } from 'next/server';
import { query, getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const { sql } = await request.json();

    if (!sql) {
      return NextResponse.json({ error: 'SQL query required' }, { status: 400 });
    }

    const result = await query(sql);
    return NextResponse.json({ rows: result, count: result.length });
  } catch (error) {
      console.error('SQL error:', error);
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      );
    }
  });
}
