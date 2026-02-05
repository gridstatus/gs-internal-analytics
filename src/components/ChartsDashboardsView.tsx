'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  SimpleGrid,
  Skeleton,
  Alert,
  Stack,
  Paper,
  Text,
  TextInput,
  Group,
} from '@mantine/core';
import { IconAlertCircle, IconSearch } from '@tabler/icons-react';
import { MetricCard } from './MetricCard';
import { useFilter } from '@/contexts/FilterContext';
import { UserHoverCard } from './UserHoverCard';
import { ChartsDashboardsResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { DataTable, Column } from './DataTable';
import { PageBreadcrumbs } from './PageBreadcrumbs';

export function ChartsDashboardsView() {
  const [search, setSearch] = useState('');
  const url = useApiUrl('/api/charts-dashboards', {});
  const { data, loading, error } = useApiData<ChartsDashboardsResponse>(url, [url]);

  const filteredUsers = data?.users
    .filter(
      (user) =>
        user.username.toLowerCase().includes(search.toLowerCase()) ||
        user.domain.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 100) ?? [];

  const columns: Column<ChartsDashboardsResponse['users'][0]>[] = [
    {
      id: 'user',
      header: 'User',
      align: 'left',
      render: (row) => <UserHoverCard userId={row.userId} userName={row.username} />,
      sortValue: (row) => row.username.toLowerCase(),
    },
    {
      id: 'domain',
      header: 'Domain',
      align: 'left',
      render: (row) => row.domain,
      sortValue: (row) => row.domain.toLowerCase(),
    },
    {
      id: 'chartCount',
      header: 'Charts',
      align: 'right',
      render: (row) => row.chartCount,
      sortValue: (row) => row.chartCount,
    },
    {
      id: 'dashboardCount',
      header: 'Dashboards',
      align: 'right',
      render: (row) => row.dashboardCount,
      sortValue: (row) => row.dashboardCount,
    },
    {
      id: 'lastChartCreated',
      header: 'Last Chart',
      align: 'right',
      render: (row) => row.lastChartCreated || '—',
      sortValue: (row) => row.lastChartCreated || '',
    },
    {
      id: 'lastDashboardCreated',
      header: 'Last Dashboard',
      align: 'right',
      render: (row) => row.lastDashboardCreated || '—',
      sortValue: (row) => row.lastDashboardCreated || '',
    },
  ];

  return (
    <Container fluid py="xl">
      <PageBreadcrumbs items={[{ label: 'Charts & Dashboards' }]} />
      <Title order={1} mb="xl">Charts & Dashboards</Title>

      {loading ? (
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height={100} />
            ))}
          </SimpleGrid>
          <Skeleton height={400} />
        </Stack>
      ) : error ? (
        <Alert icon={<IconAlertCircle size={16} />} title="Error loading data" color="red">
          {error}
        </Alert>
      ) : data ? (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="xl">
            <MetricCard
              title="Total Charts"
              value={data.summary.totalCharts}
              subtitle={`${data.summary.chartUsers} users`}
            />
            <MetricCard
              title="Total Dashboards"
              value={data.summary.totalDashboards}
              subtitle={`${data.summary.dashboardUsers} users`}
            />
            <MetricCard
              title="Chart Users"
              value={data.summary.chartUsers}
            />
            <MetricCard
              title="Dashboard Users"
              value={data.summary.dashboardUsers}
            />
          </SimpleGrid>
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600} size="lg">
                Users Creating Charts/Dashboards
              </Text>
              <TextInput
                placeholder="Search by email or domain..."
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                style={{ width: '100%', maxWidth: 300 }}
              />
            </Group>
            <DataTable
              data={filteredUsers}
              columns={columns}
              keyField="username"
              defaultSort={{ column: 'chartCount', direction: 'desc' }}
            />
            <Text size="xs" c="dimmed" mt="md">
              Showing up to 100 users, sorted by total charts + dashboards.
            </Text>
          </Paper>
        </>
      ) : null}
    </Container>
  );
}
