'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Button,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconExternalLink } from '@tabler/icons-react';
import { MetricCard } from '@/components/MetricCard';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  lastActiveAt: string | null;
}

interface PotentialAddition {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  domain: string;
  createdAt: string;
  lastActiveAt: string | null;
}

interface OrganizationDetails {
  organization: Organization;
  users: User[];
  potentialAdditions: PotentialAddition[];
  stats: {
    chartCount: number;
    dashboardCount: number;
    userCount: number;
    newUsers7d: number;
    activeUsers7d: number;
  };
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<OrganizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/organizations?id=${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Organization not found');
          } else {
            throw new Error('Failed to fetch organization data');
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
          title="Error loading organization"
          color="red"
        >
          {error || 'Organization data not available'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Group mb="xl">
        <Anchor
          component={Link}
          href="/organizations"
          size="sm"
          c="dimmed"
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <IconArrowLeft size={16} />
          Back to Organizations
        </Anchor>
      </Group>

      <Group justify="space-between" mb="xl">
        <Title order={1}>
          {data.organization.name}
        </Title>
        <Button
          component="a"
          href={`https://dashboard.clerk.com/apps/app_2IMRywc1hPChiNOSh8b9KZqUW7Q/instances/ins_2L4cECyyYvS7ZKGFX6N3KnHeB1h/organizations/${data.organization.id}`}
          target="_blank"
          rel="noopener noreferrer"
          leftSection={<IconExternalLink size={16} />}
          variant="light"
        >
          Open in Clerk
        </Button>
      </Group>

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 6 }} spacing="md" mb="xl">
        <MetricCard
          title="Users"
          value={data.stats.userCount}
        />
        <MetricCard
          title="New (7d)"
          value={data.stats.newUsers7d}
        />
        <MetricCard
          title="Active (7d)"
          value={data.stats.activeUsers7d}
        />
        <MetricCard
          title="Charts"
          value={data.stats.chartCount}
        />
        <MetricCard
          title="Dashboards"
          value={data.stats.dashboardCount}
        />
        {data.potentialAdditions && data.potentialAdditions.length > 0 && (
          <Paper shadow="sm" p="md" radius="md" withBorder style={{ position: 'relative' }}>
            <Text size="sm" fw={500} mb={4} c="dimmed">
              Potential Additions
            </Text>
            <Text size="xl" fw={700} mb="xs">
              {data.potentialAdditions.length}
            </Text>
            <Button
              size="xs"
              variant="light"
              onClick={() => {
                document.getElementById('potential-additions')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              View All
            </Button>
          </Paper>
        )}
      </SimpleGrid>

      {/* Organization Details */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Text fw={600} size="lg" mb="md">
          Organization Details
        </Text>
        <Table>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td fw={600}>ID</Table.Td>
              <Table.Td>{data.organization.id}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Created</Table.Td>
              <Table.Td>{new Date(data.organization.createdAt).toLocaleString()}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Updated</Table.Td>
              <Table.Td>{new Date(data.organization.updatedAt).toLocaleString()}</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Users */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Text fw={600} size="lg" mb="md">
          Users ({data.users.length})
        </Text>
        {data.users.length === 0 ? (
          <Text c="dimmed">No users in this organization</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Username</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Last Active</Table.Th>
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
                    <Badge variant="light">{user.role}</Badge>
                  </Table.Td>
                  <Table.Td>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </Table.Td>
                  <Table.Td>
                    {user.lastActiveAt
                      ? new Date(user.lastActiveAt).toLocaleDateString()
                      : 'Never'}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      {/* Potential Additions */}
      {data.potentialAdditions && data.potentialAdditions.length > 0 && (
        <Paper id="potential-additions" shadow="sm" p="md" radius="md" withBorder>
          <Text fw={600} size="lg" mb="md">
            Potential Additions ({data.potentialAdditions.length})
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            Users who share a domain with organization members but aren't in the organization
          </Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Username</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Domain</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Last Active</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.potentialAdditions.map((user) => (
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
                    <Badge variant="light" color="blue">
                      {user.domain}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </Table.Td>
                  <Table.Td>
                    {user.lastActiveAt
                      ? new Date(user.lastActiveAt).toLocaleDateString()
                      : 'Never'}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          {data.potentialAdditions.length >= 100 && (
            <Text size="xs" c="dimmed" mt="md">
              Showing first 100 potential additions
            </Text>
          )}
        </Paper>
      )}
    </Container>
  );
}

