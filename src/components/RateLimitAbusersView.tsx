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
  Select,
  Anchor,
} from '@mantine/core';
import { IconAlertCircle, IconSearch } from '@tabler/icons-react';
import { MetricCard } from './MetricCard';
import { useFilter } from '@/contexts/FilterContext';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { TimeSeriesChart } from './TimeSeriesChart';
import { DataTable, Column } from './DataTable';
import { UserHoverCard } from './UserHoverCard';

interface RateLimitUser {
  email: string;
  hits: number;
  percentage: number;
  userId?: number | null;
}

interface RateLimitTimeSeries {
  date: string;
  hits: number;
  uniqueUsers: number;
}

interface RateLimitAbusersResponse {
  users: RateLimitUser[];
  timeSeries: RateLimitTimeSeries[];
  totalHits: number;
  uniqueUsers: number;
}

export function RateLimitAbusersView() {
  const [search, setSearch] = useState('');
  const [days, setDays] = useState('1');
  const { timezone } = useFilter();
  const url = useApiUrl('/api/rate-limit-abusers', { days, timezone });
  const { data, loading, error } = useApiData<RateLimitAbusersResponse>(url, [days, timezone]);

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
          title="Error"
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

  const filteredUsers = data.users.filter((user) =>
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<RateLimitUser>[] = [
    {
      id: 'email',
      header: 'Email',
      render: (user) => {
        if (user.userId) {
          return <UserHoverCard userId={user.userId} userName={user.email} />;
        }
        return (
          <Anchor href={`mailto:${user.email}`} size="sm">
            {user.email}
          </Anchor>
        );
      },
      sortValue: (user) => user.email.toLowerCase(),
    },
    {
      id: 'hits',
      header: 'Rate Limit Hits',
      render: (user) => user.hits.toLocaleString(),
      align: 'right',
      sortValue: (user) => user.hits,
    },
    {
      id: 'percentage',
      header: '% of Total',
      render: (user) => `${user.percentage.toFixed(1)}%`,
      align: 'right',
      sortValue: (user) => user.percentage,
    },
  ];

  const timeSeriesData = data.timeSeries.map((point) => ({
    month: point.date,
    hits: point.hits,
    uniqueUsers: point.uniqueUsers,
  }));

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={2} mb="xs">Rate Limit Activity</Title>
            <Text c="dimmed" size="sm">
              Users hitting API rate limits - prime candidates for enterprise plans
            </Text>
          </div>
          <Select
            label="Time Period"
            value={days}
            onChange={(value) => setDays(value || '1')}
            data={[
              { value: '1', label: 'Last 1 day' },
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
            ]}
            style={{ width: 150 }}
          />
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <MetricCard
            title="Total Hits"
            value={data.totalHits.toLocaleString()}
            subtitle="Rate limit hits in period"
          />
          <MetricCard
            title="Unique Users"
            value={data.uniqueUsers.toLocaleString()}
            subtitle="Users hitting limits"
          />
          <MetricCard
            title="Top User Hits"
            value={data.users[0]?.hits.toLocaleString() || '0'}
            subtitle={data.users[0]?.email || 'N/A'}
          />
          <MetricCard
            title="Top User %"
            value={`${data.users[0]?.percentage.toFixed(1) || '0'}%`}
            subtitle="Of total hits"
          />
        </SimpleGrid>

        <Paper shadow="sm" p="md" withBorder>
          <Title order={4} mb="md">Rate Limit Hits Over Time</Title>
          <TimeSeriesChart
            title="Rate Limit Hits Over Time"
            data={timeSeriesData}
            dataKey="hits"
            color="red.6"
            chartType="bar"
          />
        </Paper>

        <Paper shadow="sm" p="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>Top Users by Rate Limit Hits</Title>
            <TextInput
              placeholder="Search by email..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ width: 300 }}
            />
          </Group>
          <DataTable
            data={filteredUsers.map((user, index) => ({ ...user, id: user.email || `user-${index}` }))}
            columns={columns}
            keyField="email"
            defaultSort={{ column: 'hits', direction: 'desc' }}
          />
          {filteredUsers.length >= 100 && (
            <Text size="sm" c="dimmed" mt="md">
              Showing top 100 users. Use search to find specific users.
            </Text>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}

