'use client';

import { useState } from 'react';
import {
  SimpleGrid,
  Skeleton,
  Stack,
  Paper,
  Text,
  TextInput,
  Group,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { MetricCard } from './MetricCard';
import { AlertsResponse, AlertUserRow } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { AppContainer } from '@/components/AppContainer';
import { UserHoverCard } from './UserHoverCard';
import { DataTable, Column } from './DataTable';
import { ErrorDisplay } from './ErrorDisplay';
import { PageBreadcrumbs } from './PageBreadcrumbs';

export function AlertsView() {
  const [search, setSearch] = useState('');
  const url = useApiUrl('/api/alerts', {});
  const { data, loading, error } = useApiData<AlertsResponse>(url, [url]);

  const filteredUsers = (data?.users ?? [])
    .filter(
      (user) =>
        user.username.toLowerCase().includes(search.toLowerCase()) ||
        user.domain.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 100);

  const columns: Column<AlertUserRow>[] = [
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
      id: 'alertCount',
      header: 'Alerts',
      align: 'right',
      render: (row) => row.alertCount,
      sortValue: (row) => row.alertCount,
    },
    {
      id: 'lastAlertCreated',
      header: 'Last Alert',
      align: 'right',
      render: (row) => row.lastAlertCreated || '—',
      sortValue: (row) => row.lastAlertCreated || '',
    },
  ];

  return (
    <AppContainer>
      <PageBreadcrumbs items={[{ label: 'Alerts' }]} />

      {loading ? (
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 2 }} spacing="md">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} height={100} />
            ))}
          </SimpleGrid>
          <Skeleton height={400} />
        </Stack>
      ) : error ? (
        <ErrorDisplay error={error} />
      ) : data ? (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 2 }} spacing="md" mb="xl">
            <MetricCard
              title="Total Alerts"
              value={data.summary.totalAlerts}
              subtitle={`${data.summary.alertUsers} users`}
            />
            <MetricCard
              title="Alert Users"
              value={data.summary.alertUsers}
            />
          </SimpleGrid>
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600} size="lg">
                Users Creating Alerts
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
              keyField="userId"
              defaultSort={{ column: 'alertCount', direction: 'desc' }}
              emptyMessage="No alerts found"
            />
            <Text size="xs" c="dimmed" mt="md">
              Showing up to 100 users, sorted by alert count.
            </Text>
          </Paper>
        </>
      ) : null}
    </AppContainer>
  );
}

