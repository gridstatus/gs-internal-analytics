'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useApiData } from '@/hooks/useApiData';
import {
  Container,
  Title,
  Paper,
  Text,
  Group,
  Table,
  Loader,
  Alert,
  Stack,
  Anchor,
  Badge,
  Tabs,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
import { useFilter } from '@/contexts/FilterContext';
import { DateTime } from 'luxon';
import { PlanDetailResponse } from '@/lib/api-types';
import { UserHoverCard } from '@/components/UserHoverCard';
import { DataTable, Column } from '@/components/DataTable';
import type { SubscriptionListItem } from '@/lib/api-types';

function formatLimit(value: number | null): string {
  if (value === null) return '—';
  return value.toLocaleString();
}

export default function PlanDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { timezone } = useFilter();

  const url = id ? `/api/plans/${id}` : null;
  const { data, loading, error } = useApiData<PlanDetailResponse>(url, [id]);

  const [activeTab, setActiveTab] = useState<string>('all');

  const subscriptions = data?.subscriptions ?? [];
  const statusTabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of subscriptions) {
      const status = s.status || '—';
      counts.set(status, (counts.get(status) || 0) + 1);
    }
    const statuses = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b));
    return { statuses, counts };
  }, [subscriptions]);

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
          title="Error loading plan"
          color="red"
        >
          {error || 'Plan data not available'}
        </Alert>
      </Container>
    );
  }

  const { plan } = data;

  const limitRows: { label: string; value: string }[] = [
    { label: 'API rows returned limit', value: formatLimit(plan.apiRowsReturnedLimit) },
    { label: 'API requests limit', value: formatLimit(plan.apiRequestsLimit) },
    { label: 'API rows per response limit', value: formatLimit(plan.apiRowsPerResponseLimit) },
    { label: 'Alerts limit', value: formatLimit(plan.alertsLimit) },
    { label: 'Dashboards limit', value: formatLimit(plan.dashboardsLimit) },
    { label: 'Downloads limit', value: formatLimit(plan.downloadsLimit) },
    { label: 'Charts limit', value: formatLimit(plan.chartsLimit) },
    { label: 'Per second API rate limit', value: formatLimit(plan.perSecondApiRateLimit) },
    { label: 'Per minute API rate limit', value: formatLimit(plan.perMinuteApiRateLimit) },
    { label: 'Per hour API rate limit', value: formatLimit(plan.perHourApiRateLimit) },
  ];

  const subscriptionColumns: Column<SubscriptionListItem>[] = [
    {
      id: 'id',
      header: 'Id',
      align: 'right',
      render: (row) => (
        <Anchor component={Link} href={`/subscriptions/${row.id}`}>
          {row.id}
        </Anchor>
      ),
      sortValue: (row) => row.id,
    },
    {
      id: 'user',
      header: 'User',
      align: 'left',
      render: (row) =>
        row.userId != null ? (
          <UserHoverCard
            userId={row.userId}
            userName={row.username ?? `User ${row.userId}`}
          />
        ) : (
          '—'
        ),
      sortValue: (row) => row.username?.toLowerCase() ?? (row.userId ?? 0),
    },
    {
      id: 'organization',
      header: 'Organization',
      align: 'left',
      render: (row) =>
        row.organizationId ? (
          <Anchor component={Link} href={`/organizations/${row.organizationId}`}>
            {row.organizationName ?? row.organizationId}
          </Anchor>
        ) : (
          '—'
        ),
      sortValue: (row) => (row.organizationName ?? row.organizationId ?? '').toLowerCase(),
    },
    {
      id: 'status',
      header: 'Status',
      align: 'left',
      render: (row) => <Badge variant="light">{row.status}</Badge>,
      sortValue: (row) => row.status.toLowerCase(),
    },
    {
      id: 'startDate',
      header: 'Start date',
      align: 'left',
      render: (row) =>
        DateTime.fromISO(row.startDate).setZone(timezone).toLocaleString(DateTime.DATETIME_SHORT),
      sortValue: (row) => new Date(row.startDate).getTime(),
    },
    {
      id: 'billingPeriod',
      header: 'Billing period',
      align: 'left',
      render: (row) =>
        `${DateTime.fromISO(row.currentBillingPeriodStart).setZone(timezone).toLocaleString(DateTime.DATE_SHORT)} – ${row.currentBillingPeriodEnd ? DateTime.fromISO(row.currentBillingPeriodEnd).setZone(timezone).toLocaleString(DateTime.DATE_SHORT) : '—'}`,
      sortValue: (row) => new Date(row.currentBillingPeriodStart).getTime(),
    },
    {
      id: 'stripeSubscriptionId',
      header: 'Stripe subscription',
      align: 'left',
      render: (row) => row.stripeSubscriptionId ?? '—',
      sortValue: (row) => row.stripeSubscriptionId ?? '',
    },
  ];

  return (
    <Container fluid py="xl">
      <Group mb="xl">
        <Anchor
          component={Link}
          href="/plans"
          size="sm"
          c="dimmed"
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <IconArrowLeft size={16} />
          Back to Plans
        </Anchor>
      </Group>

      <Title order={1} mb="xl">
        {plan.planName} (ID: {plan.id})
      </Title>

      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Text fw={600} size="lg" mb="md">
          Plan limits
        </Text>
        <Table>
          <Table.Tbody>
            {limitRows.map(({ label, value }) => (
              <Table.Tr key={label}>
                <Table.Td fw={600}>{label}</Table.Td>
                <Table.Td>{value}</Table.Td>
              </Table.Tr>
            ))}
            {plan.entitlements != null && plan.entitlements.length > 0 && (
              <Table.Tr>
                <Table.Td fw={600}>Entitlements</Table.Td>
                <Table.Td>{plan.entitlements.join(', ')}</Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Text fw={600} size="lg" mb="md">
          Subscriptions ({subscriptions.length})
        </Text>
        <Tabs value={activeTab} onChange={(v) => setActiveTab(v ?? 'all')}>
          <Tabs.List mb="md">
            <Tabs.Tab value="all">
              All ({subscriptions.length})
            </Tabs.Tab>
            {statusTabs.statuses.map((status) => (
              <Tabs.Tab key={status} value={status}>
                {status} ({statusTabs.counts.get(status) ?? 0})
              </Tabs.Tab>
            ))}
          </Tabs.List>
          <Tabs.Panel value="all">
            <DataTable
              data={subscriptions}
              columns={subscriptionColumns}
              keyField="id"
              defaultSort={{ column: 'startDate', direction: 'desc' }}
              emptyMessage="No subscriptions for this plan"
            />
          </Tabs.Panel>
          {statusTabs.statuses.map((status) => (
            <Tabs.Panel key={status} value={status}>
              <DataTable
                data={subscriptions.filter((s) => (s.status || '—') === status)}
                columns={subscriptionColumns}
                keyField="id"
                defaultSort={{ column: 'startDate', direction: 'desc' }}
                emptyMessage={`No ${status} subscriptions`}
              />
            </Tabs.Panel>
          ))}
        </Tabs>
        {subscriptions.length >= 100 && (
          <Text size="xs" c="dimmed" mt="md">
            Showing first 100 subscriptions
          </Text>
        )}
      </Paper>
    </Container>
  );
}
