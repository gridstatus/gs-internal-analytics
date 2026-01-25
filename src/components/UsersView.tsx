'use client';

import { useState, useRef, useEffect } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
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
  Button,
  Anchor,
  TextInput,
  SegmentedControl,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { IconAlertCircle, IconTrendingUp, IconBuilding } from '@tabler/icons-react';
import { MetricCard } from './MetricCard';
import { TimeSeriesChart } from './TimeSeriesChart';
import { ExportButton } from './ExportButton';
import { useFilter } from '@/contexts/FilterContext';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { UsersResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';

export function UsersView() {
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [debouncedDomainFilter] = useDebouncedValue(domainFilter, 300);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const totalUsersChartRef = useRef<HTMLDivElement>(null);
  const newUsersChartRef = useRef<HTMLDivElement>(null);

  const chartRefs = [
    { name: 'total_users', ref: totalUsersChartRef },
    { name: 'new_users', ref: newUsersChartRef },
  ];

  // Get timestamp type from URL, default to 'created_at'
  const timestampType = searchParams.get('timestampType') || 'created_at';

  // Handler for segment control changes
  const handleTimestampTypeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'created_at') {
      params.delete('timestampType');
    } else {
      params.set('timestampType', value);
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  };

  const { filterGridstatus } = useFilter();
  const params = new URLSearchParams({
    filterGridstatus: filterGridstatus.toString(),
  });
  if (debouncedDomainFilter) {
    params.set('domainSearch', debouncedDomainFilter);
  }
  if (timestampType !== 'created_at') {
    params.set('timestampType', timestampType);
  }
  const url = `/api/users?${params.toString()}`;
  const { data, loading, error } = useApiData<UsersResponse>(url, [url, filterGridstatus, debouncedDomainFilter, timestampType]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="md">
          <Skeleton height={50} width={300} />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {[...Array(2)].map((_, i) => (
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
          No user registration data available.
        </Alert>
      </Container>
    );
  }

  const latestMetric = data.monthlyData[data.monthlyData.length - 1];
  const previousMetric =
    data.monthlyData.length > 1
      ? data.monthlyData[data.monthlyData.length - 2]
      : null;

  // Format month for display (e.g., "Jan 2026")
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Calculate last year's month for display
  const formatLastYearMonth = () => {
    const [year, month] = latestMetric.month.split('-');
    const lastYearDate = new Date(parseInt(year) - 1, parseInt(month) - 1, 1);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[lastYearDate.getMonth()]} ${lastYearDate.getFullYear()}`;
  };
  const lastYearMonthLabel = formatLastYearMonth();
  const currentMonthLabel = formatMonth(latestMetric.month);

  const calculateTrend = (current: number, previous: number | undefined) => {
    if (previous === undefined || previous === 0) return undefined;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Get last 12 months for the table
  const recentMonths = data.monthlyData.slice(-12).reverse();

  // Format today's date for display (e.g., "Jan 15, 2026")
  const formatTodayDate = () => {
    const today = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
  };
  const todayDateLabel = formatTodayDate();

  return (
    <Container size="xl" py="xl">
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

      {/* Summary Metrics */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="xl">
        <MetricCard
          title={`Users Today - ${todayDateLabel}`}
          value={data.usersToday.today}
          subtitle={
            <SimpleGrid cols={2} spacing="xs">
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  vs Yesterday (all day): {data.usersToday.yesterdayAll}
                  {data.usersToday.yesterdayAll > 0 && (
                    <Text span c={data.usersToday.today >= data.usersToday.yesterdayAll ? 'green' : 'red'}>
                      {' '}({data.usersToday.today >= data.usersToday.yesterdayAll ? '+' : ''}
                      {Math.round(((data.usersToday.today - data.usersToday.yesterdayAll) / data.usersToday.yesterdayAll) * 100)}%)
                    </Text>
                  )}
                </Text>
                <Text size="xs" c="dimmed">
                  vs Yesterday (same time): {data.usersToday.yesterdaySameTime}
                  {data.usersToday.yesterdaySameTime > 0 && (
                    <Text span c={data.usersToday.today >= data.usersToday.yesterdaySameTime ? 'green' : 'red'}>
                      {' '}({data.usersToday.today >= data.usersToday.yesterdaySameTime ? '+' : ''}
                      {Math.round(((data.usersToday.today - data.usersToday.yesterdaySameTime) / data.usersToday.yesterdaySameTime) * 100)}%)
                    </Text>
                  )}
                </Text>
              </Stack>
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  vs Last Week (all day): {data.usersToday.lastWeekAll}
                  {data.usersToday.lastWeekAll > 0 && (
                    <Text span c={data.usersToday.today >= data.usersToday.lastWeekAll ? 'green' : 'red'}>
                      {' '}({data.usersToday.today >= data.usersToday.lastWeekAll ? '+' : ''}
                      {Math.round(((data.usersToday.today - data.usersToday.lastWeekAll) / data.usersToday.lastWeekAll) * 100)}%)
                    </Text>
                  )}
                </Text>
                <Text size="xs" c="dimmed">
                  vs Last Week (same time): {data.usersToday.lastWeekSameTime}
                  {data.usersToday.lastWeekSameTime > 0 && (
                    <Text span c={data.usersToday.today >= data.usersToday.lastWeekSameTime ? 'green' : 'red'}>
                      {' '}({data.usersToday.today >= data.usersToday.lastWeekSameTime ? '+' : ''}
                      {Math.round(((data.usersToday.today - data.usersToday.lastWeekSameTime) / data.usersToday.lastWeekSameTime) * 100)}%)
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
                      vs Last Month (all month): {data.monthlyNewUsers.previousMonthAll}
                      {data.monthlyNewUsers.previousMonthAll > 0 && (
                        <Text span c={data.monthlyNewUsers.currentMonth >= data.monthlyNewUsers.previousMonthAll ? 'green' : 'red'}>
                          {' '}({data.monthlyNewUsers.currentMonth >= data.monthlyNewUsers.previousMonthAll ? '+' : ''}
                          {Math.round(((data.monthlyNewUsers.currentMonth - data.monthlyNewUsers.previousMonthAll) / data.monthlyNewUsers.previousMonthAll) * 100)}%)
                        </Text>
                      )}
                    </Text>
                    <Text size="xs" c="dimmed">
                      vs Last Month (same time): {data.monthlyNewUsers.previousMonthSameTime}
                      {data.monthlyNewUsers.previousMonthSameTime > 0 && (
                        <Text span c={data.monthlyNewUsers.currentMonth >= data.monthlyNewUsers.previousMonthSameTime ? 'green' : 'red'}>
                          {' '}({data.monthlyNewUsers.currentMonth >= data.monthlyNewUsers.previousMonthSameTime ? '+' : ''}
                          {Math.round(((data.monthlyNewUsers.currentMonth - data.monthlyNewUsers.previousMonthSameTime) / data.monthlyNewUsers.previousMonthSameTime) * 100)}%)
                        </Text>
                      )}
                    </Text>
                  </Stack>
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed">
                      vs {lastYearMonthLabel} (all month): {data.monthlyNewUsers.lastYearMonthAll}
                      {data.monthlyNewUsers.lastYearMonthAll > 0 && (
                        <Text span c={data.monthlyNewUsers.currentMonth >= data.monthlyNewUsers.lastYearMonthAll ? 'green' : 'red'}>
                          {' '}({data.monthlyNewUsers.currentMonth >= data.monthlyNewUsers.lastYearMonthAll ? '+' : ''}
                          {Math.round(((data.monthlyNewUsers.currentMonth - data.monthlyNewUsers.lastYearMonthAll) / data.monthlyNewUsers.lastYearMonthAll) * 100)}%)
                        </Text>
                      )}
                    </Text>
                    <Text size="xs" c="dimmed">
                      vs {lastYearMonthLabel} (same time): {data.monthlyNewUsers.lastYearMonthSameTime}
                      {data.monthlyNewUsers.lastYearMonthSameTime > 0 && (
                        <Text span c={data.monthlyNewUsers.currentMonth >= data.monthlyNewUsers.lastYearMonthSameTime ? 'green' : 'red'}>
                          {' '}({data.monthlyNewUsers.currentMonth >= data.monthlyNewUsers.lastYearMonthSameTime ? '+' : ''}
                          {Math.round(((data.monthlyNewUsers.currentMonth - data.monthlyNewUsers.lastYearMonthSameTime) / data.monthlyNewUsers.lastYearMonthSameTime) * 100)}%)
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
      </SimpleGrid>

      {/* Charts */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
        <TimeSeriesChart
          ref={totalUsersChartRef}
          title="Total Registered Users"
          subtitle="Cumulative user signups over time"
          data={data.monthlyData}
          dataKey="totalUsers"
          color="blue.6"
          showMoM={false}
        />
        <TimeSeriesChart
          ref={newUsersChartRef}
          title="New Users"
          subtitle="New registrations per month"
          data={data.monthlyData}
          dataKey="newUsers"
          color="green.6"
          chartType="bar"
        />
      </SimpleGrid>

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
                onChange={handleTimestampTypeChange}
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
            {data.topDomains['1d'].length === 0 ? (
              <Text c="dimmed" size="sm">
                {domainFilter ? 'No domains match the filter' : 'No registrations in the last day'}
              </Text>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Domain</Table.Th>
                    <Table.Th ta="right">Users</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.topDomains['1d'].map((item, index) => (
                    <Table.Tr key={item.domain}>
                      <Table.Td>
                        <Anchor component={Link} href={`/domains/${encodeURIComponent(item.domain)}`}>
                          {item.domain}
                        </Anchor>
                      </Table.Td>
                      <Table.Td ta="right">{item.userCount}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>

          {/* Top Domains - 7 Days */}
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Text fw={600} size="lg" mb="md">
              Top Domains (7 Days)
            </Text>
            {data.topDomains['7d'].length === 0 ? (
              <Text c="dimmed" size="sm">
                {domainFilter ? 'No domains match the filter' : 'No registrations in the last 7 days'}
              </Text>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Domain</Table.Th>
                    <Table.Th ta="right">Users</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.topDomains['7d'].map((item, index) => (
                    <Table.Tr key={item.domain}>
                      <Table.Td>
                        <Anchor component={Link} href={`/domains/${encodeURIComponent(item.domain)}`}>
                          {item.domain}
                        </Anchor>
                      </Table.Td>
                      <Table.Td ta="right">{item.userCount}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>

          {/* Top Domains - 30 Days */}
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Text fw={600} size="lg" mb="md">
              Top Domains (30 Days)
            </Text>
            {data.topDomains['30d'].length === 0 ? (
              <Text c="dimmed" size="sm">
                {domainFilter ? 'No domains match the filter' : 'No registrations in the last 30 days'}
              </Text>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Domain</Table.Th>
                    <Table.Th ta="right">Users</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.topDomains['30d'].map((item, index) => (
                    <Table.Tr key={item.domain}>
                      <Table.Td>
                        <Anchor component={Link} href={`/domains/${encodeURIComponent(item.domain)}`}>
                          {item.domain}
                        </Anchor>
                      </Table.Td>
                      <Table.Td ta="right">{item.userCount}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
          </SimpleGrid>
        </Stack>
      )}

      {/* Data Table */}
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Text fw={600} size="lg" mb="md">
          Recent Months
        </Text>
        <Table striped highlightOnHover>
          <Table.Thead>
              <Table.Tr>
                <Table.Th>Month</Table.Th>
                <Table.Th ta="right">Total</Table.Th>
                <Table.Th ta="right">New</Table.Th>
              </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {recentMonths.map((row) => (
              <Table.Tr key={row.month}>
                <Table.Td>{row.month}</Table.Td>
                <Table.Td ta="right">
                  {row.totalUsers.toLocaleString()}
                  {row.totalUsersMomChange !== 0 && (
                    <Text span size="xs" c={row.totalUsersMomChange >= 0 ? 'green' : 'red'} ml="xs">
                      ({row.totalUsersMomChange >= 0 ? '+' : ''}{row.totalUsersMomChange}%)
                    </Text>
                  )}
                </Table.Td>
                <Table.Td ta="right">
                  {row.newUsers.toLocaleString()}
                  {row.newUsersMomChange !== 0 && (
                    <Text span size="xs" c={row.newUsersMomChange >= 0 ? 'green' : 'red'} ml="xs">
                      ({row.newUsersMomChange >= 0 ? '+' : ''}{row.newUsersMomChange}%)
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Container>
  );
}
