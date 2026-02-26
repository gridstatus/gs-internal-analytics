'use client';

import { useState, useMemo } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import {
  Stack,
  SimpleGrid,
  Paper,
  Text,
  Skeleton,
  Alert,
  Box,
  Group,
  TextInput,
  ScrollArea,
  Select,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { CompositeChart } from '@mantine/charts';
import { useFilter } from '@/contexts/FilterContext';
import { DEFAULT_CHART_LEGEND_PROPS } from '@/lib/chart-defaults';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { useQueryState } from 'nuqs';
import { UserHoverCard } from './UserHoverCard';
import { InfoHoverIcon } from './InfoHoverIcon';
import { DataTable, Column } from './DataTable';
import { AppContainer } from '@/components/AppContainer';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { PageBreadcrumbs } from './PageBreadcrumbs';
import type {
  TodaysPulseResponse,
  ReferrersResponse,
  MostActiveUsersResponse,
  MostViewedPagesResponse,
  ReferrerRow,
  MostActiveUsersRow,
  MostViewedPageRow,
} from '@/lib/api-types';

export function TodaysPulseView() {
  const { timezone } = useFilter();
  const [days] = useQueryState('days', { defaultValue: '7' });
  const [daysOffset] = useQueryState('days_offset', { defaultValue: '0' });
  const [referrersUserType, setReferrersUserType] = useQueryState('referrers_user_type', { defaultValue: 'all' });

  const pulseUrl = useApiUrl('/api/posthog/todays-pulse', {});
  const referrersUrl = useApiUrl('/api/posthog/referrers', {
    days,
    ...(referrersUserType !== 'all' && { user_type: referrersUserType }),
  });
  const mostPageviewsUrl = useApiUrl('/api/posthog/most-pageviews', { days_offset: daysOffset });
  const mostViewedPagesUrl = useApiUrl('/api/posthog/most-viewed-pages', { days });

  const { data: pulseData, loading: pulseLoading, error: pulseError } = useApiData<TodaysPulseResponse>(pulseUrl, [pulseUrl]);
  const { data: referrersData, loading: referrersLoading, error: referrersError } = useApiData<ReferrersResponse>(referrersUrl, [referrersUrl]);
  const { data: mostActiveData, loading: mostActiveLoading, error: mostActiveError } = useApiData<MostActiveUsersResponse>(mostPageviewsUrl, [mostPageviewsUrl]);
  const { data: pagesData, loading: pagesLoading, error: pagesError } = useApiData<MostViewedPagesResponse>(mostViewedPagesUrl, [mostViewedPagesUrl]);

  const loading = pulseLoading || referrersLoading || mostActiveLoading || pagesLoading;
  const error = pulseError || referrersError || mostActiveError || pagesError;

  const [referrersSearch, setReferrersSearch] = useState('');
  const [mostActiveSearch, setMostActiveSearch] = useState('');
  const [pagesSearch, setPagesSearch] = useState('');
  const [referrersSearchDebounced] = useDebouncedValue(referrersSearch, 300);
  const [mostActiveSearchDebounced] = useDebouncedValue(mostActiveSearch, 300);
  const [pagesSearchDebounced] = useDebouncedValue(pagesSearch, 300);

  if (loading) {
    return (
      <AppContainer>
        <Stack gap="md">
          <Skeleton height={50} width={300} />
          <Skeleton height={320} />
          <Skeleton height={320} />
          <Skeleton height={280} />
          <Skeleton height={280} />
          <Skeleton height={280} />
        </Stack>
      </AppContainer>
    );
  }

  if (error) {
    return (
      <AppContainer>
        <ErrorDisplay title="Error loading data" error={error} />
      </AppContainer>
    );
  }

  return (
    <AppContainer>
      <PageBreadcrumbs items={[{ label: "Today's Pulse" }]} />

      {/* Charts side by side */}
      {pulseData?.hourlyPulse && pulseData.hourlyPulse.length > 0 && (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Group gap="xs" mb="md" wrap="nowrap">
              <Text fw={600} size="lg">
                Unique active users per hour
              </Text>
              <InfoHoverIcon tooltip="Yesterday and previous week are aligned by hour of day so the comparison with today is fair." />
            </Group>
            <Box>
              <CompositeChart
                h={300}
                data={pulseData.hourlyPulse.map((row) => ({
                  ...row,
                  hourLabel: DateTime.fromISO(row.hour).setZone(timezone).toLocaleString(DateTime.TIME_SIMPLE),
                  Today: row.todayRaw,
                  Yesterday: row.yesterdayRaw,
                  'Previous week': row.lastWeekRaw,
                }))}
                dataKey="hourLabel"
                series={[
                  { name: 'Today', type: 'line', color: 'blue.6', label: 'Today' },
                  { name: 'Yesterday', type: 'line', color: 'gray.6', strokeDasharray: '5 5', label: 'Yesterday' },
                  { name: 'Previous week', type: 'line', color: 'orange.6', strokeDasharray: '3 3', label: 'Previous week' },
                ]}
                curveType="linear"
                withLegend
                legendProps={DEFAULT_CHART_LEGEND_PROPS}
                yAxisProps={{ domain: [0, 'auto'], tickFormatter: (v: number) => v.toLocaleString() }}
              />
            </Box>
          </Paper>
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Group gap="xs" mb="md" wrap="nowrap">
              <Text fw={600} size="lg">
                Cumulative unique active users by hour
              </Text>
              <InfoHoverIcon tooltip="Yesterday and previous week are aligned by hour of day so the comparison with today is fair." />
            </Group>
            <Box>
              <CompositeChart
                h={300}
                data={pulseData.hourlyPulse.map((row) => ({
                  ...row,
                  hourLabel: DateTime.fromISO(row.hour).setZone(timezone).toLocaleString(DateTime.TIME_SIMPLE),
                  Today: row.todayCum,
                  Yesterday: row.yesterdayCum,
                  'Previous week': row.lastWeekCum,
                }))}
                dataKey="hourLabel"
                series={[
                  { name: 'Today', type: 'line', color: 'blue.6', label: 'Today' },
                  { name: 'Yesterday', type: 'line', color: 'gray.6', strokeDasharray: '5 5', label: 'Yesterday' },
                  { name: 'Previous week', type: 'line', color: 'orange.6', strokeDasharray: '3 3', label: 'Previous week' },
                ]}
                curveType="linear"
                withLegend
                legendProps={DEFAULT_CHART_LEGEND_PROPS}
                yAxisProps={{ domain: [0, 'auto'], tickFormatter: (v: number) => v.toLocaleString() }}
              />
            </Box>
          </Paper>
        </SimpleGrid>
      )}

      {pulseData?.hourlyPulse?.length === 0 && (
        <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
          <Text c="dimmed" size="sm">
            No activity yet today.
          </Text>
        </Paper>
      )}

      {/* Top referrers - full width, scrollable */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Group justify="space-between" mb="md" wrap="wrap">
          <Group gap="xs" wrap="nowrap">
            <Text fw={600} size="lg">
              Top referrers by entry path / referrer
            </Text>
            <InfoHoverIcon tooltip="The 7- and 30-day averages are limited to the same time window each day (midnight to current time) so the comparison with today is fair." />
          </Group>
          <Group wrap="nowrap" gap="sm">
            <Select
              data={[
                { value: 'all', label: 'All users' },
                { value: 'logged_in', label: 'Logged in' },
                { value: 'anon', label: 'Anonymous' },
              ]}
              value={referrersUserType}
              onChange={(v) => setReferrersUserType(v ?? 'all')}
              allowDeselect={false}
              style={{ width: 140 }}
            />
            <TextInput
              placeholder="Search domain or path..."
              leftSection={<IconSearch size={16} />}
              value={referrersSearch}
              onChange={(e) => setReferrersSearch(e.target.value)}
              style={{ maxWidth: 300 }}
            />
          </Group>
        </Group>
        <ScrollArea h={400}>
          <ReferrersTable data={referrersData?.referrers ?? []} search={referrersSearchDebounced} />
        </ScrollArea>
        <Text size="xs" c="dimmed" mt="sm">
          Top 100. Averages use same time window each day. % = (Today − avg) / avg. Excludes self-referrals and direct.
        </Text>
      </Paper>

      {/* Most active users, Most viewed pages - side by side */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
        <Paper shadow="sm" p="md" radius="md" withBorder>
          <Group justify="space-between" mb="md" wrap="wrap">
            <Text fw={600} size="lg">
              Most active users
            </Text>
            <TextInput
              placeholder="Search by email..."
              leftSection={<IconSearch size={16} />}
              value={mostActiveSearch}
              onChange={(e) => setMostActiveSearch(e.target.value)}
              style={{ maxWidth: 300 }}
            />
          </Group>
          <ScrollArea h={400}>
            <MostActiveUsersTable data={mostActiveData?.rows ?? []} search={mostActiveSearchDebounced} />
          </ScrollArea>
          <Text size="xs" c="dimmed" mt="sm">
            Top 50. Page views and sessions. Use days_offset=1 in URL for yesterday.
          </Text>
        </Paper>

        <Paper shadow="sm" p="md" radius="md" withBorder>
          <Group justify="space-between" mb="md" wrap="wrap">
            <Group gap="xs" wrap="nowrap">
              <Text fw={600} size="lg">
                Pages with most views by logged-in users
              </Text>
              <InfoHoverIcon tooltip="The 7- and 30-day averages are limited to the same time window each day (midnight to current time) so the comparison with today is fair." />
            </Group>
            <TextInput
              placeholder="Search path..."
              leftSection={<IconSearch size={16} />}
              value={pagesSearch}
              onChange={(e) => setPagesSearch(e.target.value)}
              style={{ maxWidth: 300 }}
            />
          </Group>
          <ScrollArea h={400}>
            <MostViewedPagesTable data={pagesData?.pages ?? []} search={pagesSearchDebounced} />
          </ScrollArea>
          <Text size="xs" c="dimmed" mt="sm">
            Top 100. Averages use same time window each day. % = (Today − avg) / avg.
          </Text>
        </Paper>
      </SimpleGrid>
    </AppContainer>
  );
}

function avgWithPct(value: number, pct: number | null) {
  const valStr = value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (pct === null) return valStr;
  return (
    <>
      {valStr}{' '}
      <Text span c={pct >= 0 ? 'green.7' : 'red.7'} fw={500} size="sm">
        ({pct >= 0 ? '+' : ''}{pct}%)
      </Text>
    </>
  );
}

function ReferrersTable({ data, search }: { data: ReferrerRow[]; search: string }) {
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    const list = !s ? data : data.filter(
      (r) =>
        r.referringDomain.toLowerCase().includes(s) ||
        r.entryPathname.toLowerCase().includes(s)
    );
    return list.map((r) => ({ ...r, _key: `${r.referringDomain}\t${r.entryPathname}` }));
  }, [data, search]);

  const columns: Column<ReferrerRow & { _key: string }>[] = [
    {
      id: 'referringDomain',
      header: 'Referring domain',
      render: (r) => (
        <Box style={{ maxWidth: 140, overflow: 'hidden', minWidth: 0 }} title={r.referringDomain}>
          <Text size="sm" lineClamp={1}>
            {r.referringDomain}
          </Text>
        </Box>
      ),
      sortValue: (r) => r.referringDomain.toLowerCase(),
    },
    {
      id: 'entryPathname',
      header: 'Entry pathname',
      render: (r) => (
        <Box style={{ maxWidth: 180, overflow: 'hidden', minWidth: 0 }} title={r.entryPathname}>
          <Text size="sm" lineClamp={1}>
            {r.entryPathname}
          </Text>
        </Box>
      ),
      sortValue: (r) => r.entryPathname.toLowerCase(),
    },
    { id: 'uniqueUsersToday', header: 'Today', align: 'right', render: (r) => r.uniqueUsersToday.toLocaleString(), sortValue: (r) => r.uniqueUsersToday },
    {
      id: 'uniqueUsersAvg',
      header: '7-day avg',
      align: 'right',
      render: (r) => avgWithPct(r.uniqueUsersAvg, r.vsAvg7Change),
      sortValue: (r) => r.uniqueUsersAvg,
    },
    {
      id: 'uniqueUsersAvg30',
      header: '30-day avg',
      align: 'right',
      render: (r) => avgWithPct(r.uniqueUsersAvg30, r.vsAvg30Change),
      sortValue: (r) => r.uniqueUsersAvg30,
    },
  ];

  return (
    <DataTable
      data={filtered}
      columns={columns}
      keyField="_key"
      emptyMessage="No referrers found."
      defaultSort={{ column: 'uniqueUsersAvg', direction: 'desc' }}
    />
  );
}

function MostActiveUsersTable({ data, search }: { data: MostActiveUsersRow[]; search: string }) {
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return data;
    return data.filter((r) => r.email.toLowerCase().includes(s));
  }, [data, search]);

  const columns: Column<MostActiveUsersRow>[] = [
    {
      id: 'user',
      header: 'User',
      render: (row) => {
        if (row.userId) {
          return <UserHoverCard userId={row.userId} userName={row.email} />;
        }
        return <Text size="sm">{row.email}</Text>;
      },
      sortValue: (row) => row.email.toLowerCase(),
    },
    { id: 'pageViews', header: 'Page views', align: 'right', render: (row) => row.pageViews.toLocaleString(), sortValue: (row) => row.pageViews },
    { id: 'sessions', header: 'Sessions', align: 'right', render: (row) => row.sessions.toLocaleString(), sortValue: (row) => row.sessions },
  ];

  return (
    <DataTable
      data={filtered}
      columns={columns}
      keyField="email"
      emptyMessage="No data."
      defaultSort={{ column: 'sessions', direction: 'desc' }}
    />
  );
}

