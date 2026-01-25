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
  Progress,
  Group,
  Table,
  TextInput,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { IconAlertCircle } from '@tabler/icons-react';
import { MetricCard } from './MetricCard';
import { useFilter } from '@/contexts/FilterContext';
import { ActiveUsersResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';

export function ActiveUsersView() {
  const [search, setSearch] = useState('');
  const { filterGridstatus } = useFilter();
  const url = `/api/active-users?filterGridstatus=${filterGridstatus}`;
  const { data, loading, error } = useApiData<ActiveUsersResponse>(url, [url]);

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
          <Skeleton height={200} />
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

  const pct24h = Math.round((data.active24h / data.totalUsers) * 100);
  const pct7d = Math.round((data.active7d / data.totalUsers) * 100);
  const pct30d = Math.round((data.active30d / data.totalUsers) * 100);
  const pct90d = Math.round((data.active90d / data.totalUsers) * 100);

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">Active Users</Title>

      {/* Summary Metrics */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="xl">
        <MetricCard
          title="Last 24 Hours"
          value={data.active24h}
          subtitle={`${pct24h}% of users`}
        />
        <MetricCard
          title="Last 7 Days"
          value={data.active7d}
          subtitle={`${pct7d}% of users`}
        />
        <MetricCard
          title="Last 30 Days"
          value={data.active30d}
          subtitle={`${pct30d}% of users`}
        />
        <MetricCard
          title="Last 90 Days"
          value={data.active90d}
          subtitle={`${pct90d}% of users`}
        />
      </SimpleGrid>

      {/* Visual breakdown */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Text fw={600} size="lg" mb="md">
          Activity Breakdown
        </Text>
        <Stack gap="lg">
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm">24 Hours</Text>
              <Text size="sm" c="dimmed">{data.active24h.toLocaleString()} / {data.totalUsers.toLocaleString()}</Text>
            </Group>
            <Progress value={pct24h} size="lg" color="green" />
          </div>
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm">7 Days</Text>
              <Text size="sm" c="dimmed">{data.active7d.toLocaleString()} / {data.totalUsers.toLocaleString()}</Text>
            </Group>
            <Progress value={pct7d} size="lg" color="teal" />
          </div>
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm">30 Days</Text>
              <Text size="sm" c="dimmed">{data.active30d.toLocaleString()} / {data.totalUsers.toLocaleString()}</Text>
            </Group>
            <Progress value={pct30d} size="lg" color="blue" />
          </div>
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm">90 Days</Text>
              <Text size="sm" c="dimmed">{data.active90d.toLocaleString()} / {data.totalUsers.toLocaleString()}</Text>
            </Group>
            <Progress value={pct90d} size="lg" color="violet" />
          </div>
        </Stack>
        <Text size="xs" c="dimmed" mt="md">
          Based on last_active_at timestamp. Total users with activity: {data.totalUsers.toLocaleString()}
        </Text>
      </Paper>

      {/* Domain breakdown table */}
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600} size="lg">
            Active Users by Domain
          </Text>
          <TextInput
            placeholder="Search domains..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ width: 250 }}
          />
        </Group>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Domain</Table.Th>
              <Table.Th ta="right">24h</Table.Th>
              <Table.Th ta="right">7d</Table.Th>
              <Table.Th ta="right">30d</Table.Th>
              <Table.Th ta="right">90d</Table.Th>
              <Table.Th ta="right">Total</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.byDomain
              .filter((row) => row.domain.toLowerCase().includes(search.toLowerCase()))
              .slice(0, 100)
              .map((row) => (
                <Table.Tr key={row.domain}>
                  <Table.Td>{row.domain}</Table.Td>
                  <Table.Td ta="right">{row.active24h}</Table.Td>
                  <Table.Td ta="right">{row.active7d}</Table.Td>
                  <Table.Td ta="right">{row.active30d}</Table.Td>
                  <Table.Td ta="right">{row.active90d}</Table.Td>
                  <Table.Td ta="right">{row.totalUsers}</Table.Td>
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>
        <Text size="xs" c="dimmed" mt="md">
          Showing up to 100 domains. Excludes free email providers only.
        </Text>
      </Paper>
    </Container>
  );
}
