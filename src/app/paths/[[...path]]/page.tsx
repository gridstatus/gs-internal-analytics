'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryState, parseAsStringEnum } from 'nuqs';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { useDebouncedValue } from '@mantine/hooks';
import {
  Autocomplete,
  Paper,
  Text,
  Group,
  SimpleGrid,
  Loader,
  Stack,
  TextInput,
  SegmentedControl,
  Anchor,
} from '@mantine/core';
import { IconExternalLink, IconSearch } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import Link from 'next/link';
import { AppContainer } from '@/components/AppContainer';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { MetricCard } from '@/components/MetricCard';
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs';
import { UserHoverCard } from '@/components/UserHoverCard';
import { DataTable, Column } from '@/components/DataTable';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import type { MostActiveUsersRow } from '@/lib/api-types';

interface PathQuickItem {
  pathname: string;
  views?: number;
  uniqueUsers?: number;
  lastSeen?: string;
}

interface PathQuickResponse {
  topByViews: PathQuickItem[];
  recent: PathQuickItem[];
  topByUniqueUsers: PathQuickItem[];
}

interface PathData {
  pathname: string;
  stats: { views: number; uniqueUsers: number };
  users: Array<MostActiveUsersRow>;
  timeSeries: Array<{ period: string; uniqueSessions: number; uniqueUsers: number }>;
  referrers: Array<{ referringDomain: string; uniqueUsers: number; sessions: number }>;
}

function pathSegmentsToPathname(segments: string[]): string {
  if (segments.length === 0) return '/';
  return '/' + segments.join('/');
}

