'use client';

import { useState, useRef } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
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
  Button,
  Anchor,
  TextInput,
  SegmentedControl,
  Box,
  Select,
} from '@mantine/core';
import { IconSearch, IconTrendingUp, IconBuilding } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { MetricCard } from './MetricCard';
import { TimeSeriesChart } from './TimeSeriesChart';
import { ExportButton } from './ExportButton';
import { CompositeChart } from '@mantine/charts';
import { useFilter } from '@/contexts/FilterContext';
import { DEFAULT_CHART_LEGEND_PROPS } from '@/lib/chart-defaults';
import { ErrorDisplay } from './ErrorDisplay';
import Link from 'next/link';
import { useQueryState, parseAsStringEnum } from 'nuqs';
import { UsersResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { DataTable, Column } from './DataTable';

export function UsersView() {
  const { timezone } = useFilter();
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [debouncedDomainFilter] = useDebouncedValue(domainFilter, 300);

  // DOM refs for chart export - ExportButton uses html-to-image to capture these elements as PNGs
  const totalUsersChartRef = useRef<HTMLDivElement>(null);
  const newUsersChartRef = useRef<HTMLDivElement>(null);
  const hourlyUsersChartRef = useRef<HTMLDivElement>(null);

  const chartRefs = [
    { name: 'total_users', ref: totalUsersChartRef },
    { name: 'new_users', ref: newUsersChartRef },
    { name: 'hourly_users', ref: hourlyUsersChartRef },
  ];

  // URL state management with nuqs
  const [timestampType, setTimestampType] = useQueryState(
    'timestampType',
    parseAsStringEnum(['created_at', 'last_active_at']).withDefault('created_at')
  );
  
  const [newUsersPeriod, setNewUsersPeriod] = useQueryState(
    'newUsersPeriod',
    parseAsStringEnum(['week', 'month', 'year']).withDefault('month')
  );

  const url = useApiUrl('/api/users', {
    domainSearch: debouncedDomainFilter || undefined,
    timestampType: timestampType !== 'created_at' ? timestampType : undefined,
    newUsersPeriod: newUsersPeriod !== 'month' ? newUsersPeriod : undefined,
  });
  const { data, loading, error } = useApiData<UsersResponse>(url, [url, debouncedDomainFilter, timestampType, newUsersPeriod]);

  return (
    <Container fluid py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>User Registrations</Title>
        <Group>
          <Button
            component={Link}
            href="/users/top-registrations"
            leftSection={<IconTrendingUp size={16} />}
            variant="light"
          >
            Top Registrations
          </Button>
          <Button
            component={Link}
            href="/users/corporate-teams"
            leftSection={<IconBuilding size={16} />}
            variant="light"
          >
            Corporate & Teams
          </Button>
          <ExportButton charts={chartRefs} />
        </Group>
      </Group>

      {loading ? (
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} height={100} />
            ))}
          </SimpleGrid>
          <Skeleton height={350} />
        </Stack>
      ) : error ? (
        <ErrorDisplay error={error} />
      ) : !data || data.monthlyData.length === 0 ? (
        <Alert title="No data" color="yellow">
          No user registration data available.
        </Alert>
      ) : (() => {
        const latestMetric = data.monthlyData[data.monthlyData.length - 1];
        const previousMetric =
          data.monthlyData.length > 1
            ? data.monthlyData[data.monthlyData.length - 2]
            : null;
        const formatMonth = (monthStr: string) =>
          DateTime.fromISO(monthStr, { zone: 'utc' }).toFormat('MMM yyyy');
        const formatLastYearMonth = () =>
          DateTime.fromISO(latestMetric.month, { zone: 'utc' })
            .minus({ years: 1 })
            .toFormat('MMM yyyy');
        const lastYearMonthLabel = formatLastYearMonth();
        const currentMonthLabel = formatMonth(latestMetric.month);
        const recentMonths = data.monthlyData.slice(-12).reverse();
        const todayDateLabel = DateTime.now().setZone(timezone).toLocaleString(DateTime.DATE_MED);
        const last30Days = data.last30DaysUsers?.last30Days ?? 0;
        const previous30Days = data.last30DaysUsers?.previous30Days ?? 0;

        return (
          <>
      {/* Summary Metrics */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" mb="xl">
        <MetricCard
          title={`Users Today - ${todayDateLabel}`}
          value={data.usersToday.today}
          subtitle={
            <SimpleGrid cols={2} spacing="xs">
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  vs Yesterday (all day): {data.usersToday.yesterdayAll.toLocaleString()}
                  {data.usersToday.yesterdayAll > 0 && (
                    <Text span c={data.usersToday.today >= data.usersToday.yesterdayAll ? 'green' : 'red'}>
                      {' '}({data.usersToday.today >= data.usersToday.yesterdayAll ? '+' : ''}
                      {Math.round(((data.usersToday.today - data.usersToday.yesterdayAll) / data.usersToday.yesterdayAll) * 100).toLocaleString()}%)
                    </Text>
                  )}
                </Text>
                <Text size="xs" c="dimmed">
                  vs Yesterday (same time): {data.usersToday.yesterdaySameTime.toLocaleString()}
                  {data.usersToday.yesterdaySameTime > 0 && (
                    <Text span c={data.usersToday.today >= data.usersToday.yesterdaySameTime ? 'green' : 'red'}>
                      {' '}({data.usersToday.today >= data.usersToday.yesterdaySameTime ? '+' : ''}
                      {Math.round(((data.usersToday.today - data.usersToday.yesterdaySameTime) / data.usersToday.yesterdaySameTime) * 100).toLocaleString()}%)
                    </Text>
                  )}
                </Text>
              </Stack>
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  vs Last Week (all day): {data.usersToday.lastWeekAll.toLocaleString()}
                  {data.usersToday.lastWeekAll > 0 && (
                    <Text span c={data.usersToday.today >= data.usersToday.lastWeekAll ? 'green' : 'red'}>
                      {' '}({data.usersToday.today >= data.usersToday.lastWeekAll ? '+' : ''}
                      {Math.round(((data.usersToday.today - data.usersToday.lastWeekAll) / data.usersToday.lastWeekAll) * 100).toLocaleString()}%)
                    </Text>
                  )}
                </Text>
                <Text size="xs" c="dimmed">
                  vs Last Week (same time): {data.usersToday.lastWeekSameTime.toLocaleString()}
                  {data.usersToday.lastWeekSameTime > 0 && (
                    <Text span c={data.usersToday.today >= data.usersToday.lastWeekSameTime ? 'green' : 'red'}>
                      {' '}({data.usersToday.today >= data.usersToday.lastWeekSameTime ? '+' : ''}
                      {Math.round(((data.usersToday.today - data.usersToday.lastWeekSameTime) / data.usersToday.lastWeekSameTime) * 100).toLocaleString()}%)
                    </Text>
                  )}
                </Text>
              </Stack>
            </SimpleGrid>
          }
        />
        <MetricCard
          title={`New Users - ${currentMonthLabel}`}
          value={data.monthlyNewUsers?.currentMonth ?? latestMetric.newUsers}
          subtitle={
            data.monthlyNewUsers ? (
              <Stack gap={2}>
                <SimpleGrid cols={2} spacing="xs">
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed">
                      vs Last Month (all month): {data.monthlyNewUsers.previousMonthAll.toLocaleString()}
                      {data.monthlyNewUsers.previousMonthAll > 0 && (
                        <Text span c={data.monthlyNewUsers.currentMonth >= data.monthlyNewUsers.previousMonthAll ? 'green' : 'red'}>
                          {' '}({data.monthlyNewUsers.currentMonth >= data.monthlyNewUsers.previousMonthAll ? '+' : ''}
                          {Math.round(((data.monthlyNewUsers.currentMonth - data.monthlyNewUsers.previousMonthAll) / data.monthlyNewUsers.previousMonthAll) * 100).toLocaleString()}%)
                        </Text>
                      )}
                    </Text>
                    <Text size="xs" c="dimmed">
                      vs Last Month (same time): {data.monthlyNewUsers.previousMonthSameTime.toLocaleString()}
                      {data.monthlyNewUsers.previousMonthSameTime > 0 && (
                        <Text span c={data.monthlyNewUsers.currentMonth >= data.monthlyNewUsers.previousMonthSameTime ? 'green' : 'red'}>
                          {' '}({data.monthlyNewUsers.currentMonth >= data.monthlyNewUsers.previousMonthSameTime ? '+' : ''}
                          {Math.round(((data.monthlyNewUsers.currentMonth - data.monthlyNewUsers.previousMonthSameTime) / data.monthlyNewUsers.previousMonthSameTime) * 100).toLocaleString()}%)
                        </Text>
                      )}
                    </Text>
                  </Stack>
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed">
                      vs {lastYearMonthLabel} (all month): {data.monthlyNewUsers.lastYearMonthAll.toLocaleString()}
                      {data.monthlyNewUsers.lastYearMonthAll > 0 && (
                        <Text span c={data.monthlyNewUsers.currentMonth >= data.monthlyNewUsers.lastYearMonthAll ? 'green' : 'red'}>
                          {' '}({data.monthlyNewUsers.currentMonth >= data.monthlyNewUsers.lastYearMonthAll ? '+' : ''}
                          {Math.round(((data.monthlyNewUsers.currentMonth - data.monthlyNewUsers.lastYearMonthAll) / data.monthlyNewUsers.lastYearMonthAll) * 100).toLocaleString()}%)
                        </Text>
                      )}
                    </Text>
                    <Text size="xs" c="dimmed">
                      vs {lastYearMonthLabel} (same time): {data.monthlyNewUsers.lastYearMonthSameTime.toLocaleString()}
                      {data.monthlyNewUsers.lastYearMonthSameTime > 0 && (
                        <Text span c={data.monthlyNewUsers.currentMonth >= data.monthlyNewUsers.lastYearMonthSameTime ? 'green' : 'red'}>
                          {' '}({data.monthlyNewUsers.currentMonth >= data.monthlyNewUsers.lastYearMonthSameTime ? '+' : ''}
                          {Math.round(((data.monthlyNewUsers.currentMonth - data.monthlyNewUsers.lastYearMonthSameTime) / data.monthlyNewUsers.lastYearMonthSameTime) * 100).toLocaleString()}%)
                        </Text>
                      )}
                    </Text>
                  </Stack>
                </SimpleGrid>
              </Stack>
            ) : (
              latestMetric.month
            )
          }
        />
        <MetricCard
          title="New Users - Last 30 days"
          value={last30Days.toLocaleString()}
          subtitle={
            previous30Days > 0 ? (
              <Text size="xs" c="dimmed">
                vs Previous 30 days: {previous30Days.toLocaleString()}
                <Text span c={last30Days >= previous30Days ? 'green' : 'red'} ml="xs">
                  ({last30Days >= previous30Days ? '+' : ''}
                  {Math.round(((last30Days - previous30Days) / previous30Days) * 100).toLocaleString()}%)
                </Text>
              </Text>
            ) : (
              <Text size="xs" c="dimmed">
                Last 30 days
              </Text>
            )
          }
        />
      </SimpleGrid>

      {/* Period Selector */}
      <Group justify="flex-end" mb="md">
        <Select
          value={newUsersPeriod}
          onChange={(value) => setNewUsersPeriod((value as 'week' | 'month' | 'year') || 'month')}
          data={[
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
            { value: 'year', label: 'Year' },
          ]}
          style={{ width: 120 }}
          size="sm"
        />
      </Group>

      {/* Charts */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
        <TimeSeriesChart
          ref={totalUsersChartRef}
          title="Total Registered Users"
          subtitle={data.totalUsers ? `Current total: ${data.totalUsers.toLocaleString()} users` : "Cumulative user signups over time"}
          data={data.combinedDataByPeriod || data.monthlyData}
          dataKey="totalUsers"
          color="blue.6"
        />
        <TimeSeriesChart
          ref={newUsersChartRef}
          title="New Users"
          subtitle={
            newUsersPeriod === 'week' ? 'New registrations per week' :
            newUsersPeriod === 'month' ? 'New registrations per month' :
            'New registrations per year'
          }
          data={data.combinedDataByPeriod || data.monthlyData}
          dataKey="newUsers"
          color="green.6"
          chartType="bar"
          showTrendline={true}
        />
      </SimpleGrid>

      <Paper shadow="sm" p="md" radius="md" withBorder ref={hourlyUsersChartRef} mb="xl">
        <Text fw={600} size="lg" mb="xs">
          New Users by Hour (Today)
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Bars: new users per hour. Lines: cumulative totals (today solid, yesterday dashed, last week dotted)
        </Text>
        {data.hourlyRegistrations && data.hourlyRegistrations.length > 0 ? (
          <Box>
            {(() => {
              const hourlyChartData = data.hourlyRegistrations.map((row) => ({
                ...row,
                hourLabel: DateTime.fromISO(row.hour)
                  .setZone(timezone)
                  .toLocaleString(DateTime.TIME_SIMPLE),
                // Map to readable names for legend
                'New Users': row.newUsers,
                'Cumulative (Today)': row.cumulativeUsers,
                // Use 0 instead of null for chart compatibility
                'Cumulative (Yesterday)': row.cumulativeYesterday ?? undefined,
                'Cumulative (Last Week)': row.cumulativeLastWeek ?? undefined,
              }));
              
              const series: Array<{ name: string; type: 'bar' | 'line'; color: string; yAxisId?: string; strokeDasharray?: string; label?: string }> = [
                { name: 'New Users', type: 'bar' as const, color: 'teal.6', label: 'New Users' },
                { name: 'Cumulative (Today)', type: 'line' as const, color: 'blue.6', yAxisId: 'right', label: 'Cumulative (Today)' },
              ];
              
              // Add yesterday cumulative line if data exists
              if (hourlyChartData.some(row => row['Cumulative (Yesterday)'] !== undefined)) {
                series.push({ name: 'Cumulative (Yesterday)', type: 'line' as const, color: 'gray.6', yAxisId: 'right', strokeDasharray: '5 5', label: 'Cumulative (Yesterday)' });
              }
              
              // Add last week cumulative line if data exists
              if (hourlyChartData.some(row => row['Cumulative (Last Week)'] !== undefined)) {
                series.push({ name: 'Cumulative (Last Week)', type: 'line' as const, color: 'orange.6', yAxisId: 'right', strokeDasharray: '3 3', label: 'Cumulative (Last Week)' });
              }
              
              return (
                <CompositeChart
                  h={300}
                  data={hourlyChartData}
                  dataKey="hourLabel"
                  series={series}
                  curveType="linear"
                  withLegend
                  legendProps={DEFAULT_CHART_LEGEND_PROPS}
                  yAxisProps={{ 
                    domain: [0, 'auto'],
                    tickFormatter: (value: number) => value.toLocaleString()
                  }}
                  withRightYAxis
                  rightYAxisLabel="Cumulative"
                  rightYAxisProps={{ 
                    domain: [0, 'auto'],
                    tickFormatter: (value: number) => value.toLocaleString()
                  }}
                />
              );
            })()}
          </Box>
        ) : (
          <Text c="dimmed" size="sm">
            No registrations yet today.
          </Text>
        )}
      </Paper>

      {/* Top Domains */}
      {data.topDomains && (
        <Stack gap="md">
          <Group justify="space-between" align="center" wrap="wrap">
            <Text fw={600} size="lg">
              Top Domains
            </Text>
            <Group gap="md">
              <SegmentedControl
                value={timestampType}
                onChange={(value) => setTimestampType(value as 'created_at' | 'last_active_at')}
                data={[
                  { label: 'Registration Date', value: 'created_at' },
                  { label: 'Last Active', value: 'last_active_at' },
                ]}
              />
              <TextInput
                placeholder="Filter domains..."
                leftSection={<IconSearch size={16} />}
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.currentTarget.value)}
                style={{ maxWidth: 300 }}
              />
            </Group>
          </Group>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            {/* Top Domains - 1 Day */}
            <Paper shadow="sm" p="md" radius="md" withBorder>
              <Text fw={600} size="lg" mb="md">
                Top Domains (1 Day)
              </Text>
              <DataTable
                data={data.topDomains['1d']}
                columns={[
                  {
                    id: 'domain',
                    header: 'Domain',
                    align: 'left',
                    render: (row) => (
                      <Anchor component={Link} href={`/domains/${encodeURIComponent(row.domain)}`}>
                        {row.domain}
                      </Anchor>
                    ),
                    sortValue: (row) => row.domain.toLowerCase(),
                  },
                  {
                    id: 'userCount',
                    header: 'Users',
                    align: 'right',
                    render: (row) => row.userCount,
                    sortValue: (row) => row.userCount,
                  },
                ]}
                keyField="domain"
                emptyMessage={domainFilter ? 'No domains match the filter' : 'No registrations in the last day'}
              />
            </Paper>

            {/* Top Domains - 7 Days */}
            <Paper shadow="sm" p="md" radius="md" withBorder>
              <Text fw={600} size="lg" mb="md">
                Top Domains (7 Days)
              </Text>
              <DataTable
                data={data.topDomains['7d']}
                columns={[
                  {
                    id: 'domain',
                    header: 'Domain',
                    align: 'left',
                    render: (row) => (
                      <Anchor component={Link} href={`/domains/${encodeURIComponent(row.domain)}`}>
                        {row.domain}
                      </Anchor>
                    ),
                    sortValue: (row) => row.domain.toLowerCase(),
                  },
                  {
                    id: 'userCount',
                    header: 'Users',
                    align: 'right',
                    render: (row) => row.userCount,
                    sortValue: (row) => row.userCount,
                  },
                ]}
                keyField="domain"
                emptyMessage={domainFilter ? 'No domains match the filter' : 'No registrations in the last 7 days'}
              />
            </Paper>

            {/* Top Domains - 30 Days */}
            <Paper shadow="sm" p="md" radius="md" withBorder>
              <Text fw={600} size="lg" mb="md">
                Top Domains (30 Days)
              </Text>
              <DataTable
                data={data.topDomains['30d']}
                columns={[
                  {
                    id: 'domain',
                    header: 'Domain',
                    align: 'left',
                    render: (row) => (
                      <Anchor component={Link} href={`/domains/${encodeURIComponent(row.domain)}`}>
                        {row.domain}
                      </Anchor>
                    ),
                    sortValue: (row) => row.domain.toLowerCase(),
                  },
                  {
                    id: 'userCount',
                    header: 'Users',
                    align: 'right',
                    render: (row) => row.userCount,
                    sortValue: (row) => row.userCount,
                  },
                ]}
                keyField="domain"
                emptyMessage={domainFilter ? 'No domains match the filter' : 'No registrations in the last 30 days'}
              />
            </Paper>
          </SimpleGrid>
        </Stack>
      )}

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
              render: (row) => formatMonth(row.month),
              sortValue: (row) => row.month,
            },
            {
              id: 'totalUsers',
              header: 'Total',
              align: 'right',
              render: (row) => (
                <>
                  {row.totalUsers.toLocaleString()}
                  {row.totalUsersMomChange !== 0 && (
                    <Text span size="xs" c={row.totalUsersMomChange >= 0 ? 'green' : 'red'} ml="xs">
                      ({row.totalUsersMomChange >= 0 ? '+' : ''}{row.totalUsersMomChange}%)
                    </Text>
                  )}
                </>
              ),
              sortValue: (row) => row.totalUsers,
            },
            {
              id: 'newUsers',
              header: 'New',
              align: 'right',
              render: (row) => (
                <>
                  {row.newUsers.toLocaleString()}
                  {row.newUsersMomChange !== 0 && (
                    <Text span size="xs" c={row.newUsersMomChange >= 0 ? 'green' : 'red'} ml="xs">
                      ({row.newUsersMomChange >= 0 ? '+' : ''}{row.newUsersMomChange}%)
                    </Text>
                  )}
                </>
              ),
              sortValue: (row) => row.newUsers,
            },
          ]}
          keyField="month"
        />
      </Paper>
          </>
        );
      })()}
    </Container>
  );
}
