'use client';

import { useMemo, useState } from 'react';
import {
  Container,
  Title,
  Paper,
  Text,
  Anchor,
  Loader,
  Stack,
  Alert,
  Badge,
  Tabs,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { useFilter } from '@/contexts/FilterContext';
import { SubscriptionListRowItem, SubscriptionsResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { UserHoverCard } from '@/components/UserHoverCard';
import { DataTable, Column } from './DataTable';

export function SubscriptionsView() {
  const { timezone } = useFilter();
  const url = '/api/subscriptions';
  const { data, loading, error } = useApiData<SubscriptionsResponse>(url, [url]);
  const subscriptions = data?.subscriptions ?? [];

  const [activeTab, setActiveTab] = useState<string>('all');

  const statusTabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of subscriptions) {
      const status = s.status || '—';
      counts.set(status, (counts.get(status) || 0) + 1);
    }
    const statuses = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b));
    return { statuses, counts };
  }, [subscriptions]);

  const columns: Column<SubscriptionListRowItem>[] = [
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
      id: 'plan',
      header: 'Plan',
      align: 'left',
      render: (row) =>
        row.planId != null ? (
          <Anchor component={Link} href={`/plans/${row.planId}`}>
            {row.planName ?? `Plan ${row.planId}`}
          </Anchor>
        ) : (
          '—'
        ),
      sortValue: (row) => (row.planName ?? String(row.planId ?? '')).toLowerCase(),
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
      <Title order={1} mb="xl">
        Subscriptions
      </Title>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error loading subscriptions"
          color="red"
          mb="md"
        >
          {error}
        </Alert>
      )}

      <Paper shadow="sm" p="md" radius="md" withBorder>
        {loading ? (
          <Stack align="center" py="xl">
            <Loader />
          </Stack>
        ) : (
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
                columns={columns}
                keyField="id"
                defaultSort={{ column: 'startDate', direction: 'desc' }}
                emptyMessage="No subscriptions found"
              />
            </Tabs.Panel>
            {statusTabs.statuses.map((status) => (
              <Tabs.Panel key={status} value={status}>
                <DataTable
                  data={subscriptions.filter((s) => (s.status || '—') === status)}
                  columns={columns}
                  keyField="id"
                  defaultSort={{ column: 'startDate', direction: 'desc' }}
                  emptyMessage={`No ${status} subscriptions`}
                />
              </Tabs.Panel>
            ))}
          </Tabs>
        )}
        <Text size="xs" c="dimmed" mt="md">
          Showing up to 100 subscriptions. Click column headers to sort.
        </Text>
      </Paper>
    </Container>
  );
}
