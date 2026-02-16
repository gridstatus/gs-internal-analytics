import { NextResponse } from 'next/server';
import { getSubscriptionsList, getSubscriptionById, toSubscriptionListItem, toSubscriptionDetail } from '@/lib/queries';
import { jsonError, withRequestContext } from '@/lib/api-helpers';
import { assertCanEdit } from '@/lib/auth';
import { getErrorMessage } from '@/lib/db';
import { writeQuery } from '@/lib/write-db';
import { prepareSubscriptionInsert } from '@/lib/subscription-validation';
import { format as formatSql } from 'sql-formatter';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const rows = await getSubscriptionsList();
      const subscriptions = rows.map(toSubscriptionListItem);
      return NextResponse.json({ subscriptions });
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return jsonError(error);
    }
  });
}

export async function POST(request: Request) {
  let editorEmail: string;
  try {
    editorEmail = await assertCanEdit();
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }

  const { searchParams } = new URL(request.url);
  const preview = searchParams.get('preview') === 'true';

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const prepared = await prepareSubscriptionInsert(body);
    if (!prepared.ok) {
      if (prepared.errors) {
        console.error(`[SUBSCRIPTION CREATE VALIDATION FAILED] errors=${JSON.stringify(prepared.errors)} body=${JSON.stringify(body)}`);
      }
      return NextResponse.json(
        { error: prepared.error, ...(prepared.errors && { errors: prepared.errors }) },
        { status: prepared.status }
      );
    }

    if (preview) {
      const interpolated = prepared.sql.replace(/\$(\d+)/g, (_, idx) => {
        const val = prepared.params[Number(idx) - 1];
        if (val == null) return 'NULL';
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'number') return String(val);
        if (typeof val === 'string') return `'${String(val).replace(/'/g, "''")}'`;
        return 'NULL';
      });
      const displaySql = formatSql(interpolated, { language: 'postgresql', tabWidth: 2 });
      return NextResponse.json({ sql: displaySql });
    }

    const rows = await writeQuery<{ id: number }>(prepared.sql, prepared.params);
    const newId = rows[0]?.id;
    if (newId == null) {
      return NextResponse.json({ error: 'Insert did not return id' }, { status: 500 });
    }

    console.error(`[SUBSCRIPTION CREATE] user=${editorEmail} newId=${newId} userId=${prepared.sanitized.userId} organizationId=${prepared.sanitized.organizationId}`);

    const updated = await getSubscriptionById(newId);
    if (updated.length === 0) {
      return NextResponse.json({ error: 'Subscription created but could not be fetched' }, { status: 500 });
    }
    return NextResponse.json({ subscription: toSubscriptionDetail(updated[0]) });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
