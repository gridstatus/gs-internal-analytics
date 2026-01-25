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
  Table,
  Paper,
  Text,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { MetricCard } from './MetricCard';
import { TimeSeriesChart } from './TimeSeriesChart';
import { ExportButton } from './ExportButton';
import { useFilter } from '@/contexts/FilterContext';

interface MonthlyApiUsage {
  month: string;
  totalApiRequests: number;
  totalApiRowsReturned: number;
  uniqueApiUsers: number;
  requestsMomChange: number;
  rowsMomChange: number;
  usersMomChange: number;
  [key: string]: string | number;
}

interface ApiUsageResponse {
  monthlyData: MonthlyApiUsage[];
}

export function ApiUsageView() {
  const [data, setData] = useState<ApiUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestsChartRef = useRef<HTMLDivElement>(null);
  const rowsChartRef = useRef<HTMLDivElement>(null);
  const usersChartRef = useRef<HTMLDivElement>(null);

  const chartRefs = [
    { name: 'api_requests', ref: requestsChartRef },
    { name: 'api_rows_returned', ref: rowsChartRef },
    { name: 'unique_api_users', ref: usersChartRef },
  ];

  const { filterGridstatus } = useFilter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/api-usage?filterGridstatus=${filterGridstatus}`);
        if (!response.ok) {
          throw new Error('Failed to fetch API usage');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filterGridstatus]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="md">
          <Skeleton height={50} width={300} />
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {[...Array(3)].map((_, i) => (
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
      <Container size="xl" py="xl">
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

  if (!data || data.monthlyData.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Alert title="No data" color="yellow">
          No API usage data available.
        </Alert>
      </Container>
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

  return (
    <Container size="xl" py="xl">
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
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Month</Table.Th>
              <Table.Th ta="right">Requests</Table.Th>
              <Table.Th ta="right">Rows</Table.Th>
              <Table.Th ta="right">Users</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {recentMonths.map((row) => (
              <Table.Tr key={row.month}>
                <Table.Td>{row.month}</Table.Td>
                <Table.Td ta="right">
                  {row.totalApiRequests.toLocaleString()}
                  {row.requestsMomChange !== 0 && (
                    <Text span size="xs" c={row.requestsMomChange >= 0 ? 'green' : 'red'} ml="xs">
                      ({row.requestsMomChange >= 0 ? '+' : ''}{row.requestsMomChange}%)
                    </Text>
                  )}
                </Table.Td>
                <Table.Td ta="right">
                  {row.totalApiRowsReturned.toLocaleString()}
                  {row.rowsMomChange !== 0 && (
                    <Text span size="xs" c={row.rowsMomChange >= 0 ? 'green' : 'red'} ml="xs">
                      ({row.rowsMomChange >= 0 ? '+' : ''}{row.rowsMomChange}%)
                    </Text>
                  )}
                </Table.Td>
                <Table.Td ta="right">
                  {row.uniqueApiUsers.toLocaleString()}
                  {row.usersMomChange !== 0 && (
                    <Text span size="xs" c={row.usersMomChange >= 0 ? 'green' : 'red'} ml="xs">
                      ({row.usersMomChange >= 0 ? '+' : ''}{row.usersMomChange}%)
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Container>
  );
}
