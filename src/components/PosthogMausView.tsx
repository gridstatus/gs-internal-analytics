'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Container,
  Title,
  SimpleGrid,
  Group,
  Skeleton,
  Alert,
  Stack,
  Paper,
  Text,
  Tooltip,
  SegmentedControl,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { MetricCard } from './MetricCard';
import { TimeSeriesChart } from './TimeSeriesChart';
import { ExportButton } from './ExportButton';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { PosthogActiveUsersResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { useFilter } from '@/contexts/FilterContext';
import { DataTable, Column } from './DataTable';


export function PosthogMausView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>(
    (searchParams.get('period') as 'day' | 'week' | 'month') || 'month'
  );
  // DOM ref for chart export - ExportButton uses html-to-image to capture this element as PNG
  const activeUsersChartRef = useRef<HTMLDivElement>(null);

  const chartRefs = [
    { name: 'posthog_active_users', ref: activeUsersChartRef },
  ];

  // Update URL when period changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (period !== 'month') {
      params.set('period', period);
    } else {
      params.delete('period');
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [period, pathname, router, searchParams]);

  const { filterGridstatus, timezone } = useFilter();
  const url = useApiUrl('/api/posthog-maus', { period, filterGridstatus, timezone });
  const { data, loading, error } = useApiData<PosthogActiveUsersResponse>(url, [period, filterGridstatus, timezone]);

  if (loading) {
    return (
      <Container fluid py="xl">
        <Stack gap="md">
          <Skeleton height={50} width={300} />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} height={100} />
            ))}
          </SimpleGrid>
          <Skeleton height={350} />
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error loading data"
          color="red"
        >
          {error}
        </Alert>
      </Container>
    );
  }

  if (!data || data.periodData.length === 0) {
    return (
      <Container fluid py="xl">
        <Alert title="No data" color="yellow">
          No PostHog Active Users data available. Check your PostHog credentials.
        </Alert>
      </Container>
    );
  }

  const latestMetric = data.periodData[data.periodData.length - 1];
  const previousMetric =
    data.periodData.length > 1
      ? data.periodData[data.periodData.length - 2]
      : null;

  const calculateTrend = (current: number, previous: number | undefined) => {
    if (previous === undefined || previous === 0) return undefined;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Get recent periods for the table (last 30 for daily, last 12 for weekly, last 12 for monthly)
  const tableLimit = period === 'day' ? 30 : 12;
  const recentPeriods = data.periodData.slice(-tableLimit).reverse();

  const formatPeriod = (periodStr: string) => {
    if (period === 'day') {
      const date = new Date(periodStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } else if (period === 'week') {
      const date = new Date(periodStr);
      const weekEnd = new Date(date);
      weekEnd.setUTCDate(date.getUTCDate() + 6);
      return `${date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} - ${weekEnd.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    } else {
      const date = new Date(periodStr + '-01');
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
    }
  };

  const periodLabel = period === 'day' ? 'Daily' : period === 'week' ? 'Weekly' : 'Monthly';
  const changeLabel = period === 'day' ? 'DoD' : period === 'week' ? 'WoW' : 'MoM';

  return (
    <Container fluid py="xl">
      <Group justify="space-between" mb="xl" wrap="wrap">
        <div>
          <Title order={1}>PostHog Active Users</Title>
          <Text size="xs" c="dimmed" mt={4}>
            Filtered to users with email addresses (typically logged-in users)
          </Text>
        </div>
        <Group>
          <SegmentedControl
            value={period}
            onChange={(value) => setPeriod(value as 'day' | 'week' | 'month')}
            data={[
              { label: 'Daily', value: 'day' },
              { label: 'Weekly', value: 'week' },
              { label: 'Monthly', value: 'month' },
            ]}
          />
          <ExportButton charts={chartRefs} />
        </Group>
      </Group>

      {/* Summary Metrics */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="xl">
        <MetricCard
          title={`Current ${periodLabel} Active Users`}
          value={latestMetric.activeUsers}
          subtitle="Users with email addresses (typically logged-in)"
          trend={calculateTrend(
            latestMetric.activeUsers,
            previousMetric?.activeUsers
          )}
          trendLabel={changeLabel}
        />
        <MetricCard
          title="Period"
          value={formatPeriod(latestMetric.period)}
          subtitle="Latest data"
        />
      </SimpleGrid>

      {/* Chart */}
      <TimeSeriesChart
        ref={activeUsersChartRef}
        title={`${periodLabel} Active Users`}
        subtitle={`Users with email addresses (typically logged-in) with activity each ${period === 'day' ? 'day' : period === 'week' ? 'week' : 'month'} (from PostHog)`}
        data={data.periodData.map(d => ({
          month: d.period,
          activeUsers: d.activeUsers,
        }))}
        dataKey="activeUsers"
        color="teal.6"
        height={400}
        chartType="bar"
      />

      {/* Data Table */}
      <Paper shadow="sm" p="md" radius="md" withBorder mt="xl">
        <Text fw={600} size="lg" mb="md">
          Recent {periodLabel} Periods
        </Text>
        <DataTable
          data={recentPeriods}
          columns={[
            {
              id: 'period',
              header: periodLabel === 'Daily' ? 'Day' : periodLabel === 'Weekly' ? 'Week' : 'Month',
              align: 'left',
              render: (row) => formatPeriod(row.period),
              sortValue: (row) => row.period,
            },
            {
              id: 'activeUsers',
              header: 'Active Users',
              align: 'right',
              render: (row) => row.activeUsers.toLocaleString(),
              sortValue: (row) => row.activeUsers,
            },
            {
              id: 'periodChange',
              header: changeLabel,
              align: 'right',
              render: (row) =>
                row.periodChange !== 0 ? (
                  <Text c={row.periodChange >= 0 ? 'green' : 'red'} span>
                    {row.periodChange >= 0 ? '+' : ''}
                    {row.periodChange}%
                  </Text>
                ) : (
                  '—'
                ),
              sortValue: (row) => row.periodChange,
            },
          ]}
          keyField="period"
        />
        <Text size="xs" c="dimmed" mt="md">
          All metrics shown are for users with email addresses (typically logged-in users only). Anonymous users without emails are excluded.
        </Text>
      </Paper>
    </Container>
  );
}
