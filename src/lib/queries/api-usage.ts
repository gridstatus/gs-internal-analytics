import { query } from '../db';
import { loadSql } from './core';

export interface ApiUsageByIpRow {
  ip: string | null;
  distinct_users: string;
  total_rows_returned: string;
  request_count: string;
  user_names: string[];
}

export async function getApiUsageByIp(): Promise<ApiUsageByIpRow[]> {
  const sql = loadSql('api-usage-by-ip.sql', {});
  return query<ApiUsageByIpRow>(sql);
}

export interface ApiUsageByUserRow {
  user: string | null;
  org: string | null;
  usage_id: string;
  plan_id: number | null;
  total_requests: string;
  total_rows_returned: string;
  last_request_time: Date;
  unique_client_versions: (string | null)[];
  unique_datasets: (string | null)[];
  user_id: number | null;
  org_id: string | null;
}

export async function getApiUsageByUser(): Promise<ApiUsageByUserRow[]> {
  const sql = loadSql('api-usage-by-user.sql', {});
  return query<ApiUsageByUserRow>(sql);
}

export interface ApiUsageLookupMetaRow {
  earliest_date: Date | null;
}

export async function getApiUsageLookupMeta(
  idColumn: 'user_id' | 'organization_id',
  id: string
): Promise<Date | null> {
  const raw = loadSql('api-usage-lookup-meta.sql');
  const sql = raw.replace(/\{\{ID_COLUMN\}\}/g, idColumn);
  const rows = await query<ApiUsageLookupMetaRow>(sql, [id]);
  return rows[0]?.earliest_date ?? null;
}

export interface ApiUsageLookupSegmentRow {
  request_count: string;
  total_rows: string;
  distinct_users: string;
  user_ids: number[] | null;
}

export async function getApiUsageLookupSegment(
  idColumn: 'user_id' | 'organization_id',
  id: string,
  start: string,
  end: string
): Promise<{ requestCount: number; totalRows: number; distinctUsers: number; userIds: number[] }> {
  const raw = loadSql('api-usage-lookup-segment.sql');
  const sql = raw.replace(/\{\{ID_COLUMN\}\}/g, idColumn);
  const rows = await query<ApiUsageLookupSegmentRow>(sql, [id, start, end]);
  const row = rows[0];
  return {
    requestCount: Number(row?.request_count ?? 0),
    totalRows: Number(row?.total_rows ?? 0),
    distinctUsers: Number(row?.distinct_users ?? 0),
    userIds: row?.user_ids ?? [],
  };
}
