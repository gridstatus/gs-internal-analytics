import { NextResponse } from 'next/server';

const GRIDSTATUS_DATASETS_URL = 'https://api.gridstatus.io/v1/datasets';

interface GridStatusDataset {
  id: string;
  name: string;
  source: string;
  earliest_available_time_utc: string | null;
}

interface GridStatusResponse {
  status_code: number;
  data: GridStatusDataset[];
}

export async function GET() {
  const apiKey = process.env.GRIDSTATUS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GRIDSTATUS_API_KEY is not configured' },
      { status: 500 }
    );
  }

  try {
    const url = `${GRIDSTATUS_DATASETS_URL}?api_key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Grid Status API error: ${res.status} ${text.slice(0, 200)}` },
        { status: 502 }
      );
    }
    const body = (await res.json()) as GridStatusResponse;
    const data = (body.data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      source: d.source ?? '',
      earliestAvailableTimeUtc: d.earliest_available_time_utc ?? null,
    }));
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch datasets' },
      { status: 502 }
    );
  }
}
