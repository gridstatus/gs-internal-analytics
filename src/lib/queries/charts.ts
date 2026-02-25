import { query } from '../db';
import { loadSql } from './core';
import type { ComponentUsageRow } from '../api-types';

interface ComponentUsageDbRow {
  component_type: string;
  charts_total_count: string;
  charts_unique_users: string;
  charts_users: { id: number; username: string }[] | string;
  dashboards_total_count: string;
  dashboards_unique_users: string;
  dashboards_users: { id: number; username: string }[] | string;
}

function parseUsers(
  val: { id: number; username: string }[] | string
): { id: number; username: string }[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val) as { id: number; username: string }[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function getComponentUsage(): Promise<ComponentUsageRow[]> {
  const rows = await query<ComponentUsageDbRow>(loadSql('component-usage.sql', {}));
  return rows.map((row) => ({
    componentType: row.component_type,
    chartsTotalCount: Number(row.charts_total_count),
    chartsUniqueUsers: Number(row.charts_unique_users),
    chartsUsers: parseUsers(row.charts_users),
    dashboardsTotalCount: Number(row.dashboards_total_count),
    dashboardsUniqueUsers: Number(row.dashboards_unique_users),
    dashboardsUsers: parseUsers(row.dashboards_users),
  }));
}
