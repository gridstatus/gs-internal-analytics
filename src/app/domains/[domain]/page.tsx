'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQueryState, parseAsStringEnum } from 'nuqs';
import { useApiData } from '@/hooks/useApiData';
import { useDebouncedValue } from '@mantine/hooks';
import {
  Container,
  Title,
  Paper,
  Text,
  Group,
  SimpleGrid,
  Loader,
  Alert,
  Stack,
  Anchor,
  Badge,
  TextInput,
  SegmentedControl,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconSearch } from '@tabler/icons-react';
import { MetricCard } from '@/components/MetricCard';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import { UserHoverCard } from '@/components/UserHoverCard';
import { DataTable, Column } from '@/components/DataTable';
import type { MostActiveUsersRow, MostActiveUsersResponse } from '@/lib/api-types';
import Link from 'next/link';

interface DomainUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  lastActiveAt: string | null;
  isAdmin: boolean;
}

interface DomainData {
  domain: string;
  stats: {
    totalUsers: number;
    newUsers7d: number;
    newUsers30d: number;
    activeUsers7d: number;
    activeUsers30d: number;
    adminCount: number;
    chartCount: number;
    dashboardCount: number;
  };
  users: DomainUser[];
  monthlyRegistrations: Array<{
    month: string;
    userCount: number;
  }>;
}

