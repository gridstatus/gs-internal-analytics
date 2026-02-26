'use client';

import { useState } from 'react';
import {
  Skeleton,
  Stack,
  Paper,
  Text,
  Group,
  TextInput,
  Anchor,
  SimpleGrid,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import Link from 'next/link';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { AppContainer } from '@/components/AppContainer';
import { DataTable, Column } from './DataTable';
import { PageBreadcrumbs } from './PageBreadcrumbs';
import { MetricCard } from './MetricCard';
import { ErrorDisplay } from './ErrorDisplay';
import type { TrendingDomainsResponse, TrendingDomainRow } from '@/app/api/posthog/domains/trending/route';

export function TrendingDomainsView() {
  const [search, setSearch] = useState('');

  const url = useApiUrl('/api/posthog/domains/trending', {});
  const { data, loading, error } = useApiData<TrendingDomainsResponse>(url, [url]);

  const filteredData =
    data?.domains.filter((row) => row.domain.toLowerCase().includes(search.toLowerCase())) ?? [];

  const domains = data?.domains ?? [];
  const topTrendingByPercent = [...domains]
    .filter((d) => d.percentTrend != null)
    .sort((a, b) => (b.percentTrend ?? 0) - (a.percentTrend ?? 0))[0];
  const biggestGainerAbsolute = [...domains].sort((a, b) => b.absoluteTrend - a.absoluteTrend)[0];

  const columns: Column<TrendingDomainRow>[] = [
    {
      id: 'domain',
      header: 'Domain',
      align: 'left',
      render: (row) => (
        <Anchor component={Link} href={`/domains/${encodeURIComponent(row.domain)}`}>
          {row.domain}
        </Anchor>
      ),
      sortValue: (row) => row.domain.toLowerCase(),
    },
    {
      id: 'totalRegistered',
      header: 'Registered',
      align: 'right',
      render: (row) => row.totalRegistered.toLocaleString(),
      sortValue: (row) => row.totalRegistered,
    },
    {
      id: 'last30',
      header: 'Last 30 days',
      align: 'right',
      render: (row) => row.last30.toLocaleString(),
      sortValue: (row) => row.last30,
    },
    {
      id: 'prev30',
      header: '30-60 days ago',
      align: 'right',
      render: (row) => row.prev30.toLocaleString(),
      sortValue: (row) => row.prev30,
    },
    {
      id: 'percentTrend',
      header: 'Trend %',
      align: 'right',
      render: (row) => {
        if (row.percentTrend == null) return <Text c="dimmed">New</Text>;
        const isPositive = row.percentTrend > 0;
        const isNegative = row.percentTrend < 0;
        return (
          <Text c={isPositive ? 'green' : isNegative ? 'red' : undefined}>
            {row.percentTrend > 0 ? '+' : ''}
            {row.percentTrend.toLocaleString(undefined, { maximumFractionDigits: 1 })}%
          </Text>
        );
      },
      sortValue: (row) => row.percentTrend,
    },
    {
      id: 'absoluteTrend',
      header: 'Trend (abs)',
      align: 'right',
      render: (row) => {
        const isPositive = row.absoluteTrend > 0;
        const isNegative = row.absoluteTrend < 0;
        return (
          <Text c={isPositive ? 'green' : isNegative ? 'red' : undefined}>
            {row.absoluteTrend > 0 ? '+' : ''}
            {row.absoluteTrend.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </Text>
        );
      },
      sortValue: (row) => row.absoluteTrend,
    },
  ];

  return (
    <AppContainer>
      <PageBreadcrumbs
        items={[
          { label: 'Domains', href: '/domains' },
          { label: 'Trending Domains' },
        ]}
      />

      {loading ? (
        <Stack gap="md">
          <Skeleton height={80} />
          <Skeleton height={400} />
        </Stack>
      ) : error ? (
        <ErrorDisplay title="Error loading data" error={error} />
      ) : data ? (
        <>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
            <MetricCard
              title="Domains tracked"
              value={data.domains.length}
            />
            <MetricCard
              title="Top trending (by %)"
              value={topTrendingByPercent?.domain ?? '—'}
              subtitle={
                topTrendingByPercent != null && topTrendingByPercent.percentTrend != null
                  ? `+${topTrendingByPercent.percentTrend.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
                  : undefined
              }
            />
            <MetricCard
              title="Biggest gainer (absolute)"
              value={biggestGainerAbsolute?.domain ?? '—'}
              subtitle={
                biggestGainerAbsolute && biggestGainerAbsolute.absoluteTrend > 0
                  ? `+${biggestGainerAbsolute.absoluteTrend.toLocaleString(undefined, { maximumFractionDigits: 1 })} users`
                  : undefined
              }
            />
          </SimpleGrid>

          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600} size="lg">
                Trending domains
              </Text>
              <TextInput
                placeholder="Search domains..."
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                style={{ width: 250 }}
              />
            </Group>
            <DataTable
              data={filteredData}
              columns={columns}
              keyField="domain"
              defaultSort={{ column: 'last30', direction: 'desc' }}
            />
            <Text size="xs" c="dimmed" mt="md">
              Free email domains excluded.
            </Text>
          </Paper>
        </>
      ) : null}
    </AppContainer>
  );
}
