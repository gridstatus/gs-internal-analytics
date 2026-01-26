'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Container,
  Title,
  Paper,
  Table,
  Text,
  Group,
  SimpleGrid,
  Loader,
  Alert,
  Stack,
  Anchor,
  Badge,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';
import { MetricCard } from '@/components/MetricCard';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import { UserHoverCard } from '@/components/UserHoverCard';
import { DataTable, Column } from '@/components/DataTable';
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
  const [data, setData] = useState<DomainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const encodedDomain = encodeURIComponent(domain);
        const response = await fetch(`/api/domains/${encodedDomain}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Domain not found');
          } else {
            throw new Error('Failed to fetch domain data');
          }
          return;
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (domain) {
      fetchData();
    }
  }, [domain]);

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

      {/* Monthly Registrations Chart */}
      {data.monthlyRegistrations.length > 0 && (
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
          showMoM={false}
        />
      )}

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

