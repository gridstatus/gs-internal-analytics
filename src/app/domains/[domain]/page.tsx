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
      <Container size="xl" py="xl">
        <Stack align="center" py="xl">
          <Loader />
        </Stack>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container size="xl" py="xl">
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
    <Container size="xl" py="xl">
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
        <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
          <Text fw={600} size="lg" mb="md">
            User Registrations Over Time
          </Text>
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
        </Paper>
      )}

      {/* Users Table */}
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Text fw={600} size="lg" mb="md">
          Users ({data.users.length})
        </Text>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Username</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Created</Table.Th>
              <Table.Th>Last Active</Table.Th>
              <Table.Th>Role</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.users.map((user) => (
              <Table.Tr key={user.id}>
                <Table.Td>
                  <Anchor component={Link} href={`/users-list/${user.id}`}>
                    {user.username}
                  </Anchor>
                </Table.Td>
                <Table.Td>
                  {user.firstName} {user.lastName}
                </Table.Td>
                <Table.Td>
                  {new Date(user.createdAt).toLocaleDateString()}
                </Table.Td>
                <Table.Td>
                  {user.lastActiveAt
                    ? new Date(user.lastActiveAt).toLocaleDateString()
                    : 'Never'}
                </Table.Td>
                <Table.Td>
                  {user.isAdmin && (
                    <Badge color="red" size="sm">Admin</Badge>
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

