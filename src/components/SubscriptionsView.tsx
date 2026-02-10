'use client';

import { useMemo } from 'react';
import {
  Container,
  Title,
  Paper,
  Text,
  Anchor,
  Loader,
  Stack,
  Badge,
  MultiSelect,
  Group,
  SimpleGrid,
  Skeleton,
} from '@mantine/core';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { useQueryState, parseAsArrayOf, parseAsString } from 'nuqs';
import { useFilterStore } from '@/stores/filterStore';
import { SubscriptionListRowItem, SubscriptionsResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { UserHoverCard } from '@/components/UserHoverCard';
import { DataTable, Column } from './DataTable';
import { PageBreadcrumbs } from './PageBreadcrumbs';
import { MetricCard } from './MetricCard';
import { ErrorDisplay } from './ErrorDisplay';

export function SubscriptionsView() {
  const timezone = useFilterStore((s) => s.timezone);
  const url = useApiUrl('/api/subscriptions', {});
  const { data, loading, error } = useApiData<SubscriptionsResponse>(url, [url]);
  const subscriptions = data?.subscriptions ?? [];

  const [statusFilter, setStatusFilter] = useQueryState('status', parseAsArrayOf(parseAsString).withDefault([]));
  const [planFilter, setPlanFilter] = useQueryState('plan', parseAsArrayOf(parseAsString).withDefault([]));

  // Build filter options from data
  const { statusOptions, planOptions, statusCounts, planCounts } = useMemo(() => {
    const statusMap = new Map<string, number>();
    const planMap = new Map<string, number>();

    for (const s of subscriptions) {
      const status = s.status || '—';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);

      const plan = s.planName || '—';
      planMap.set(plan, (planMap.get(plan) || 0) + 1);
    }

    const statusOpts = Array.from(statusMap.keys())
      .sort((a, b) => a.localeCompare(b))
      .map((s) => ({ value: s, label: `${s} (${statusMap.get(s)})` }));

    const planOpts = Array.from(planMap.keys())
      .sort((a, b) => a.localeCompare(b))
      .map((p) => ({ value: p, label: `${p} (${planMap.get(p)})` }));

    return {
      statusOptions: statusOpts,
      planOptions: planOpts,
      statusCounts: statusMap,
      planCounts: planMap,
    };
  }, [subscriptions]);

  // Apply filters
  const filtered = useMemo(() => {
    let result = subscriptions;
    if (statusFilter.length > 0) {
      result = result.filter((s) => statusFilter.includes(s.status || '—'));
    }
    if (planFilter.length > 0) {
      result = result.filter((s) => planFilter.includes(s.planName || '—'));
    }
    return result;
  }, [subscriptions, statusFilter, planFilter]);

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
      <PageBreadcrumbs items={[{ label: 'Subscriptions' }]} />
      <Title order={1} mb="xl">
        Subscriptions
      </Title>

      {loading ? (
        <Stack gap="md">
          <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} height={90} />
            ))}
          </SimpleGrid>
          <Skeleton height={400} />
        </Stack>
      ) : error ? (
        <ErrorDisplay error={error} />
      ) : (
        <>
          {/* Summary metrics */}
          <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md" mb="xl">
            <MetricCard title="Total" value={subscriptions.length} />
            {Array.from(statusCounts.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([status, count]) => (
                <MetricCard key={status} title={status} value={count} />
              ))}
          </SimpleGrid>

          {/* Filters */}
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Group mb="md" align="flex-end">
              <MultiSelect
                label="Status"
                placeholder="All statuses"
                data={statusOptions}
                value={statusFilter}
                onChange={setStatusFilter}
                clearable
                w={300}
              />
              <MultiSelect
                label="Plan"
                placeholder="All plans"
                data={planOptions}
                value={planFilter}
                onChange={setPlanFilter}
                clearable
                w={340}
              />
              {(statusFilter.length > 0 || planFilter.length > 0) && (
                <Text size="sm" c="dimmed">
                  {filtered.length.toLocaleString()} of {subscriptions.length.toLocaleString()} subscriptions
                </Text>
              )}
            </Group>

            <DataTable
              data={filtered}
              columns={columns}
              keyField="id"
              defaultSort={{ column: 'startDate', direction: 'desc' }}
              emptyMessage="No subscriptions match the selected filters"
            />

            <Text size="xs" c="dimmed" mt="md">
              Showing {filtered.length.toLocaleString()} subscriptions. Click column headers to sort.
            </Text>
          </Paper>
        </>
      )}
    </Container>
  );
}
