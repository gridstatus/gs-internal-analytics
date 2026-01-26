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
import { AlertsResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { UserHoverCard } from './UserHoverCard';
import { DataTable, Column } from './DataTable';

export function AlertsView() {
  const [search, setSearch] = useState('');
  const { filterGridstatus, timezone } = useFilter();
  const url = useApiUrl('/api/alerts', { filterGridstatus, timezone });
  const { data, loading, error } = useApiData<AlertsResponse>(url, [filterGridstatus, timezone]);

  if (loading) {
    return (
      <Container fluid py="xl">
        <Stack gap="md">
          <Skeleton height={50} width={300} />
          <SimpleGrid cols={{ base: 1, sm: 2, md: 2 }} spacing="md">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} height={100} />
            ))}
          </SimpleGrid>
          <Skeleton height={400} />
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

  if (!data) {
    return null;
  }

  const filteredUsers = data.users
    .filter(
      (user) =>
        user.username.toLowerCase().includes(search.toLowerCase()) ||
        user.domain.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 100);

  const columns: Column<typeof filteredUsers[0]>[] = [
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
    <Container fluid py="xl">
      <Title order={1} mb="xl">Alerts</Title>

      {/* Summary Metrics */}
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

      {/* Users table */}
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
            style={{ width: 300 }}
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
    </Container>
  );
}