export default function DomainDetailPage() {
  const params = useParams();
  const domain = params.domain as string;

  const url = domain ? `/api/domains/${encodeURIComponent(domain)}` : null;
  const { data, loading, error } = useApiData<DomainData>(url, [domain]);

  const posthogActiveUrl = domain ? `/api/domains/${encodeURIComponent(domain)}/posthog-active-users-by-month` : null;
  const { data: posthogActiveData, loading: posthogActiveLoading } = useApiData<{ data: Array<{ month: string; activeUsers: number }> }>(posthogActiveUrl, [domain]);

  const [mostActiveDays, setMostActiveDays] = useQueryState(
    'days',
    parseAsStringEnum(['7', '30', '365', 'all']).withDefault('30')
  );
  const mostActiveUrl = domain
    ? `/api/domains/${encodeURIComponent(domain)}/most-active-users?days=${mostActiveDays}`
    : null;
  const { data: mostActiveData, loading: mostActiveLoading } = useApiData<MostActiveUsersResponse>(mostActiveUrl, [domain, mostActiveDays]);

  const [mostActiveSearch, setMostActiveSearch] = useState('');
  const [mostActiveSearchDebounced] = useDebouncedValue(mostActiveSearch, 300);
  const mostActiveFiltered = useMemo(() => {
    const s = mostActiveSearchDebounced.toLowerCase();
    if (!s) return mostActiveData?.rows ?? [];
    return (mostActiveData?.rows ?? []).filter((r) => r.email.toLowerCase().includes(s));
  }, [mostActiveData?.rows, mostActiveSearchDebounced]);

  const mostActiveColumns: Column<MostActiveUsersRow>[] = [
    {
      id: 'user',
      header: 'User',
      render: (row) => {
        if (row.userId) {
          return <UserHoverCard userId={row.userId} userName={row.email} />;
        }
        return <Text size="sm">{row.email}</Text>;
      },
      sortValue: (row) => row.email.toLowerCase(),
    },
    { id: 'daysActive', header: 'Days active', align: 'right', render: (row) => (row.daysActive ?? 0).toLocaleString(), sortValue: (row) => row.daysActive ?? 0 },
    { id: 'pageViews', header: 'Page views', align: 'right', render: (row) => row.pageViews.toLocaleString(), sortValue: (row) => row.pageViews },
    { id: 'sessions', header: 'Sessions', align: 'right', render: (row) => row.sessions.toLocaleString(), sortValue: (row) => row.sessions },
  ];

  if (loading) {
    return (
      <Container fluid py="xl">
        <Stack align="center" py="xl">
          <Loader />
        </Stack>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container fluid py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error loading domain"
          color="red"
        >
          {error || 'Domain data not available'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid py="xl">
      <Group mb="xl">
        <Anchor
          component={Link}
          href="/users-list"
          size="sm"
          c="dimmed"
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <IconArrowLeft size={16} />
          Back to Users
        </Anchor>
      </Group>

      <Title order={1} mb="xl">
        {data.domain}
      </Title>

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="xl">
        <MetricCard
          title="Total Users"
          value={data.stats.totalUsers}
        />
        <MetricCard
          title="Active (7d)"
          value={data.stats.activeUsers7d}
        />
        <MetricCard
          title="Active (30d)"
          value={data.stats.activeUsers30d}
        />
        <MetricCard
          title="New (30d)"
          value={data.stats.newUsers30d}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="xl">
        <MetricCard
          title="Charts"
          value={data.stats.chartCount}
        />
        <MetricCard
          title="Dashboards"
          value={data.stats.dashboardCount}
        />
      </SimpleGrid>

      {/* Monthly Registrations & PostHog Active users side by side */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
        {data.monthlyRegistrations.length > 0 ? (
          <TimeSeriesChart
            title="Monthly User Registrations"
            subtitle="New users registered each month"
            data={data.monthlyRegistrations.map(m => ({
              month: new Date(m.month).toISOString().slice(0, 7),
              users: m.userCount,
            }))}
            dataKey="users"
            color="blue.6"
            chartType="bar"
          />
        ) : (
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Text fw={600} size="lg" mb="xs">Monthly User Registrations</Text>
            <Text c="dimmed" size="sm">No registration data</Text>
          </Paper>
        )}
        {posthogActiveLoading ? (
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Text fw={600} size="lg" mb="xs">Active users by month (PostHog)</Text>
            <Stack align="center" py="xl">
              <Loader />
            </Stack>
          </Paper>
        ) : posthogActiveData?.data && posthogActiveData.data.length > 0 ? (
          <TimeSeriesChart
            title="Active users by month (PostHog)"
            subtitle="Distinct users with at least one event per month"
            data={posthogActiveData.data.map((r) => ({
              month: r.month,
              activeUsers: r.activeUsers,
            }))}
            dataKey="activeUsers"
            color="teal.6"
            chartType="bar"
          />
        ) : (
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Text fw={600} size="lg" mb="xs">Active users by month (PostHog)</Text>
            <Text c="dimmed" size="sm">No PostHog data</Text>
          </Paper>
        )}
      </SimpleGrid>

      {/* Most active users (PostHog: page views & sessions) */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Group justify="space-between" mb="md" wrap="wrap" gap="md">
          <Stack gap={2}>
            <Text fw={600} size="lg">
              Most active users
              {mostActiveDays === 'all' ? ' (all time)' : ` (last ${mostActiveDays} days)`}
            </Text>
            <Text size="sm" c="dimmed">
              Top 50 by page views and sessions from PostHog
            </Text>
          </Stack>
          <Group gap="sm">
            <SegmentedControl
              size="xs"
              value={mostActiveDays}
              onChange={(v) => setMostActiveDays((v as '7' | '30' | '365' | 'all') ?? '30')}
              data={[
                { label: '7d', value: '7' },
                { label: '30d', value: '30' },
                { label: '365d', value: '365' },
                { label: 'All time', value: 'all' },
              ]}
            />
            <TextInput
              placeholder="Search by email"
              leftSection={<IconSearch size={16} />}
              value={mostActiveSearch}
              onChange={(e) => setMostActiveSearch(e.currentTarget.value)}
              size="sm"
              style={{ maxWidth: 260 }}
            />
          </Group>
        </Group>
        {mostActiveLoading ? (
          <Stack align="center" py="xl">
            <Loader />
          </Stack>
        ) : (
          <>
            <DataTable
              data={mostActiveFiltered}
              columns={mostActiveColumns}
              keyField="email"
              emptyMessage="No PostHog data for this domain."
              defaultSort={{ column: 'daysActive', direction: 'desc' }}
            />
          </>
        )}
      </Paper>

      {/* Users Table */}
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Text fw={600} size="lg" mb="md">
          Users ({data.users.length})
        </Text>
        <DataTable
          data={data.users}
          columns={[
            {
              id: 'username',
              header: 'Username',
              align: 'left',
              render: (row) => <UserHoverCard userId={row.id} userName={row.username} />,
              sortValue: (row) => row.username.toLowerCase(),
            },
            {
              id: 'name',
              header: 'Name',
              align: 'left',
              render: (row) => `${row.firstName} ${row.lastName}`,
              sortValue: (row) => `${row.firstName} ${row.lastName}`.toLowerCase(),
            },
            {
              id: 'createdAt',
              header: 'Created',
              align: 'left',
              render: (row) => new Date(row.createdAt).toLocaleDateString(),
              sortValue: (row) => new Date(row.createdAt).getTime(),
            },
            {
              id: 'lastActiveAt',
              header: 'Last Active',
              align: 'left',
              render: (row) =>
                row.lastActiveAt ? new Date(row.lastActiveAt).toLocaleDateString() : 'Never',
              sortValue: (row) => row.lastActiveAt ? new Date(row.lastActiveAt).getTime() : 0,
            },
            {
              id: 'role',
              header: 'Role',
              align: 'left',
              render: (row) => row.isAdmin ? <Badge color="red" size="sm">Admin</Badge> : null,
              sortValue: (row) => row.isAdmin ? 1 : 0,
            },
          ]}
          keyField="id"
        />
      </Paper>
    </Container>
  );
}

