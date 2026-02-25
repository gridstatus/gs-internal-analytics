import { NextResponse } from 'next/server';
import {
  getApiUsageLookupMeta,
  getApiUsageLookupSegment,
} from '@/lib/queries/api-usage';
import { jsonError, withRequestContext } from '@/lib/api-helpers';

const ID_TYPES = ['user', 'organization'] as const;
type IdType = (typeof ID_TYPES)[number];

function idColumn(idType: IdType): 'user_id' | 'organization_id' {
  return idType === 'user' ? 'user_id' : 'organization_id';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const idTypeParam = searchParams.get('idType');
      const id = searchParams.get('id')?.trim();
      if (!idTypeParam || !ID_TYPES.includes(idTypeParam as IdType)) {
        return NextResponse.json(
          { error: 'idType must be "user" or "organization"' },
          { status: 400 }
        );
      }
      if (!id) {
        return NextResponse.json(
          { error: 'id is required' },
          { status: 400 }
        );
      }
      const idType = idTypeParam as IdType;
      const column = idColumn(idType);

      const mode = searchParams.get('mode');
      if (mode === 'meta') {
        const earliestDate = await getApiUsageLookupMeta(column, id);
        return NextResponse.json({
          earliestDate: earliestDate ? earliestDate.toISOString() : null,
        });
      }

      const start = searchParams.get('start');
      const end = searchParams.get('end');
      if (!start || !end) {
        return NextResponse.json(
          { error: 'start and end are required for segment query' },
          { status: 400 }
        );
      }
      const result = await getApiUsageLookupSegment(column, id, start, end);
      return NextResponse.json(result);
    } catch (error) {
      console.error('Error in API usage lookup:', error);
      return jsonError(error);
    }
  });
}
