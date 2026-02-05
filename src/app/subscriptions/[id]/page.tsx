'use client';

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
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import Link from 'next/link';
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs';
import { useFilter } from '@/contexts/FilterContext';
import { DateTime } from 'luxon';
import { SubscriptionDetailResponse } from '@/lib/api-types';
import { UserHoverCard } from '@/components/UserHoverCard';

function formatOverride(value: number | null): string {
  if (value === null) return '—';
  return value.toLocaleString();
}

export default function SubscriptionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { timezone } = useFilter();

  const url = id ? `/api/subscriptions/${id}` : null;
  const { data, loading, error } = useApiData<SubscriptionDetailResponse>(url, [id]);

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
          title="Error loading subscription"
          color="red"
        >
          {error || 'Subscription data not available'}
        </Alert>
      </Container>
    );
  }

  const { subscription: sub } = data;

  const overrideRows: { label: string; value: string }[] = [
    { label: 'API rows returned', value: formatOverride(sub.apiRowsReturnedLimitOverride) },
    { label: 'API requests', value: formatOverride(sub.apiRequestsLimitOverride) },
    { label: 'API rows per response', value: formatOverride(sub.apiRowsPerResponseLimitOverride) },
    { label: 'Alerts', value: formatOverride(sub.alertsLimitOverride) },
    { label: 'Dashboards', value: formatOverride(sub.dashboardsLimitOverride) },
    { label: 'Downloads', value: formatOverride(sub.downloadsLimitOverride) },
    { label: 'Charts', value: formatOverride(sub.chartsLimitOverride) },
    { label: 'Per second API rate', value: formatOverride(sub.perSecondApiRateLimitOverride) },
    { label: 'Per minute API rate', value: formatOverride(sub.perMinuteApiRateLimitOverride) },
    { label: 'Per hour API rate', value: formatOverride(sub.perHourApiRateLimitOverride) },
  ];

  return (
    <Container fluid py="xl">
      <PageBreadcrumbs
        items={[
          { label: 'Subscriptions', href: '/subscriptions' },
          { label: `Subscription #${sub.id}` },
        ]}
      />
      <Title order={1} mb="xl">
        Subscription #{sub.id}
      </Title>

      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Text fw={600} size="lg" mb="md">
          Details
        </Text>
        <Table>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td fw={600}>User</Table.Td>
              <Table.Td>
                {sub.userId != null ? (
                  <UserHoverCard
                    userId={sub.userId}
                    userName={sub.username ?? `User ${sub.userId}`}
                  />
                ) : (
                  '—'
                )}
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Organization</Table.Td>
              <Table.Td>
                {sub.organizationId ? (
                  <Anchor component={Link} href={`/organizations/${sub.organizationId}`}>
                    {sub.organizationName ?? sub.organizationId}
                  </Anchor>
                ) : (
                  '—'
                )}
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Plan</Table.Td>
              <Table.Td>
                {sub.planId != null ? (
                  <Anchor component={Link} href={`/plans/${sub.planId}`}>
                    {sub.planName ?? `Plan ${sub.planId}`}
                  </Anchor>
                ) : (
                  '—'
                )}
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Status</Table.Td>
              <Table.Td>
                <Badge variant="light">{sub.status}</Badge>
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Start date</Table.Td>
              <Table.Td>
                {DateTime.fromISO(sub.startDate).setZone(timezone).toLocaleString(DateTime.DATETIME_SHORT)}
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Billing period</Table.Td>
              <Table.Td>
                {DateTime.fromISO(sub.currentBillingPeriodStart).setZone(timezone).toLocaleString(DateTime.DATE_SHORT)}
                {' – '}
                {sub.currentBillingPeriodEnd
                  ? DateTime.fromISO(sub.currentBillingPeriodEnd).setZone(timezone).toLocaleString(DateTime.DATE_SHORT)
                  : '—'}
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Stripe subscription</Table.Td>
              <Table.Td>{sub.stripeSubscriptionId ?? '—'}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Cancel at period end</Table.Td>
              <Table.Td>{sub.cancelAtPeriodEnd == null ? '—' : sub.cancelAtPeriodEnd ? 'Yes' : 'No'}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Enforce API usage limit</Table.Td>
              <Table.Td>{sub.enforceApiUsageLimit ? 'Yes' : 'No'}</Table.Td>
            </Table.Tr>
            {sub.createdAt && (
              <Table.Tr>
                <Table.Td fw={600}>Created</Table.Td>
                <Table.Td>
                  {DateTime.fromISO(sub.createdAt).setZone(timezone).toLocaleString(DateTime.DATETIME_SHORT)}
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Text fw={600} size="lg" mb="md">
          Limit overrides
        </Text>
        <Table>
          <Table.Tbody>
            {overrideRows.map(({ label, value }) => (
              <Table.Tr key={label}>
                <Table.Td fw={600}>{label}</Table.Td>
                <Table.Td>{value}</Table.Td>
              </Table.Tr>
            ))}
            {sub.entitlementOverrides != null && sub.entitlementOverrides.length > 0 && (
              <Table.Tr>
                <Table.Td fw={600}>Entitlements</Table.Td>
                <Table.Td>{sub.entitlementOverrides.join(', ')}</Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </Container>
  );
}