function MostViewedPagesTable({ data, search }: { data: MostViewedPageRow[]; search: string }) {
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return data;
    return data.filter((r) => r.pathname.toLowerCase().includes(s));
  }, [data, search]);

  const columns: Column<MostViewedPageRow>[] = [
    {
      id: 'pathname',
      header: 'Page',
      render: (r) => (
        <Box style={{ maxWidth: 180, overflow: 'hidden', minWidth: 0 }} title={r.pathname}>
          <Text size="sm" lineClamp={1}>
            {r.pathname}
          </Text>
        </Box>
      ),
      sortValue: (r) => r.pathname.toLowerCase(),
    },
    { id: 'viewsToday', header: 'Today', align: 'right', render: (r) => r.viewsToday.toLocaleString(), sortValue: (r) => r.viewsToday },
    {
      id: 'viewsAvg',
      header: '7-day avg',
      align: 'right',
      render: (r) => avgWithPct(r.viewsAvg, r.vsAvg7Change),
      sortValue: (r) => r.viewsAvg,
    },
    {
      id: 'viewsAvg30',
      header: '30-day avg',
      align: 'right',
      render: (r) => avgWithPct(r.viewsAvg30, r.vsAvg30Change),
      sortValue: (r) => r.viewsAvg30,
    },
  ];

  return (
    <DataTable
      data={filtered}
      columns={columns}
      keyField="pathname"
      emptyMessage="No pages found."
      defaultSort={{ column: 'viewsAvg', direction: 'desc' }}
    />
  );
}
