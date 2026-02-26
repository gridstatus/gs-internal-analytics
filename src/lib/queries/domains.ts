import { query } from '../db';
import { loadSql } from './core';

export interface MonthlyCorpMetric {
  month: Date;
  corp_domains: number;
  teams: number;
  users_on_teams: number;
}

export interface DomainDistribution {
  users_bucket: number;
  domain_count: number;
}

export interface DomainSummary {
  total_corp_domains: number;
  teams_count: number;
  users_on_teams: number;
}

export async function getMonthlyCorpMetrics(): Promise<MonthlyCorpMetric[]> {
  const sql = loadSql('monthly-corp-metrics.sql', {});
  return query<MonthlyCorpMetric>(sql);
}

export async function getDomainDistribution(): Promise<DomainDistribution[]> {
  const sql = loadSql('domain-distribution.sql', {});
  return query<DomainDistribution>(sql);
}

export async function getDomainSummary(): Promise<DomainSummary[]> {
  const sql = loadSql('domain-summary.sql', {});
  return query<DomainSummary>(sql);
}

export interface TotalUsersByDomainRow {
  domain: string;
  total_users: string;
}

export async function getTotalUsersByDomain(): Promise<TotalUsersByDomainRow[]> {
  const sql = loadSql('domain-total-users.sql', {});
  return query<TotalUsersByDomainRow>(sql);
}
