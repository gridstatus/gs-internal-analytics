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
  Paper,
  Text,
  Anchor,
  Collapse,
  Button,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconInfoCircle, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useState } from 'react';
import { DateTime } from 'luxon';
import { MetricCard } from './MetricCard';
import { TimeSeriesChart } from './TimeSeriesChart';
import { ExportButton } from './ExportButton';
import { useFilter } from '@/contexts/FilterContext';
import Link from 'next/link';
import { CorporateTeamsResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { DataTable, Column } from './DataTable';

export function CorporateTeamsView() {
  const [showHelp, setShowHelp] = useState(false);
  // DOM refs for chart export - ExportButton uses html-to-image to capture these elements as PNGs
  const corpUsersChartRef = useRef<HTMLDivElement>(null);
  const teamsChartRef = useRef<HTMLDivElement>(null);
  const corpDomainsChartRef = useRef<HTMLDivElement>(null);

  const chartRefs = [
    { name: 'corp_users', ref: corpUsersChartRef },
    { name: 'teams', ref: teamsChartRef },
    { name: 'corp_domains', ref: corpDomainsChartRef },
  ];

  const { filterInternal, filterFree, timezone } = useFilter();
  const url = useApiUrl('/api/users/corporate-teams', { filterInternal, filterFree, timezone });
  const { data, loading, error } = useApiData<CorporateTeamsResponse>(url, [filterInternal, filterFree, timezone]);

  if (loading) {
    return (
      <Container fluid py="xl">
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
      <Container fluid py="xl">
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
      <Container fluid py="xl">
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

  const formatMonthLabel = (monthStr: string) => {
    return DateTime.fromISO(monthStr, { zone: 'utc' }).toFormat('MMM yyyy');
  };

  return (
    <Container fluid py="xl">
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

      {/* Help Text */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <IconInfoCircle size={20} style={{ color: 'var(--mantine-color-blue-6)' }} />
            <Text fw={600} size="sm">
              How These Metrics Are Calculated
            </Text>
          </Group>
          <Button
            variant="subtle"
            size="xs"
            onClick={() => setShowHelp(!showHelp)}
            leftSection={showHelp ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          >
            {showHelp ? 'Hide' : 'Show'} Details
          </Button>
        </Group>
        <Collapse in={showHelp}>
          <Stack gap="sm" mt="md">
            <div>
              <Text fw={500} size="sm" mb={4}>
                Corporate Users
              </Text>
              <Text size="xs" c="dimmed">
                Users whose email domain is not .edu or .gov. The count is cumulative (total registered users from corporate domains).
              </Text>
            </div>
            <div>
              <Text fw={500} size="sm" mb={4}>
                Corporate Domains
              </Text>
              <Text size="xs" c="dimmed">
                The number of distinct corporate email domains that had at least one user registration in that month. 
                Domains are counted in each month where they have user registrations. A domain that appears in multiple 
                months will be counted in each of those months.
              </Text>
            </div>
            <div>
              <Text fw={500} size="sm" mb={4}>
                Teams
              </Text>
              <Text size="xs" c="dimmed">
                Corporate domains that have 3 or more users. This metric counts domains that have 3+ users 
                and had at least one user registration in that month. The count uses a cumulative calculation 
                per domain (total users from that domain up to that month).
              </Text>
            </div>
            <div>
              <Text fw={500} size="sm" mb={4}>
                Users on Teams
              </Text>
              <Text size="xs" c="dimmed">
                The total number of users from domains that qualify as "teams" (domains with 3+ users). 
                This is the sum of all users across all team domains.
              </Text>
            </div>
            <div>
              <Text fw={500} size="sm" mb={4}>
                New Corporate Users
              </Text>
              <Text size="xs" c="dimmed">
                The number of new users registered in each month whose email domain qualifies as corporate 
                (not .edu/.gov).
              </Text>
            </div>
            <Alert color="blue" variant="light" mt="sm">
              <Text size="xs">
                <strong>Note:</strong> All metrics respect the internal user filter (gridstatus.io users can be included/excluded via the sidebar filter).
              </Text>
            </Alert>
          </Stack>
        </Collapse>
      </Paper>

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
        <DataTable
          data={recentMonths}
          columns={[
            {
              id: 'month',
              header: 'Month',
              align: 'left',
              render: (row) => formatMonthLabel(row.month),
              sortValue: (row) => row.month,
            },
            {
              id: 'totalCorpUsers',
              header: 'Corp Users',
              align: 'right',
              render: (row) => (
                <>
                  {row.totalCorpUsers.toLocaleString()}
                  {row.corpUsersMomChange !== 0 && (
                    <Text span size="xs" c={row.corpUsersMomChange >= 0 ? 'green' : 'red'} ml="xs">
                      ({row.corpUsersMomChange >= 0 ? '+' : ''}{row.corpUsersMomChange}%)
                    </Text>
                  )}
                </>
              ),
              sortValue: (row) => row.totalCorpUsers,
            },
            {
              id: 'newCorpUsers',
              header: 'New Corp Users',
              align: 'right',
              render: (row) => row.newCorpUsers.toLocaleString(),
              sortValue: (row) => row.newCorpUsers,
            },
            {
              id: 'corpDomains',
              header: 'Corp Domains',
              align: 'right',
              render: (row) => row.corpDomains.toLocaleString(),
              sortValue: (row) => row.corpDomains,
            },
            {
              id: 'teams',
              header: 'Teams',
              align: 'right',
              render: (row) => row.teams,
              sortValue: (row) => row.teams,
            },
            {
              id: 'usersOnTeams',
              header: 'Users on Teams',
              align: 'right',
              render: (row) => row.usersOnTeams.toLocaleString(),
              sortValue: (row) => row.usersOnTeams,
            },
          ]}
          keyField="month"
        />
      </Paper>
    </Container>
  );
}

