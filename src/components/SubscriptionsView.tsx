'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  Paper,
  Text,
  Anchor,
  Stack,
  Badge,
  Select,
  Group,
  Skeleton,
} from '@mantine/core';
import { AppContainer } from '@/components/AppContainer';
import { CustomMultiSelect } from '@/components/CustomMultiSelect';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { useQueryState, parseAsArrayOf, parseAsString, parseAsStringLiteral } from 'nuqs';
import { useFilterStore } from '@/stores/filterStore';
import { SubscriptionListItem, SubscriptionsResponse, SUBSCRIPTION_STATUSES } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { UserHoverCard } from '@/components/UserHoverCard';
import { DataTable, Column } from './DataTable';
import { PageBreadcrumbs } from './PageBreadcrumbs';
import { ErrorDisplay } from './ErrorDisplay';

export function SubscriptionsView() {
  const timezone = useFilterStore((s) => s.timezone);
  const url = useApiUrl('/api/subscriptions', {});
  const { data, loading, error } = useApiData<SubscriptionsResponse>(url, [url]);
  const subscriptions = data?.subscriptions ?? [];

  const [statusFilter, setStatusFilter] = useQueryState('status', parseAsArrayOf(parseAsString).withDefault([]));
  const [planFilter, setPlanFilter] = useQueryState('plan', parseAsArrayOf(parseAsString).withDefault([]));
  const [enforceFilter, setEnforceFilter] = useQueryState('enforce', parseAsStringLiteral(['yes', 'no'] as const).withDefault(null as unknown as 'yes'));
  const [stripeFilter, setStripeFilter] = useQueryState('stripe', parseAsStringLiteral(['yes', 'no'] as const).withDefault(null as unknown as 'yes'));

  // Default status filter: all except canceled (only on first load with no URL param)
  const didSetDefault = useRef(false);
  useEffect(() => {
    if (didSetDefault.current || subscriptions.length === 0) return;
    didSetDefault.current = true;
    if (statusFilter.length === 0) {
      const nonCanceled = Array.from(new Set(subscriptions.map((s) => s.status || '—'))).filter(
        (s) => s !== 'canceled'
      );
      if (nonCanceled.length > 0) setStatusFilter(nonCanceled);
    }
  }, [subscriptions, statusFilter, setStatusFilter]);

  // Build filter options from data
  const { statusOptions, planOptions } = useMemo(() => {
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
    if (enforceFilter === 'yes') {
      result = result.filter((s) => s.enforceApiUsageLimit);
    } else if (enforceFilter === 'no') {
      result = result.filter((s) => !s.enforceApiUsageLimit);
    }
    if (stripeFilter === 'yes') {
      result = result.filter((s) => !!s.stripeSubscriptionId);
    } else if (stripeFilter === 'no') {
      result = result.filter((s) => !s.stripeSubscriptionId);
    }
    return result;
  }, [subscriptions, statusFilter, planFilter, enforceFilter, stripeFilter]);

  const columns: Column<SubscriptionListItem>[] = [
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
      id: 'enforceApiUsageLimit',
      header: 'Enforce limit',
      align: 'center',
      render: (row) => (row.enforceApiUsageLimit ? '✓' : '—'),
      sortValue: (row) => (row.enforceApiUsageLimit ? 1 : 0),
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
      header: 'Stripe',
      align: 'center',
      render: (row) => (row.stripeSubscriptionId ? '✓' : '—'),
      sortValue: (row) => (row.stripeSubscriptionId ? 1 : 0),
    },
  ];

  return (
    <AppContainer>
      <PageBreadcrumbs items={[{ label: 'Subscriptions' }]} />

      {loading ? (
        <Stack gap="md">
          <Skeleton height={400} />
        </Stack>
      ) : error ? (
        <ErrorDisplay error={error} />
      ) : (
        <>
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Group mb="md" align="flex-end">
              <CustomMultiSelect
                label="Status"
                placeholder="All statuses"
                data={statusOptions}
                value={statusFilter}
                onChange={setStatusFilter}
                clearable
                hidePickedOptions
                w={300}
                pillsListStyle={{ maxHeight: 70, overflowY: 'auto' }}
              />
              <CustomMultiSelect
                label="Plan"
                placeholder="All plans"
                data={planOptions}
                value={planFilter}
                onChange={setPlanFilter}
                clearable
                singleLine
                w={340}
              />
              <Select
                label="Enforce limit"
                placeholder="All"
                data={[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                ]}
                value={enforceFilter}
                onChange={(v) => setEnforceFilter(v as 'yes' | 'no' | null)}
                clearable
                w={160}
              />
              <Select
                label="Stripe"
                placeholder="All"
                data={[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                ]}
                value={stripeFilter}
                onChange={(v) => setStripeFilter(v as 'yes' | 'no' | null)}
                clearable
                w={140}
              />
              {(statusFilter.length > 0 || planFilter.length > 0 || enforceFilter != null || stripeFilter != null) && (
                <Text size="sm" c="dimmed">
                  {filtered.length.toLocaleString()} of {subscriptions.length.toLocaleString()} subscriptions
                </Text>
              )}
            </Group>

            <DataTable
              data={filtered}
              columns={columns}
              keyField="id"
              defaultSort={{ column: 'billingPeriod', direction: 'desc' }}
              emptyMessage="No subscriptions match the selected filters"
            />

            <Text size="xs" c="dimmed" mt="md">
              Showing {filtered.length.toLocaleString()} subscriptions. Click column headers to sort.
            </Text>
          </Paper>
        </>
      )}
    </AppContainer>
  );
}
