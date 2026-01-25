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
  SegmentedControl,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';
import { MetricCard } from '@/components/MetricCard';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import Link from 'next/link';

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  lastActiveAt: string | null;
  isAdmin: boolean;
}

interface Organization {
  id: string;
  name: string;
  role: string;
}

interface ApiKey {
  apiKey: string;
  firstUsed: string;
  lastUsed: string;
  requestCount: number;
}

interface UserDetails {
  user: User;
  organizations: Organization[];
  stats: {
    chartCount: number;
    dashboardCount: number;
    apiRequests30d: number;
    apiRows30d: number;
  };
  apiKeys: ApiKey[];
}

interface ApiUsageData {
  period: string;
  requestCount: number;
  rowsReturned: number;
}

export default function UserDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiUsageDays, setApiUsageDays] = useState<number>(1);
  const [apiUsageData, setApiUsageData] = useState<ApiUsageData[]>([]);
  const [apiUsageLoading, setApiUsageLoading] = useState(false);
  const [apiUsageError, setApiUsageError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/users-list?id=${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('User not found');
          } else {
            throw new Error('Failed to fetch user data');
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

    if (id) {
      fetchData();
    }
  }, [id]);

  // Fetch API usage data
  useEffect(() => {
    const fetchApiUsage = async () => {
      if (!id) return;
      
      setApiUsageLoading(true);
      setApiUsageError(null);
      
      try {
        const response = await fetch(`/api/users-list/${id}/api-usage?days=${apiUsageDays}`);
        if (!response.ok) {
          throw new Error('Failed to fetch API usage data');
        }
        const result = await response.json();
        setApiUsageData(result.data || []);
      } catch (err) {
        setApiUsageError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setApiUsageLoading(false);
      }
    };

    fetchApiUsage();
  }, [id, apiUsageDays]);

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
          title="Error loading user"
          color="red"
        >
          {error || 'User data not available'}
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

      <Group justify="space-between" mb="xl">
        <Title order={1}>
          {data.user.username}
        </Title>
        {data.user.isAdmin && (
          <Badge color="red" size="lg">Admin</Badge>
        )}
      </Group>

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="xl">
        <MetricCard
          title="Charts"
          value={data.stats.chartCount}
        />
        <MetricCard
          title="Dashboards"
          value={data.stats.dashboardCount}
        />
        <MetricCard
          title="API Requests (30d)"
          value={data.stats.apiRequests30d}
        />
        <MetricCard
          title="API Rows (30d)"
          value={data.stats.apiRows30d.toLocaleString()}
        />
      </SimpleGrid>

      {/* User Details */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Text fw={600} size="lg" mb="md">
          User Details
        </Text>
        <Table>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td fw={600}>ID</Table.Td>
              <Table.Td>{data.user.id}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Username</Table.Td>
              <Table.Td>{data.user.username}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Name</Table.Td>
              <Table.Td>
                {data.user.firstName} {data.user.lastName}
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Created</Table.Td>
              <Table.Td>{new Date(data.user.createdAt).toLocaleString()}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Last Active</Table.Td>
              <Table.Td>
                {data.user.lastActiveAt
                  ? new Date(data.user.lastActiveAt).toLocaleString()
                  : 'Never'}
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Organizations */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Text fw={600} size="lg" mb="md">
          Organizations ({data.organizations.length})
        </Text>
        {data.organizations.length === 0 ? (
          <Text c="dimmed">User is not a member of any organizations</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Role</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.organizations.map((org) => (
                <Table.Tr key={org.id}>
                  <Table.Td>
                    <Anchor component={Link} href={`/organizations/${org.id}`}>
                      {org.name}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light">{org.role}</Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      {/* API Usage */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Group justify="space-between" mb="md">
          <Text fw={600} size="lg">
            API Usage
          </Text>
          <SegmentedControl
            value={apiUsageDays.toString()}
            onChange={(value) => setApiUsageDays(parseInt(value, 10))}
            data={[
              { label: '1 Day', value: '1' },
              { label: '7 Days', value: '7' },
              { label: '30 Days', value: '30' },
              { label: '90 Days', value: '90' },
            ]}
          />
        </Group>
        
        {apiUsageError ? (
          <Alert color="red" title="Error">
            {apiUsageError}
          </Alert>
        ) : apiUsageLoading ? (
          <Loader />
        ) : apiUsageData.length === 0 ? (
          <Text c="dimmed">No API usage data for the selected period</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <TimeSeriesChart
              title="API Requests"
              subtitle={`Requests over last ${apiUsageDays} day${apiUsageDays > 1 ? 's' : ''}`}
              data={apiUsageData.map(d => ({
                month: d.period,
                requests: d.requestCount,
              }))}
              dataKey="requests"
              color="blue.6"
              chartType="bar"
              showMoM={false}
            />
            <TimeSeriesChart
              title="Rows Returned"
              subtitle={`Total rows returned over last ${apiUsageDays} day${apiUsageDays > 1 ? 's' : ''}`}
              data={apiUsageData.map(d => ({
                month: d.period,
                rows: d.rowsReturned,
              }))}
              dataKey="rows"
              color="green.6"
              chartType="bar"
              showMoM={false}
            />
          </SimpleGrid>
        )}
      </Paper>

      {/* API Keys */}
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Text fw={600} size="lg" mb="md">
          API Keys ({data.apiKeys.length})
        </Text>
        {data.apiKeys.length === 0 ? (
          <Text c="dimmed">User has not created any API keys</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>API Key</Table.Th>
                <Table.Th>First Used</Table.Th>
                <Table.Th>Last Used</Table.Th>
                <Table.Th ta="right">Requests</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.apiKeys.map((key, index) => (
                <Table.Tr key={index}>
                  <Table.Td>
                    <Text ff="monospace" size="sm" style={{ wordBreak: 'break-all' }}>
                      {key.apiKey}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {new Date(key.firstUsed).toLocaleString()}
                  </Table.Td>
                  <Table.Td>
                    {new Date(key.lastUsed).toLocaleString()}
                  </Table.Td>
                  <Table.Td ta="right">
                    {key.requestCount.toLocaleString()}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
    </Container>
  );
}

