'use client';

import {
  Paper,
  Text,
  Anchor,
  Stack,
  SimpleGrid,
  Badge,
  Group,
  Skeleton,
} from '@mantine/core';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { useFilterStore } from '@/stores/filterStore';
import { TrialsResponse, SubscriptionListItem, SubscriptionMonitorActiveTrialItem } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { AppContainer } from '@/components/AppContainer';
import { UserHoverCard } from '@/components/UserHoverCard';
import { DataTable, Column } from './DataTable';
import { PageBreadcrumbs } from './PageBreadcrumbs';
import { ErrorDisplay } from './ErrorDisplay';

export function TrialsView() {
  const timezone = useFilterStore((s) => s.timezone);
  const url = useApiUrl('/api/subscriptions/trials', {});
  const { data, loading, error } = useApiData<TrialsResponse>(url, [url]);
  const selfService = data?.selfService ?? [];
  const enterprise = data?.enterprise ?? [];

  const selfServiceColumns: Column<SubscriptionListItem>[] = [
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
      render: (row) =>
        row.userId != null ? (
          <UserHoverCard userId={row.userId} userName={row.username ?? `User ${row.userId}`} />
        ) : (
          '—'
        ),
      sortValue: (row) => row.username?.toLowerCase() ?? '',
    },
    {
      id: 'organization',
      header: 'Organization',
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
      render: (row) => <Badge variant="light">{row.status}</Badge>,
      sortValue: (row) => row.status.toLowerCase(),
    },
    {
      id: 'billingPeriod',
      header: 'Billing period end',
      render: (row) =>
        row.currentBillingPeriodEnd
          ? DateTime.fromISO(row.currentBillingPeriodEnd).setZone(timezone).toLocaleString(DateTime.DATE_SHORT)
          : '—',
      sortValue: (row) => (row.currentBillingPeriodEnd ? new Date(row.currentBillingPeriodEnd).getTime() : 0),
    },
    {
      id: 'stripeSubscriptionId',
      header: 'Stripe',
      render: (row) => row.stripeSubscriptionId ?? '—',
      sortValue: (row) => row.stripeSubscriptionId ?? '',
    },
  ];

  const enterpriseColumns: Column<SubscriptionMonitorActiveTrialItem>[] = [
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
      render: (row) =>
        row.userId != null ? (
          <UserHoverCard userId={row.userId} userName={row.username ?? `User ${row.userId}`} />
        ) : (
          row.username ?? '—'
        ),
      sortValue: (row) => row.username?.toLowerCase() ?? '',
    },
    {
      id: 'organization',
      header: 'Organization',
      render: (row) => row.organizationName ?? '—',
      sortValue: (row) => (row.organizationName ?? '').toLowerCase(),
    },
    {
      id: 'status',
      header: 'Status',
      render: (row) => <Badge variant="light">{row.status}</Badge>,
      sortValue: (row) => row.status.toLowerCase(),
    },
    {
      id: 'pastEndDate',
      header: 'Past end date',
      align: 'center',
      render: (row) => (row.pastEndDate ? '✓' : '—'),
      sortValue: (row) => (row.pastEndDate ? 1 : 0),
    },
  ];

  return (
    <AppContainer>
      <PageBreadcrumbs
        items={[
          { label: 'Subscriptions', href: '/subscriptions' },
          { label: 'Trials' },
        ]}
      />

      {loading ? (
        <Stack gap="md">
          <Skeleton height={200} />
          <Skeleton height={200} />
        </Stack>
      ) : error ? (
        <ErrorDisplay error={error} />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Text fw={600} size="lg" mb={4}>
              Self-service trials
            </Text>
            <Text size="sm" c="dimmed" mb="md">
              Trialing subscriptions with a Stripe subscription ID.
            </Text>
            <DataTable
              data={selfService}
              columns={selfServiceColumns}
              keyField="id"
              defaultSort={{ column: 'billingPeriod', direction: 'desc' }}
              emptyMessage="No self-service trials"
            />
            <Text size="xs" c="dimmed" mt="md">
              {selfService.length.toLocaleString()} subscription{selfService.length !== 1 ? 's' : ''}
            </Text>
          </Paper>

          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Text fw={600} size="lg" mb={4}>
              Enterprise trials
            </Text>
            <Text size="sm" c="dimmed" mb="md">
              Trialing subscriptions with no Stripe ID (manually configured).
            </Text>
            <DataTable
              data={enterprise}
              columns={enterpriseColumns}
              keyField="id"
              defaultSort={{ column: 'id', direction: 'asc' }}
              emptyMessage="No enterprise trials"
            />
            <Text size="xs" c="dimmed" mt="md">
              {enterprise.length.toLocaleString()} subscription{enterprise.length !== 1 ? 's' : ''}
            </Text>
          </Paper>
        </SimpleGrid>
      )}
    </AppContainer>
  );
}
