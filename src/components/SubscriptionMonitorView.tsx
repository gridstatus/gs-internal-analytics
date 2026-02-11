'use client';

import { useState, useMemo } from 'react';
import {
  Paper,
  Text,
  Anchor,
  Stack,
  SimpleGrid,
  Badge,
  Group,
  Skeleton,
  TextInput,
  Checkbox,
  ScrollArea,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { useFilterStore } from '@/stores/filterStore';
import {
  SubscriptionMonitorResponse,
  SubscriptionMonitorLimitNotEnforcedItem,
  SubscriptionMonitorActiveTrialItem,
  SubscriptionListItem,
} from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { AppContainer } from '@/components/AppContainer';
import { UserHoverCard } from '@/components/UserHoverCard';
import { DataTable, Column } from './DataTable';
import { PageBreadcrumbs } from './PageBreadcrumbs';
import { ErrorDisplay } from './ErrorDisplay';

const LIMIT_NOT_ENFORCED_DESCRIPTION =
  'Subscriptions where the API usage limit is not enforced and the subscription is not canceled.';

const ACTIVE_TRIALS_DESCRIPTION =
  'Trialing subscriptions that have no Stripe subscription ID (manually configured trials). If "Past end date" is checked, the billing period end date has already passed.';

const PAST_BILLING_DESCRIPTION =
  'Subscriptions whose current billing period has already ended, excluding canceled and incomplete_expired. Sorted by billing period end date (oldest first).';

const TABLE_MAX_HEIGHT = 360;

function filterBySearch<T extends { username?: string | null; organizationName?: string | null }>(
  rows: T[],
  search: string
): T[] {
  if (!search.trim()) return rows;
  const q = search.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (row.username ?? '').toLowerCase().includes(q) ||
      (row.organizationName ?? '').toLowerCase().includes(q)
  );
}

