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
  Progress,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { MetricCard } from './MetricCard';
import { useFilter } from '@/contexts/FilterContext';
import { useApiData } from '@/hooks/useApiData';

interface FeatureAdoptionFunnelResponse {
  total_users: number;
  dashboard_users: number;
  chart_users: number;
  alert_users: number;
  download_users: number;
  api_key_users: number;
  multi_feature_users: number;
}

export function FeatureAdoptionFunnelView() {
  const { filterGridstatus } = useFilter();
  const url = `/api/feature-adoption-funnel?filterGridstatus=${filterGridstatus}`;
  const { data, loading, error } = useApiData<FeatureAdoptionFunnelResponse>(url, [url, filterGridstatus]);

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

  const funnelSteps = [
    { label: 'Signed Up', value: data.total_users, color: 'blue' },
    { label: 'Viewed Dashboard', value: data.dashboard_users, color: 'cyan' },
    { label: 'Created Chart', value: data.chart_users, color: 'teal' },
    { label: 'Set Alert', value: data.alert_users, color: 'green' },
    { label: 'Downloaded Data', value: data.download_users, color: 'lime' },
    { label: 'Created API Key', value: data.api_key_users, color: 'yellow' },
    { label: 'Multi-Feature User', value: data.multi_feature_users, color: 'orange' },
  ];

  const calculateConversion = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current / previous) * 100).toFixed(1);
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <div>
          <Title order={2} mb="xs">Feature Adoption Funnel</Title>
          <Text c="dimmed" size="sm">
            User progression through key features - critical for retention (88% vs 44%)
          </Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          <MetricCard
            title="Total Users"
            value={data.total_users.toLocaleString()}
            subtitle="Last 12 months"
          />
          <MetricCard
            title="Dashboard Users"
            value={data.dashboard_users.toLocaleString()}
            subtitle={`${calculateConversion(data.dashboard_users, data.total_users)}% of signups`}
          />
          <MetricCard
            title="Chart Creators"
            value={data.chart_users.toLocaleString()}
            subtitle={`${calculateConversion(data.chart_users, data.total_users)}% of signups`}
          />
          <MetricCard
            title="Multi-Feature"
            value={data.multi_feature_users.toLocaleString()}
            subtitle={`${calculateConversion(data.multi_feature_users, data.total_users)}% of signups`}
          />
        </SimpleGrid>

        <Paper shadow="sm" p="md" withBorder>
          <Title order={4} mb="md">Adoption Funnel</Title>
          <Stack gap="lg">
            {funnelSteps.map((step, index) => {
              const previousValue = index > 0 ? funnelSteps[index - 1].value : step.value;
              const conversion = calculateConversion(step.value, previousValue);
              const percentage = ((step.value / data.total_users) * 100).toFixed(1);

              return (
                <div key={step.label}>
                  <Group justify="space-between" mb="xs">
                    <Text fw={500}>{step.label}</Text>
                    <Group gap="md">
                      <Text size="sm" c="dimmed">
                        {conversion}% conversion
                      </Text>
                      <Text fw={600}>
                        {step.value.toLocaleString()} ({percentage}%)
                      </Text>
                    </Group>
                  </Group>
                  <Progress
                    value={parseFloat(percentage)}
                    color={step.color}
                    size="lg"
                    radius="xs"
                  />
                </div>
              );
            })}
          </Stack>
        </Paper>

        <Paper shadow="sm" p="md" withBorder>
          <Title order={4} mb="md">Key Insights</Title>
          <Stack gap="sm">
            <Text size="sm">
              <strong>Dashboard Adoption:</strong> {calculateConversion(data.dashboard_users, data.total_users)}% of users view dashboards
            </Text>
            <Text size="sm">
              <strong>Chart Creation:</strong> {calculateConversion(data.chart_users, data.total_users)}% create charts
            </Text>
            <Text size="sm">
              <strong>Multi-Feature Users:</strong> {data.multi_feature_users.toLocaleString()} users ({calculateConversion(data.multi_feature_users, data.total_users)}%) use multiple features
            </Text>
            <Text size="sm" c="dimmed">
              Users who adopt multiple features have 88% retention vs 44% for no features
            </Text>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