export default function PathDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathSegments = (params.path as string[] | undefined) ?? [];
  const pathname = pathSegmentsToPathname(pathSegments);

  const [days, setDays] = useQueryState(
    'days',
    parseAsStringEnum(['7', '30', '365', 'all']).withDefault('30')
  );
  const detailUrl = useApiUrl(`/api/posthog/paths/${pathSegments.join('/') || '_'}`, { days });
  const url = pathSegments.length > 0 ? detailUrl : null;
  const { data, loading, error } = useApiData<PathData>(url, [url]);

  const quickUrl = useApiUrl('/api/posthog/paths/quick', {});
  const pathQuickUrl = pathSegments.length === 0 ? quickUrl : null;
  const { data: pathQuickData, loading: pathQuickLoading } = useApiData<PathQuickResponse>(pathQuickUrl, [pathQuickUrl]);

  const [search, setSearch] = useState('');
  const [searchDebounced] = useDebouncedValue(search, 300);
  const filteredUsers = useMemo(() => {
    const s = searchDebounced.toLowerCase();
    if (!s) return data?.users ?? [];
    return (data?.users ?? []).filter((r) => r.email.toLowerCase().includes(s));
  }, [data?.users, searchDebounced]);

  const referrerColumns: Column<{ referringDomain: string; uniqueUsers: number; sessions: number }>[] = [
    {
      id: 'referringDomain',
      header: 'Referring domain',
      render: (row) => (
        <Anchor href={`https://${row.referringDomain}`} target="_blank" rel="noopener noreferrer" size="sm">
          <Group gap={4} wrap="nowrap" display="inline-flex">
            {row.referringDomain}
            <IconExternalLink size={12} />
          </Group>
        </Anchor>
      ),
      sortValue: (row) => row.referringDomain,
    },
    {
      id: 'uniqueUsers',
      header: 'Unique users',
      align: 'right',
      render: (row) => row.uniqueUsers.toLocaleString(),
      sortValue: (row) => row.uniqueUsers,
    },
    {
      id: 'sessions',
      header: 'Sessions',
      align: 'right',
      render: (row) => row.sessions.toLocaleString(),
      sortValue: (row) => row.sessions,
    },
  ];

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
    {
      id: 'pageViews',
      header: 'Page views',
      align: 'right',
      render: (row) => row.pageViews.toLocaleString(),
      sortValue: (row) => row.pageViews,
    },
    {
      id: 'sessions',
      header: 'Sessions',
      align: 'right',
      render: (row) => row.sessions.toLocaleString(),
      sortValue: (row) => row.sessions,
    },
    {
      id: 'daysActive',
      header: 'Days active',
      align: 'right',
      render: (row) => (row.daysActive ?? 0).toLocaleString(),
      sortValue: (row) => row.daysActive ?? 0,
    },
  ];

  function pathHref(pathname: string) {
    return `/paths${pathname === '/' ? '' : pathname.startsWith('/') ? pathname : `/${pathname}`}`;
  }

  const [searchValue, setSearchValue] = useState('');

  const allQuickPaths = useMemo(() => {
    if (!pathQuickData) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const list of [pathQuickData.topByViews, pathQuickData.topByUniqueUsers, pathQuickData.recent]) {
      for (const p of list) {
        if (!seen.has(p.pathname)) {
          seen.add(p.pathname);
          out.push(p.pathname);
        }
      }
    }
    return out;
  }, [pathQuickData]);

  const SEARCH_PREFIX = '__search__:';

  const autocompleteData = useMemo(() => {
    if (!searchValue.trim()) return allQuickPaths;
    const normalized = searchValue.trim().startsWith('/') ? searchValue.trim() : `/${searchValue.trim()}`;
    // Put the "search for X" sentinel first, then filtered suggestions
    return [`${SEARCH_PREFIX}${normalized}`, ...allQuickPaths];
  }, [searchValue, allQuickPaths]);

  function navigateToPath(raw: string) {
    const pathname = raw.trim().startsWith('/') ? raw.trim() : `/${raw.trim()}`;
    if (pathname && pathname !== '/') {
      const segments = pathname.slice(1).split('/').filter(Boolean);
      router.push(`/paths/${segments.join('/')}`);
    }
  }

  if (pathSegments.length === 0) {
    const quickLoading = pathQuickLoading;
    const quick = pathQuickData;
    return (
      <AppContainer>
        <PageBreadcrumbs items={[{ label: 'Path' }]} />
        <Stack gap="lg">
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Text fw={600} size="lg" mb="xs">
              Search
            </Text>
            <Autocomplete
              placeholder="/outages or /dashboard"
              size="sm"
              style={{ maxWidth: 400 }}
              value={searchValue}
              onChange={setSearchValue}
              data={autocompleteData}
              limit={11}
              selectFirstOptionOnChange
              filter={({ options, search }) => {
                const q = search.trim().toLowerCase();
                if (!q) return options;
                return options.filter((o) => {
                  const val = typeof o === 'string' ? o : (o as { value: string }).value;
                  // Always keep the sentinel, filter the rest by pathname match
                  if (val.startsWith(SEARCH_PREFIX)) return true;
                  return val.toLowerCase().includes(q);
                });
              }}
              renderOption={({ option }) => {
                const val = typeof option === 'string' ? option : (option as { value: string }).value;
                if (val.startsWith(SEARCH_PREFIX)) {
                  const path = val.slice(SEARCH_PREFIX.length);
                  return (
                    <Group gap="xs">
                      <IconSearch size={14} />
                      <Text size="sm">Search for <strong>{path}</strong></Text>
                    </Group>
                  );
                }
                return <Text size="sm">{val}</Text>;
              }}
              onOptionSubmit={(value) => {
                if (value.startsWith(SEARCH_PREFIX)) {
                  navigateToPath(value.slice(SEARCH_PREFIX.length));
                } else {
                  navigateToPath(value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  navigateToPath((e.target as HTMLInputElement).value);
                }
              }}
            />
          </Paper>
          <div>
            <Text fw={600} size="sm" c="dimmed" tt="uppercase" mb="sm">
              Quick select
            </Text>
            {quickLoading ? (
              <Stack align="center" py="xl">
                <Loader size="sm" />
              </Stack>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                <Paper shadow="sm" p="md" radius="md" withBorder>
                  <Text fw={600} size="sm" mb="md">
                    Top by views (24h)
                  </Text>
                  {quick?.topByViews && quick.topByViews.length > 0 ? (
                    <Stack gap={6}>
                      {quick.topByViews.map((p, i) => (
                        <Group key={i} justify="space-between" wrap="nowrap" gap="xs">
                          <Anchor
                            component={Link}
                            href={pathHref(p.pathname)}
                            size="sm"
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}
                            title={p.pathname}
                          >
                            {p.pathname}
                          </Anchor>
                          {p.views != null && (
                            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                              {p.views.toLocaleString()}
                            </Text>
                          )}
                        </Group>
                      ))}
                    </Stack>
                  ) : (
                    <Text c="dimmed" size="sm">No data</Text>
                  )}
                </Paper>
                <Paper shadow="sm" p="md" radius="md" withBorder>
                  <Text fw={600} size="sm" mb="md">
                    By unique users (24h)
                  </Text>
                  {quick?.topByUniqueUsers && quick.topByUniqueUsers.length > 0 ? (
                    <Stack gap={6}>
                      {quick.topByUniqueUsers.map((p, i) => (
                        <Group key={i} justify="space-between" wrap="nowrap" gap="xs">
                          <Anchor
                            component={Link}
                            href={pathHref(p.pathname)}
                            size="sm"
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}
                            title={p.pathname}
                          >
                            {p.pathname}
                          </Anchor>
                          {p.uniqueUsers != null && (
                            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                              {p.uniqueUsers.toLocaleString()}
                            </Text>
                          )}
                        </Group>
                      ))}
                    </Stack>
                  ) : (
                    <Text c="dimmed" size="sm">No data</Text>
                  )}
                </Paper>
                <Paper shadow="sm" p="md" radius="md" withBorder>
                  <Text fw={600} size="sm" mb="md">
                    Last visited
                  </Text>
                  {quick?.recent && quick.recent.length > 0 ? (
                    <Stack gap={6}>
                      {quick.recent.map((p, i) => (
                        <Group key={i} justify="space-between" wrap="nowrap" gap="xs">
                          <Anchor
                            component={Link}
                            href={pathHref(p.pathname)}
                            size="sm"
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}
                            title={p.pathname}
                          >
                            {p.pathname}
                          </Anchor>
                          {p.lastSeen && (
                            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }} title={p.lastSeen}>
                              {DateTime.fromISO(p.lastSeen).toRelative()}
                            </Text>
                          )}
                        </Group>
                      ))}
                    </Stack>
                  ) : (
                    <Text c="dimmed" size="sm">No data</Text>
                  )}
                </Paper>
              </SimpleGrid>
            )}
          </div>
        </Stack>
      </AppContainer>
    );
  }

  if (loading) {
    return (
      <AppContainer>
        <PageBreadcrumbs
          items={[
            { label: 'Path', href: '/paths' },
            { label: pathname === '/' ? pathname : pathname.slice(1) },
          ]}
        />
        <Stack align="center" py="xl">
          <Loader />
        </Stack>
      </AppContainer>
    );
  }

  if (error || !data) {
    return (
      <AppContainer>
        <ErrorDisplay
          title="Error loading path"
          error={error || 'Path data not available'}
        />
      </AppContainer>
    );
  }

  return (
    <AppContainer>
      <Group justify="space-between" align="center" wrap="wrap" gap="md" mb="md">
        <PageBreadcrumbs
          items={[
            { label: 'Path', href: '/paths' },
            { label: data.pathname === '/' ? data.pathname : data.pathname.slice(1) },
          ]}
        />
        <Anchor
          href={`https://www.gridstatus.io${data.pathname}`}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
        >
          <Group gap={4} wrap="nowrap" display="inline-flex">
            View on gridstatus.io
            <IconExternalLink size={14} />
          </Group>
        </Anchor>
      </Group>

      <Group justify="space-between" align="flex-end" wrap="wrap" gap="md" mb="md">
        <Text size="sm" fw={500} c="dimmed">
          Time range
        </Text>
        <SegmentedControl
          size="xs"
          value={days}
          onChange={(v) => setDays((v as '7' | '30' | '365' | 'all') ?? '30')}
          data={[
            { label: '7d', value: '7' },
            { label: '30d', value: '30' },
            { label: '365d', value: '365' },
            { label: 'All', value: 'all' },
          ]}
        />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="xl">
        <MetricCard title="Page views" value={data.stats.views} />
        <MetricCard title="Unique users" value={data.stats.uniqueUsers} />
      </SimpleGrid>

      {data.timeSeries && data.timeSeries.length > 0 && (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
          <TimeSeriesChart
            title="Unique sessions over time"
            subtitle={days === 'all' ? 'Last 2 years (all time)' : `Last ${days} days`}
            data={data.timeSeries.map((t) => ({ month: t.period, uniqueSessions: t.uniqueSessions }))}
            dataKey="uniqueSessions"
            color="blue.6"
            chartType="bar"
            height={300}
          />
          <TimeSeriesChart
            title="Unique users over time"
            subtitle={days === 'all' ? 'Last 2 years (all time)' : `Last ${days} days`}
            data={data.timeSeries.map((t) => ({ month: t.period, uniqueUsers: t.uniqueUsers }))}
            dataKey="uniqueUsers"
            color="teal.6"
            chartType="bar"
            height={300}
          />
        </SimpleGrid>
      )}

      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Stack gap={2} mb="md">
          <Text fw={600} size="lg">
            Users who visited this path
          </Text>
          <Text size="sm" c="dimmed">
            Logged-in users with at least one $pageview to {data.pathname}
          </Text>
        </Stack>
        <TextInput
          placeholder="Search by email..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          mb="md"
          size="xs"
          style={{ maxWidth: 280 }}
        />
        {filteredUsers.length === 0 ? (
          <Text c="dimmed" size="sm">
            No users in this period
          </Text>
        ) : (
          <DataTable
            data={filteredUsers}
            columns={columns}
            keyField="email"
            defaultSort={{ column: 'pageViews', direction: 'desc' }}
          />
        )}
      </Paper>

      {data.referrers && data.referrers.length > 0 && (
        <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
          <Stack gap={2} mb="md">
            <Text fw={600} size="lg">
              Top referrers (entry point)
            </Text>
            <Text size="sm" c="dimmed">
              Referring domains for sessions where {data.pathname} was the entry page
            </Text>
          </Stack>
          <DataTable
            data={data.referrers}
            columns={referrerColumns}
            keyField="referringDomain"
            defaultSort={{ column: 'uniqueUsers', direction: 'desc' }}
          />
        </Paper>
      )}
    </AppContainer>
  );
}
