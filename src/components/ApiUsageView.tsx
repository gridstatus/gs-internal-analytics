'use client';

import { useRef } from 'react';
import {
  Title,
  SimpleGrid,
  Group,
  Skeleton,
  Alert,
  Stack,
  Paper,
  Text,
} from '@mantine/core';
import { MetricCard } from './MetricCard';
import { TimeSeriesChart } from './TimeSeriesChart';
import { ExportButton } from './ExportButton';
import { ApiUsageResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { AppContainer } from '@/components/AppContainer';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { DataTable, Column } from './DataTable';

export function ApiUsageView() {
  // DOM refs for chart export - ExportButton uses html-to-image to capture these elements as PNGs
  const requestsChartRef = useRef<HTMLDivElement>(null);
  const rowsChartRef = useRef<HTMLDivElement>(null);
  const usersChartRef = useRef<HTMLDivElement>(null);

  const chartRefs = [
    { name: 'api_requests', ref: requestsChartRef },
    { name: 'api_rows_returned', ref: rowsChartRef },
    { name: 'unique_api_users', ref: usersChartRef },
  ];

  const url = useApiUrl('/api/api-usage', {});
  const { data, loading, error } = useApiData<ApiUsageResponse>(url, [url]);

  if (loading) {
    return (
      <AppContainer>
        <Stack gap="md">
          <Skeleton height={50} width={300} />
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} height={100} />
            ))}
          </SimpleGrid>
          <Skeleton height={350} />
        </Stack>
      </AppContainer>
    );
  }

  if (error) {
    return (
      <AppContainer>
        <ErrorDisplay title="Error loading data" error={error} />
      </AppContainer>
    );
  }

  if (!data || data.monthlyData.length === 0) {
    return (
      <AppContainer>
        <Alert title="No data" color="yellow">
          No API usage data available.
        </Alert>
      </AppContainer>
    );
  }

  const latestMetric = data.monthlyData[data.monthlyData.length - 1];
  const previousMetric =
    data.monthlyData.length > 1
      ? data.monthlyData[data.monthlyData.length - 2]
      : null;

  const calculateTrend = (current: number, previous: number | undefined) => {
    if (previous === undefined || previous === 0) return undefined;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Get last 12 months for the table
  const recentMonths = data.monthlyData.slice(-12).reverse();

  const columns: Column<typeof recentMonths[0]>[] = [
    {
      id: 'month',
      header: 'Month',
      align: 'left',
      render: (row) => row.month,
      sortValue: (row) => row.month,
    },
    {
      id: 'totalApiRequests',
      header: 'Requests',
      align: 'right',
      render: (row) => (
        <>
          {row.totalApiRequests.toLocaleString()}
          {row.requestsMomChange !== 0 && (
            <Text span size="xs" c={row.requestsMomChange >= 0 ? 'green' : 'red'} ml="xs">
              ({row.requestsMomChange >= 0 ? '+' : ''}{row.requestsMomChange}%)
            </Text>
          )}
        </>
      ),
      sortValue: (row) => row.totalApiRequests,
    },
    {
      id: 'totalApiRowsReturned',
      header: 'Rows',
      align: 'right',
      render: (row) => (
        <>
          {row.totalApiRowsReturned.toLocaleString()}
          {row.rowsMomChange !== 0 && (
            <Text span size="xs" c={row.rowsMomChange >= 0 ? 'green' : 'red'} ml="xs">
              ({row.rowsMomChange >= 0 ? '+' : ''}{row.rowsMomChange}%)
            </Text>
          )}
        </>
      ),
      sortValue: (row) => row.totalApiRowsReturned,
    },
    {
      id: 'uniqueApiUsers',
      header: 'Users',
      align: 'right',
      render: (row) => (
        <>
          {row.uniqueApiUsers.toLocaleString()}
          {row.usersMomChange !== 0 && (
            <Text span size="xs" c={row.usersMomChange >= 0 ? 'green' : 'red'} ml="xs">
              ({row.usersMomChange >= 0 ? '+' : ''}{row.usersMomChange}%)
            </Text>
          )}
        </>
      ),
      sortValue: (row) => row.uniqueApiUsers,
    },
  ];

  return (
    <AppContainer>
      <Group justify="space-between" mb="xl">
        <Title order={1}>API Usage</Title>
        <ExportButton charts={chartRefs} />
      </Group>

      {/* Summary Metrics */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="xl">
        <MetricCard
          title="API Requests"
          value={latestMetric.totalApiRequests}
          trend={calculateTrend(
            latestMetric.totalApiRequests,
            previousMetric?.totalApiRequests
          )}
          trendLabel="MoM"
        />
        <MetricCard
          title="Rows Returned"
          value={latestMetric.totalApiRowsReturned}
          trend={calculateTrend(
            latestMetric.totalApiRowsReturned,
            previousMetric?.totalApiRowsReturned
          )}
          trendLabel="MoM"
        />
        <MetricCard
          title="Unique API Users"
          value={latestMetric.uniqueApiUsers}
          trend={calculateTrend(
            latestMetric.uniqueApiUsers,
            previousMetric?.uniqueApiUsers
          )}
          trendLabel="MoM"
          subtitle="Users with 5+ requests/month"
        />
      </SimpleGrid>

      {/* Charts */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
        <TimeSeriesChart
          ref={requestsChartRef}
          title="API Requests"
          subtitle="Total API requests per month"
          data={data.monthlyData}
          dataKey="totalApiRequests"
          color="cyan.6"
          chartType="bar"
        />
        <TimeSeriesChart
          ref={rowsChartRef}
          title="Rows Returned"
          subtitle="Total data rows returned via API"
          data={data.monthlyData}
          dataKey="totalApiRowsReturned"
          color="lime.6"
          chartType="bar"
        />
      </SimpleGrid>

      <TimeSeriesChart
        ref={usersChartRef}
        title="Unique API Users"
        subtitle="Users with 5+ API requests per month"
        data={data.monthlyData}
        dataKey="uniqueApiUsers"
        color="grape.6"
        chartType="bar"
        height={350}
      />

      {/* Data Table */}
      <Paper shadow="sm" p="md" radius="md" withBorder mt="xl">
        <Text fw={600} size="lg" mb="md">
          Recent Months
        </Text>
        <DataTable
          data={recentMonths}
          columns={columns}
          keyField="month"
        />
      </Paper>
    </AppContainer>
  );
}
