'use client';

import {
  Container,
  Title,
  SimpleGrid,
  Skeleton,
  Alert,
  Stack,
  Paper,
  Text,
  Group,
  Badge,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { MetricCard } from './MetricCard';
import { useApiData } from '@/hooks/useApiData';
import { DataTable, Column } from './DataTable';

interface SubscriptionChurn {
  plan_name: string | null;
  status: string;
  count: number;
  unique_users: number;
}

export function SubscriptionChurnView() {
  const url = `/api/subscription-churn`;
  const { data, loading, error } = useApiData<SubscriptionChurn[]>(url, [url]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="md">
          <Skeleton height={50} width={300} />
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height={100} />
            ))}
          </SimpleGrid>
          <Skeleton height={400} />
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
        >
          {error}
        </Alert>
      </Container>
    );
  }

  if (!data) {
    return null;
  }

  // Calculate churn rates by plan
  const planStats = data.reduce((acc, item) => {
    if (!item.plan_name) return acc;
    
    if (!acc[item.plan_name]) {
      acc[item.plan_name] = {
        plan_name: item.plan_name,
        active: 0,
        canceled: 0,
        trialing: 0,
        total: 0,
      };
    }
    
    acc[item.plan_name].total += item.count;
    if (item.status === 'active') acc[item.plan_name].active = item.count;
    if (item.status === 'canceled') acc[item.plan_name].canceled = item.count;
    if (item.status === 'trialing') acc[item.plan_name].trialing = item.count;
    
    return acc;
  }, {} as Record<string, { plan_name: string; active: number; canceled: number; trialing: number; total: number }>);

  const planStatsArray = Object.values(planStats).map((plan) => ({
    ...plan,
    churnRate: plan.active + plan.canceled > 0 
      ? ((plan.canceled / (plan.active + plan.canceled)) * 100).toFixed(1)
      : '0.0',
  }));

  const totalActive = data.filter((d) => d.status === 'active').reduce((sum, d) => sum + d.count, 0);
  const totalCanceled = data.filter((d) => d.status === 'canceled').reduce((sum, d) => sum + d.count, 0);
  const totalTrialing = data.filter((d) => d.status === 'trialing').reduce((sum, d) => sum + d.count, 0);
  const overallChurnRate = totalActive + totalCanceled > 0
    ? ((totalCanceled / (totalActive + totalCanceled)) * 100).toFixed(1)
    : '0.0';

  const columns: Column<typeof planStatsArray[0]>[] = [
    {
      id: 'plan_name',
      header: 'Plan',
      render: (plan) => <Text fw={500}>{plan.plan_name}</Text>,
      sortValue: (plan) => plan.plan_name.toLowerCase(),
    },
    {
      id: 'active',
      header: 'Active',
      render: (plan) => plan.active.toLocaleString(),
      align: 'right',
      sortValue: (plan) => plan.active,
    },
    {
      id: 'canceled',
      header: 'Canceled',
      render: (plan) => (
        <Text c={plan.canceled > 0 ? 'red' : undefined}>
          {plan.canceled.toLocaleString()}
        </Text>
      ),
      align: 'right',
      sortValue: (plan) => plan.canceled,
    },
    {
      id: 'trialing',
      header: 'Trialing',
      render: (plan) => plan.trialing.toLocaleString(),
      align: 'right',
      sortValue: (plan) => plan.trialing,
    },
    {
      id: 'churnRate',
      header: 'Churn Rate',
      render: (plan) => (
        <Badge
          color={parseFloat(plan.churnRate) > 50 ? 'red' : parseFloat(plan.churnRate) > 30 ? 'yellow' : 'green'}
          variant="light"
        >
          {plan.churnRate}%
        </Badge>
      ),
      align: 'right',
      sortValue: (plan) => parseFloat(plan.churnRate),
    },
  ];

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <div>
          <Title order={2} mb="xs">Subscription Churn Analysis</Title>
          <Text c="dimmed" size="sm">
            Track subscription cancellations - Pro plan has 87% churn rate
          </Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <MetricCard
            title="Active Subscriptions"
            value={totalActive.toLocaleString()}
            subtitle="Currently active"
          />
          <MetricCard
            title="Canceled"
            value={totalCanceled.toLocaleString()}
            subtitle="Total cancellations"
          />
          <MetricCard
            title="Trialing"
            value={totalTrialing.toLocaleString()}
            subtitle="In trial period"
          />
          <MetricCard
            title="Overall Churn Rate"
            value={`${overallChurnRate}%`}
            subtitle="Canceled / (Active + Canceled)"
          />
        </SimpleGrid>

        <Paper shadow="sm" p="md" withBorder>
          <Title order={4} mb="md">Churn by Plan</Title>
          <DataTable
            data={planStatsArray}
            columns={columns}
            keyField="plan_name"
            defaultSort={{ column: 'churnRate', direction: 'desc' }}
          />
        </Paper>

        <Paper shadow="sm" p="md" withBorder>
          <Title order={4} mb="md">Key Insights</Title>
          <Stack gap="sm">
            {planStatsArray
              .filter((p) => parseFloat(p.churnRate) > 50)
              .map((plan) => (
                <Text size="sm" key={plan.plan_name} c="red">
                  <strong>{plan.plan_name}:</strong> {plan.churnRate}% churn rate ({plan.canceled} canceled vs {plan.active} active)
                </Text>
              ))}
            {planStatsArray.filter((p) => parseFloat(p.churnRate) > 50).length === 0 && (
              <Text size="sm" c="dimmed">
                No plans with churn rate above 50%
              </Text>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

