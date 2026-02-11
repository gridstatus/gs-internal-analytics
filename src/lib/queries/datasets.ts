import { query } from '../db';
import { loadSql } from './core';

export interface MonthlyApiUsage {
  month: Date;
  total_api_requests: number;
  total_api_rows_returned: number;
  unique_api_users: number;
}

export async function getMonthlyApiUsage(): Promise<MonthlyApiUsage[]> {
  const sql = loadSql('monthly-api-usage.sql', {});
  return query<MonthlyApiUsage>(sql);
}

export interface DatasetUserLast24h {
  user_id: number;
  username: string | null;
  num_requests: string;
  last_query_at: Date;
  avg_seconds_between: string | null;
}

export async function getDatasetUsersLast24h(datasetId: string, days: number): Promise<DatasetUserLast24h[]> {
  const sql = loadSql('dataset-users-last-24h.sql', {});
  return query<DatasetUserLast24h>(sql, [datasetId, days]);
}

export interface DatasetUsage24hRow {
  dataset_id: string;
  num_unique_users: string;
  last_query_at: Date;
}

export async function getDatasetUsage24h(): Promise<DatasetUsage24hRow[]> {
  const sql = loadSql('last-24h-dataset-unique-users.sql', {});
  return query<DatasetUsage24hRow>(sql);
}
