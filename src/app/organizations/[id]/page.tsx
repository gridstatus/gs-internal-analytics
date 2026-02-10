'use client';

import { useParams } from 'next/navigation';
import { useApiData } from '@/hooks/useApiData';
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
  ScrollArea,
} from '@mantine/core';
import { IconAlertCircle, IconExternalLink } from '@tabler/icons-react';
import { MetricCard } from '@/components/MetricCard';
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs';
import { UserHoverCard } from '@/components/UserHoverCard';
import { DataTable, Column } from '@/components/DataTable';
import Link from 'next/link';
import type { SubscriptionListRowItem } from '@/lib/api-types';

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
  domains: string[];
  users: User[];
  potentialAdditions: PotentialAddition[];
  subscriptions: SubscriptionListRowItem[];
  stats: {
    chartCount: number;
    dashboardCount: number;
    userCount: number;
    newUsers7d: number;
    activeUsers7d: number;
  };
}

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${diffYears}y ago`;
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const url = id ? `/api/organizations?id=${id}` : null;
  const { data, loading, error } = useApiData<OrganizationDetails>(url, [id]);

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
          title="Error loading organization"
          color="red"
        >
          {error || 'Organization data not available'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid py="xl">
      <PageBreadcrumbs
        items={[
          { label: 'Organizations', href: '/organizations' },
          { label: data.organization.name },
        ]}
      />
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

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md" mb="xl">
        {/* Organization Details */}
        <Paper shadow="sm" p="md" radius="md" withBorder>
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
                <Table.Td fw={600}>Subscriptions</Table.Td>
                <Table.Td>
                  {(data.subscriptions ?? []).length > 0 ? (
                    <Stack gap={2}>
                      {data.subscriptions.map((sub) => (
                        <Anchor key={sub.id} component={Link} href={`/subscriptions/${sub.id}`} size="sm">
                          #{sub.id} – {sub.planName ?? 'Unknown plan'} ({sub.status})
                        </Anchor>
                      ))}
                    </Stack>
                  ) : (
                    <Text size="sm" c="dimmed">No subscriptions</Text>
                  )}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Created</Table.Td>
                <Table.Td>{new Date(data.organization.createdAt).toLocaleDateString()} ({timeAgo(data.organization.createdAt)})</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Updated</Table.Td>
                <Table.Td>{new Date(data.organization.updatedAt).toLocaleDateString()} ({timeAgo(data.organization.updatedAt)})</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Domains</Table.Td>
                <Table.Td>
                  {data.domains && data.domains.length > 0 ? (
                    <Group gap="xs">
                      {data.domains.map((domain) => (
                        <Anchor
                          key={domain}
                          component={Link}
                          href={`/domains/${encodeURIComponent(domain)}`}
                          size="sm"
                        >
                          {domain}
                        </Anchor>
                      ))}
                    </Group>
                  ) : (
                    <Text size="sm" c="dimmed">
                      No email domains
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Paper>

        {/* Users */}
        <Paper shadow="sm" p="md" radius="md" withBorder style={{ gridColumn: 'span 2', maxHeight: 500, display: 'flex', flexDirection: 'column' }}>
          <Text fw={600} size="lg" mb="md">
            Users ({data.users.length})
          </Text>
          <ScrollArea style={{ flex: 1 }} scrollbarSize={8} type="always">
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
                id: 'role',
                header: 'Role',
                align: 'left',
                render: (row) => <Badge variant="light">{row.role}</Badge>,
                sortValue: (row) => row.role.toLowerCase(),
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
            ]}
            keyField="id"
            defaultSort={{ column: 'lastActiveAt', direction: 'desc' }}
            emptyMessage="No users in this organization"
          />
          </ScrollArea>
        </Paper>
      </SimpleGrid>

      {/* Potential Additions */}
      {data.potentialAdditions && data.potentialAdditions.length > 0 && (
        <Paper id="potential-additions" shadow="sm" p="md" radius="md" withBorder>
          <Text fw={600} size="lg" mb="md">
            Potential Additions ({data.potentialAdditions.length})
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            Users who share a domain with organization members but aren't in the organization
          </Text>
          <DataTable
            data={data.potentialAdditions}
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
                id: 'domain',
                header: 'Domain',
                align: 'left',
                render: (row) => <Badge variant="light" color="blue">{row.domain}</Badge>,
                sortValue: (row) => row.domain.toLowerCase(),
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
            ]}
            keyField="id"
          />
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

