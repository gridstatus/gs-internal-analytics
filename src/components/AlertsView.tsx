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
import { AlertsResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { UserHoverCard } from './UserHoverCard';
import Link from 'next/link';

export function AlertsView() {
  const [search, setSearch] = useState('');
  const { filterGridstatus, timezone } = useFilter();
  const url = `/api/alerts?filterGridstatus=${filterGridstatus}&timezone=${timezone}`;
  const { data, loading, error } = useApiData<AlertsResponse>(url, [url, filterGridstatus, timezone]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
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
        {filteredUsers.length === 0 ? (
          <Text c="dimmed">No alerts found</Text>
        ) : (
          <>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>User</Table.Th>
                  <Table.Th>Domain</Table.Th>
                  <Table.Th ta="right">Alerts</Table.Th>
                  <Table.Th ta="right">Last Alert</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredUsers.slice(0, 100).map((user) => (
                  <Table.Tr key={user.userId}>
                    <Table.Td>
                      <UserHoverCard userId={user.userId} userName={user.username} />
                    </Table.Td>
                    <Table.Td>{user.domain}</Table.Td>
                    <Table.Td ta="right">{user.alertCount}</Table.Td>
                    <Table.Td ta="right">{user.lastAlertCreated || '—'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            <Text size="xs" c="dimmed" mt="md">
              Showing up to 100 users, sorted by alert count.
            </Text>
          </>
        )}
      </Paper>
    </Container>
  );
}

