'use client';

import { useParams } from 'next/navigation';
import { useApiData } from '@/hooks/useApiData';
import {
  Container,
  Title,
  Paper,
  Text,
  Group,
  SimpleGrid,
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
  if (value == null) return '—';
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString();
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

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Paper shadow="sm" p="md" radius="md" withBorder>
          <Text fw={600} size="lg" mb="md">
            Details
          </Text>
          <Table>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td fw={600}>ID</Table.Td>
                <Table.Td>{sub.id}</Table.Td>
              </Table.Tr>
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
                <Table.Td fw={600}>Stripe subscription</Table.Td>
                <Table.Td>{sub.stripeSubscriptionId ?? '—'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Created</Table.Td>
                <Table.Td>
                  {sub.createdAt
                    ? DateTime.fromISO(sub.createdAt).setZone(timezone).toLocaleString(DateTime.DATETIME_SHORT)
                    : '—'}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Cancel at period end</Table.Td>
                <Table.Td>{sub.cancelAtPeriodEnd == null ? '—' : sub.cancelAtPeriodEnd ? 'Yes' : 'No'}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Billing period start</Table.Td>
                <Table.Td>
                  {DateTime.fromISO(sub.currentBillingPeriodStart).setZone(timezone).toLocaleString(DateTime.DATETIME_SHORT)}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Billing period end</Table.Td>
                <Table.Td>
                  {sub.currentBillingPeriodEnd
                    ? DateTime.fromISO(sub.currentBillingPeriodEnd).setZone(timezone).toLocaleString(DateTime.DATETIME_SHORT)
                    : '—'}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Enforce API usage limit</Table.Td>
                <Table.Td>{sub.enforceApiUsageLimit ? 'Yes' : 'No'}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Paper>

        <Paper shadow="sm" p="md" radius="md" withBorder>
          <Text fw={600} size="lg" mb="md">
            Limit overrides
          </Text>
          <Table>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td fw={600}>API rows returned</Table.Td>
                <Table.Td>{formatOverride(sub.apiRowsReturnedLimitOverride)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>API requests</Table.Td>
                <Table.Td>{formatOverride(sub.apiRequestsLimitOverride)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>API rows per response</Table.Td>
                <Table.Td>{formatOverride(sub.apiRowsPerResponseLimitOverride)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Alerts</Table.Td>
                <Table.Td>{formatOverride(sub.alertsLimitOverride)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Dashboards</Table.Td>
                <Table.Td>{formatOverride(sub.dashboardsLimitOverride)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Downloads</Table.Td>
                <Table.Td>{formatOverride(sub.downloadsLimitOverride)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Charts</Table.Td>
                <Table.Td>{formatOverride(sub.chartsLimitOverride)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Per second rate limit</Table.Td>
                <Table.Td>{formatOverride(sub.perSecondApiRateLimitOverride)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Per minute rate limit</Table.Td>
                <Table.Td>{formatOverride(sub.perMinuteApiRateLimitOverride)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Per hour rate limit</Table.Td>
                <Table.Td>{formatOverride(sub.perHourApiRateLimitOverride)}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Entitlement overrides</Table.Td>
                <Table.Td>
                  {sub.entitlementOverrides != null && sub.entitlementOverrides.length > 0
                    ? sub.entitlementOverrides.join(', ')
                    : '—'}
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Paper>
      </SimpleGrid>
    </Container>
  );
}
