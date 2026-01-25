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
  Table,
  TextInput,
  Group,
  Anchor,
} from '@mantine/core';
import { IconAlertCircle, IconSearch } from '@tabler/icons-react';
import { MetricCard } from './MetricCard';
import { useFilter } from '@/contexts/FilterContext';
import Link from 'next/link';
import { ChartsDashboardsResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';

export function ChartsDashboardsView() {
  const [search, setSearch] = useState('');
  const { filterGridstatus } = useFilter();
  const url = `/api/charts-dashboards?filterGridstatus=${filterGridstatus}`;
  const { data, loading, error } = useApiData<ChartsDashboardsResponse>(url, [url]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="md">
          <Skeleton height={50} width={300} />
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            {[...Array(4)].map((_, i) => (
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

  if (!data) {
    return null;
  }

  const filteredUsers = data.users.filter(
    (user) =>
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.domain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">Charts & Dashboards</Title>

      {/* Summary Metrics */}
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

      {/* Users table */}
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
            style={{ width: 300 }}
          />
        </Group>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>User</Table.Th>
              <Table.Th>Domain</Table.Th>
              <Table.Th ta="right">Charts</Table.Th>
              <Table.Th ta="right">Dashboards</Table.Th>
              <Table.Th ta="right">Last Chart</Table.Th>
              <Table.Th ta="right">Last Dashboard</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredUsers.slice(0, 100).map((user) => (
              <Table.Tr key={user.username}>
                <Table.Td>
                  <Anchor component={Link} href={`/users-list/${user.userId}`}>
                    {user.username}
                  </Anchor>
                </Table.Td>
                <Table.Td>{user.domain}</Table.Td>
                <Table.Td ta="right">{user.chartCount}</Table.Td>
                <Table.Td ta="right">{user.dashboardCount}</Table.Td>
                <Table.Td ta="right">{user.lastChartCreated || '—'}</Table.Td>
                <Table.Td ta="right">{user.lastDashboardCreated || '—'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Text size="xs" c="dimmed" mt="md">
          Showing up to 100 users, sorted by total charts + dashboards.
        </Text>
      </Paper>
    </Container>
  );
}