export function SubscriptionMonitorView() {
  const timezone = useFilterStore((s) => s.timezone);
  const url = useApiUrl('/api/subscriptions/monitor', {});
  const { data, loading, error } = useApiData<SubscriptionMonitorResponse>(url, [url]);

  const [searchLimitNotEnforced, setSearchLimitNotEnforced] = useState('');
  const [searchActiveTrials, setSearchActiveTrials] = useState('');
  const [searchPastBilling, setSearchPastBilling] = useState('');

  const limitNotEnforced = data?.limitNotEnforced ?? [];
  const activeTrials = data?.activeTrials ?? [];
  const pastBillingPeriod = data?.pastBillingPeriod ?? [];

  const filteredLimitNotEnforced = useMemo(
    () => filterBySearch(limitNotEnforced, searchLimitNotEnforced),
    [limitNotEnforced, searchLimitNotEnforced]
  );
  const filteredActiveTrials = useMemo(
    () => filterBySearch(activeTrials, searchActiveTrials),
    [activeTrials, searchActiveTrials]
  );
  const filteredPastBilling = useMemo(
    () => filterBySearch(pastBillingPeriod, searchPastBilling).slice(0, 100),
    [pastBillingPeriod, searchPastBilling]
  );

  const limitNotEnforcedColumns: Column<SubscriptionMonitorLimitNotEnforcedItem>[] = [
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
          row.username ?? '—'
        ),
      sortValue: (row) => row.username?.toLowerCase() ?? '',
    },
    {
      id: 'organization',
      header: 'Organization',
      align: 'left',
      render: (row) => row.organizationName ?? '—',
      sortValue: (row) => (row.organizationName ?? '').toLowerCase(),
    },
  ];

  const activeTrialsColumns: Column<SubscriptionMonitorActiveTrialItem>[] = [
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
          row.username ?? '—'
        ),
      sortValue: (row) => row.username?.toLowerCase() ?? '',
    },
    {
      id: 'organization',
      header: 'Organization',
      align: 'left',
      render: (row) => row.organizationName ?? '—',
      sortValue: (row) => (row.organizationName ?? '').toLowerCase(),
    },
    {
      id: 'status',
      header: 'Status',
      align: 'left',
      render: (row) => <Badge variant="light">{row.status}</Badge>,
      sortValue: (row) => row.status.toLowerCase(),
    },
    {
      id: 'pastEndDate',
      header: 'Past end date',
      align: 'center',
      render: (row) => <Checkbox checked={row.pastEndDate} readOnly />,
      sortValue: (row) => (row.pastEndDate ? 1 : 0),
    },
  ];

  const pastBillingColumns: Column<SubscriptionListItem>[] = [
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
          row.username ?? '—'
        ),
      sortValue: (row) => row.username?.toLowerCase() ?? '',
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
      id: 'startDate',
      header: 'Start date',
      align: 'left',
      render: (row) =>
        row.startDate
          ? DateTime.fromISO(row.startDate).setZone(timezone).toLocaleString(DateTime.DATE_SHORT)
          : '—',
      sortValue: (row) => new Date(row.startDate).getTime(),
    },
    {
      id: 'stripeSubscriptionId',
      header: 'Stripe',
      align: 'left',
      render: (row) => row.stripeSubscriptionId ?? '—',
      sortValue: (row) => row.stripeSubscriptionId ?? '',
    },
    {
      id: 'createdAt',
      header: 'Created at',
      align: 'left',
      render: (row) =>
        row.createdAt
          ? DateTime.fromISO(row.createdAt).setZone(timezone).toLocaleString(DateTime.DATETIME_SHORT)
          : '—',
      sortValue: (row) => (row.createdAt ? new Date(row.createdAt).getTime() : 0),
    },
    {
      id: 'status',
      header: 'Status',
      align: 'left',
      render: (row) => <Badge variant="light">{row.status}</Badge>,
      sortValue: (row) => row.status.toLowerCase(),
    },
  ];

  if (loading) {
    return (
      <AppContainer>
        <PageBreadcrumbs
          items={[{ label: 'Subscriptions', href: '/subscriptions' }, { label: 'Subscription Monitor' }]}
        />
        <Stack gap="md">
          <Skeleton height={80} />
          <Skeleton height={280} />
          <Skeleton height={280} />
          <Skeleton height={280} />
        </Stack>
      </AppContainer>
    );
  }

  if (error) {
    return (
      <AppContainer>
        <PageBreadcrumbs
          items={[{ label: 'Subscriptions', href: '/subscriptions' }, { label: 'Subscription Monitor' }]}
        />
        <ErrorDisplay error={error} />
      </AppContainer>
    );
  }

  return (
    <AppContainer>
      <PageBreadcrumbs
        items={[{ label: 'Subscriptions', href: '/subscriptions' }, { label: 'Subscription Monitor' }]}
      />

      <SimpleGrid cols={{ base: 1, sm: 2 }} gap="xl">
        <Paper shadow="sm" p="md" radius="md" withBorder style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Text fw={600} size="lg" mb={4}>
            Limit not enforced
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            {LIMIT_NOT_ENFORCED_DESCRIPTION}
          </Text>
          <Group mb="md">
            <TextInput
              placeholder="Search..."
              leftSection={<IconSearch size={16} />}
              value={searchLimitNotEnforced}
              onChange={(e) => setSearchLimitNotEnforced(e.currentTarget.value)}
              style={{ width: '100%', maxWidth: 300 }}
            />
          </Group>
          <ScrollArea.Autosize mah={TABLE_MAX_HEIGHT} type="scroll" style={{ flex: 1, minHeight: 0 }}>
            <DataTable
              data={filteredLimitNotEnforced}
              columns={limitNotEnforcedColumns}
              keyField="id"
              emptyMessage="No subscriptions"
            />
          </ScrollArea.Autosize>
        </Paper>

        <Paper shadow="sm" p="md" radius="md" withBorder style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Text fw={600} size="lg" mb={4}>
            Active enterprise trials
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            {ACTIVE_TRIALS_DESCRIPTION}
          </Text>
          <Group mb="md">
            <TextInput
              placeholder="Search..."
              leftSection={<IconSearch size={16} />}
              value={searchActiveTrials}
              onChange={(e) => setSearchActiveTrials(e.currentTarget.value)}
              style={{ width: '100%', maxWidth: 300 }}
            />
          </Group>
          <ScrollArea.Autosize mah={TABLE_MAX_HEIGHT} type="scroll" style={{ flex: 1, minHeight: 0 }}>
            <DataTable
              data={filteredActiveTrials}
              columns={activeTrialsColumns}
              keyField="id"
              emptyMessage="No subscriptions"
            />
          </ScrollArea.Autosize>
        </Paper>

        <Paper shadow="sm" p="md" radius="md" withBorder style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Text fw={600} size="lg" mb={4}>
            Past current_billing_period_end
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            {PAST_BILLING_DESCRIPTION}
          </Text>
          <Group mb="md">
            <TextInput
              placeholder="Search..."
              leftSection={<IconSearch size={16} />}
              value={searchPastBilling}
              onChange={(e) => setSearchPastBilling(e.currentTarget.value)}
              style={{ width: '100%', maxWidth: 300 }}
            />
          </Group>
          <ScrollArea.Autosize mah={TABLE_MAX_HEIGHT} type="scroll" style={{ flex: 1, minHeight: 0 }}>
            <DataTable
              data={filteredPastBilling}
              columns={pastBillingColumns}
              keyField="id"
              defaultSort={{ column: 'startDate', direction: 'asc' }}
              emptyMessage="No subscriptions"
            />
          </ScrollArea.Autosize>
          <Text size="xs" c="dimmed" mt="md">
            Showing up to 100 subscriptions.
          </Text>
        </Paper>
      </SimpleGrid>
    </AppContainer>
  );
}
