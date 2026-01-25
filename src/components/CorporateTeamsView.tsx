'use client';

import { useRef } from 'react';
import {
  Container,
  Title,
  SimpleGrid,
  Group,
  Skeleton,
  Alert,
  Stack,
  Table,
  Paper,
  Text,
  Anchor,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';
import { MetricCard } from './MetricCard';
import { TimeSeriesChart } from './TimeSeriesChart';
import { ExportButton } from './ExportButton';
import { useFilter } from '@/contexts/FilterContext';
import Link from 'next/link';
import { CorporateTeamsResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';

export function CorporateTeamsView() {
  const corpUsersChartRef = useRef<HTMLDivElement>(null);
  const teamsChartRef = useRef<HTMLDivElement>(null);
  const corpDomainsChartRef = useRef<HTMLDivElement>(null);

  const chartRefs = [
    { name: 'corp_users', ref: corpUsersChartRef },
    { name: 'teams', ref: teamsChartRef },
    { name: 'corp_domains', ref: corpDomainsChartRef },
  ];

  const { filterGridstatus } = useFilter();
  const url = `/api/users/corporate-teams?filterGridstatus=${filterGridstatus}`;
  const { data, loading, error } = useApiData<CorporateTeamsResponse>(url, [url]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="md">
          <Skeleton height={50} width={300} />
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} height={100} />
            ))}
          </SimpleGrid>
          <Skeleton height={350} />
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error loading data"
          color="red"
        >
          {error}
        </Alert>
      </Container>
    );
  }

  if (!data || data.monthlyData.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Alert title="No data" color="yellow">
          No corporate and teams data available.
        </Alert>
      </Container>
    );
  }

  const latestMetric = data.monthlyData[data.monthlyData.length - 1];
  const previousMetric =
    data.monthlyData.length > 1
      ? data.monthlyData[data.monthlyData.length - 2]
      : null;

  const calculateTrend = (current: number, previous: number | undefined) => {
    if (previous === undefined || previous === 0) return undefined;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Get last 12 months for the table
  const recentMonths = data.monthlyData.slice(-12).reverse();

  return (
    <Container size="xl" py="xl">
      <Anchor
        component={Link}
        href="/users"
        size="sm"
        c="dimmed"
        style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}
      >
        <IconArrowLeft size={16} />
        Back to User Registrations
      </Anchor>

      <Group justify="space-between" mb="xl">
        <Title order={1}>Corporate Users & Teams</Title>
        <ExportButton charts={chartRefs} />
      </Group>

      {/* Summary Metrics */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="xl">
        <MetricCard
          title="Corporate Users"
          value={latestMetric.totalCorpUsers}
          trend={calculateTrend(
            latestMetric.totalCorpUsers,
            previousMetric?.totalCorpUsers
          )}
          trendLabel="MoM"
          subtitle={`${latestMetric.month}`}
        />
        <MetricCard
          title="Teams"
          value={latestMetric.teams}
          subtitle={`${latestMetric.usersOnTeams} users on teams`}
        />
        <MetricCard
          title="Corporate Domains"
          value={latestMetric.corpDomains}
          subtitle="Total corporate email domains"
        />
      </SimpleGrid>

      {/* Charts */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
        <TimeSeriesChart
          ref={corpUsersChartRef}
          title="Corporate Users"
          subtitle="Users from corporate email domains"
          data={data.monthlyData}
          dataKey="totalCorpUsers"
          color="violet.6"
        />
        <TimeSeriesChart
          ref={teamsChartRef}
          title="Teams"
          subtitle="Corporate domains with 3+ users"
          data={data.monthlyData}
          dataKey="teams"
          color="orange.6"
          chartType="bar"
        />
        <TimeSeriesChart
          ref={corpDomainsChartRef}
          title="Corporate Domains"
          subtitle="Total corporate email domains"
          data={data.monthlyData}
          dataKey="corpDomains"
          color="teal.6"
          chartType="bar"
        />
      </SimpleGrid>

      {/* Data Table */}
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Text fw={600} size="lg" mb="md">
          Recent Months
        </Text>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Month</Table.Th>
              <Table.Th ta="right">Corp Users</Table.Th>
              <Table.Th ta="right">New Corp Users</Table.Th>
              <Table.Th ta="right">Corp Domains</Table.Th>
              <Table.Th ta="right">Teams</Table.Th>
              <Table.Th ta="right">Users on Teams</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {recentMonths.map((row) => (
              <Table.Tr key={row.month}>
                <Table.Td>{row.month}</Table.Td>
                <Table.Td ta="right">
                  {row.totalCorpUsers.toLocaleString()}
                  {row.corpUsersMomChange !== 0 && (
                    <Text span size="xs" c={row.corpUsersMomChange >= 0 ? 'green' : 'red'} ml="xs">
                      ({row.corpUsersMomChange >= 0 ? '+' : ''}{row.corpUsersMomChange}%)
                    </Text>
                  )}
                </Table.Td>
                <Table.Td ta="right">{row.newCorpUsers.toLocaleString()}</Table.Td>
                <Table.Td ta="right">{row.corpDomains.toLocaleString()}</Table.Td>
                <Table.Td ta="right">{row.teams}</Table.Td>
                <Table.Td ta="right">{row.usersOnTeams.toLocaleString()}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Container>
  );
}

