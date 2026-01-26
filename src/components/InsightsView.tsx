'use client';

import { useEffect, useState, useRef } from 'react';
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
  TextInput,
  Anchor,
  SegmentedControl,
  Button,
  Switch,
} from '@mantine/core';
import { IconAlertCircle, IconSearch, IconUsers } from '@tabler/icons-react';
import { MetricCard } from './MetricCard';
import { TimeSeriesChart } from './TimeSeriesChart';
import { ExportButton } from './ExportButton';
import { UserHoverCard } from './UserHoverCard';
import { DataTable, Column } from './DataTable';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { InsightsResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useFilter } from '@/contexts/FilterContext';

export function InsightsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [search, setSearch] = useState('');
  
  // Initialize timeFilter from URL params
  const timeFilterParam = searchParams.get('timeFilter');
  const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | '1m' | null>(
    timeFilterParam && ['24h', '7d', '1m'].includes(timeFilterParam) 
      ? (timeFilterParam as '24h' | '7d' | '1m')
      : null
  );
  
  // Initialize chartPeriod from URL params
  const chartPeriodParam = searchParams.get('chartPeriod');
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>(
    chartPeriodParam && ['day', 'week', 'month'].includes(chartPeriodParam)
      ? (chartPeriodParam as 'day' | 'week' | 'month')
      : 'month'
  );
  
  // Initialize summaryPeriod from URL params
  const summaryPeriodParam = searchParams.get('summaryPeriod');
  const [summaryPeriod, setSummaryPeriod] = useState<'1d' | '7d' | '30d' | 'all'>(
    (summaryPeriodParam && ['1d', '7d', '30d', 'all'].includes(summaryPeriodParam)) 
      ? (summaryPeriodParam as '1d' | '7d' | '30d' | 'all')
      : 'all'
  );

  // Initialize showAnonymous from URL params
  const showAnonymousParam = searchParams.get('showAnonymous');
  const [showAnonymous, setShowAnonymous] = useState<boolean>(
    showAnonymousParam !== null ? showAnonymousParam === 'true' : true
  );

  const postsChartRef = useRef<HTMLDivElement>(null);
  const impressionsChartRef = useRef<HTMLDivElement>(null);
  const viewsChartRef = useRef<HTMLDivElement>(null);
  const reactionsChartRef = useRef<HTMLDivElement>(null);
  const uniqueVisitorsChartRef = useRef<HTMLDivElement>(null);
  const homefeedVisitorsChartRef = useRef<HTMLDivElement>(null);

  const chartRefs = [
    { name: 'unique-visitors', ref: uniqueVisitorsChartRef },
    { name: 'homefeed-visitors', ref: homefeedVisitorsChartRef },
    { name: 'engagements', ref: viewsChartRef },
    { name: 'impressions', ref: impressionsChartRef },
    { name: 'reactions', ref: reactionsChartRef },
    { name: 'posts', ref: postsChartRef },
  ];

  // Sync state when URL params change (e.g., browser back/forward)
  useEffect(() => {
    const urlFilter = searchParams.get('timeFilter');
    const newFilter = urlFilter && ['24h', '7d', '1m'].includes(urlFilter) 
      ? (urlFilter as '24h' | '7d' | '1m')
      : null;
    if (newFilter !== timeFilter) {
      setTimeFilter(newFilter);
    }
    
    const urlPeriod = searchParams.get('chartPeriod');
    const newPeriod = urlPeriod && ['day', 'week', 'month'].includes(urlPeriod)
      ? (urlPeriod as 'day' | 'week' | 'month')
      : 'month';
    if (newPeriod !== chartPeriod) {
      setChartPeriod(newPeriod);
    }
    
    const urlSummaryPeriod = searchParams.get('summaryPeriod');
    const newSummaryPeriod = (urlSummaryPeriod && ['1d', '7d', '30d', 'all'].includes(urlSummaryPeriod))
      ? (urlSummaryPeriod as '1d' | '7d' | '30d' | 'all')
      : 'all';
    if (newSummaryPeriod !== summaryPeriod) {
      setSummaryPeriod(newSummaryPeriod);
    }
    
    const urlShowAnonymous = searchParams.get('showAnonymous');
    const newShowAnonymous = urlShowAnonymous !== null ? urlShowAnonymous === 'true' : true;
    if (newShowAnonymous !== showAnonymous) {
      setShowAnonymous(newShowAnonymous);
    }
  }, [searchParams]);

  // Update URL when timeFilter, chartPeriod, or summaryPeriod changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (timeFilter) {
      params.set('timeFilter', timeFilter);
    } else {
      params.delete('timeFilter');
    }
    if (chartPeriod !== 'month') {
      params.set('chartPeriod', chartPeriod);
    } else {
      params.delete('chartPeriod');
    }
    if (summaryPeriod !== 'all') {
      params.set('summaryPeriod', summaryPeriod);
    } else {
      params.delete('summaryPeriod');
    }
    if (!showAnonymous) {
      params.set('showAnonymous', 'false');
    } else {
      params.delete('showAnonymous');
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    // Only update if URL would actually change
    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [timeFilter, chartPeriod, summaryPeriod, showAnonymous, pathname, router, searchParams]);

  const { filterGridstatus, timezone } = useFilter();
  const params = new URLSearchParams();
  params.set('filterGridstatus', filterGridstatus.toString());
  params.set('timezone', timezone);
  if (timeFilter) {
    params.set('timeFilter', timeFilter);
  }
  if (chartPeriod !== 'month') {
    params.set('chartPeriod', chartPeriod);
  }
  if (summaryPeriod !== 'all') {
    params.set('summaryPeriod', summaryPeriod);
  }
  const url = `/api/insights?${params.toString()}`;
  const { data, loading, error } = useApiData<InsightsResponse>(url, [url, filterGridstatus, timezone, summaryPeriod]);

  if (loading) {
    return (
      <Container fluid py="xl">
        <Stack gap="md">
          <Skeleton height={50} width={300} />
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            {[...Array(4)].map((_, i) => (
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
          No insights data available.
        </Alert>
      </Container>
    );
  }

  // Summary KPIs are now fetched directly from the API using dedicated queries
  // No need to calculate from monthlyData anymore

  const filteredPosts = data.topPosts
    .filter(
      (post) =>
        post.content.toLowerCase().includes(search.toLowerCase()) ||
        (post.username && post.username.toLowerCase().includes(search.toLowerCase()))
    )
    .slice(0, 100);

  // Truncate content for table display
  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  const columns: Column<typeof filteredPosts[0]>[] = [
    {
      id: 'content',
      header: 'Content',
      align: 'left',
      render: (row) => (
        <Anchor component={Link} href={`/insights/${row.id}`}>
          {truncateContent(row.content)}
        </Anchor>
      ),
      sortValue: (row) => row.content.toLowerCase(),
    },
    {
      id: 'author',
      header: 'Author',
      align: 'left',
      render: (row) => (
        <UserHoverCard
          userId={row.authorId}
          userName={row.username || row.email || `User ${row.authorId}`}
        />
      ),
      sortValue: (row) => (row.username || row.email || '').toLowerCase(),
    },
    {
      id: 'impressions',
      header: 'Impressions',
      align: 'right',
      render: (row) => row.impressions.toLocaleString(),
      sortValue: (row) => row.impressions,
    },
    {
      id: 'viewCount',
      header: 'Views',
      align: 'right',
      render: (row) => row.viewCount.toLocaleString(),
      sortValue: (row) => row.viewCount,
    },
    {
      id: 'engagementRate',
      header: 'Engagement',
      align: 'right',
      render: (row) =>
        row.impressions > 0 ? (
          <Text span fw={600} c={row.engagementRate >= 10 ? 'green' : row.engagementRate >= 5 ? 'yellow' : 'red'}>
            {row.engagementRate.toFixed(1)}%
          </Text>
        ) : (
          <Text span c="dimmed">N/A</Text>
        ),
      sortValue: (row) => row.engagementRate,
    },
    {
      id: 'likeCount',
      header: 'Up',
      align: 'right',
      render: (row) => row.likeCount,
      sortValue: (row) => row.likeCount,
    },
    {
      id: 'dislikeCount',
      header: 'Down',
      align: 'right',
      render: (row) => row.dislikeCount,
      sortValue: (row) => row.dislikeCount,
    },
    {
      id: 'saveCount',
      header: 'Saves',
      align: 'right',
      render: (row) => row.saveCount,
      sortValue: (row) => row.saveCount,
    },
    {
      id: 'createdAt',
      header: 'Created',
      align: 'left',
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
      sortValue: (row) => new Date(row.createdAt).getTime(),
    },
  ];

  return (
    <Container fluid py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Insights</Title>
        <Group>
          <Button
            component={Link}
            href="/insights/most-engaged-users"
            leftSection={<IconUsers size={16} />}
            variant="light"
          >
            Most Engaged Users
          </Button>
          <ExportButton charts={chartRefs} />
        </Group>
      </Group>
      {/* Summary Metrics */}
      <Group justify="space-between" mb="md">
        <Title order={2}>Summary</Title>
        <Group gap="md">
          <Switch
            label="Show anonymous users"
            checked={showAnonymous}
            onChange={(e) => setShowAnonymous(e.currentTarget.checked)}
          />
          <SegmentedControl
            value={summaryPeriod}
            onChange={(value) => setSummaryPeriod(value as '1d' | '7d' | '30d' | 'all')}
            data={[
              { label: '1d', value: '1d' },
              { label: '7d', value: '7d' },
              { label: '30d', value: '30d' },
              { label: 'All Time', value: 'all' },
            ]}
          />
        </Group>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 6 }} spacing="md" mb="xl">
        <MetricCard
          title="Unique Visitors (Any /insights/*)"
          value={showAnonymous ? data.summary.totalUniqueVisitors.toLocaleString() : data.summary.totalUniqueVisitorsLoggedIn.toLocaleString()}
          subtitle={
            showAnonymous ? (
              <Text size="xs" c="dimmed">
                Logged-in: {data.summary.totalUniqueVisitorsLoggedIn.toLocaleString()} • Anonymous: {data.summary.totalUniqueVisitorsAnon.toLocaleString()}
              </Text>
            ) : (
              <Text size="xs" c="dimmed">
                Logged-in users only
              </Text>
            )
          }
        />
        <MetricCard
          title="Homefeed Visitors (/insights)"
          value={showAnonymous ? data.summary.totalUniqueHomefeedVisitors.toLocaleString() : data.summary.totalUniqueHomefeedVisitorsLoggedIn.toLocaleString()}
          subtitle={
            showAnonymous ? (
              <Text size="xs" c="dimmed">
                Logged-in: {data.summary.totalUniqueHomefeedVisitorsLoggedIn.toLocaleString()} • Anonymous: {data.summary.totalUniqueHomefeedVisitorsAnon.toLocaleString()}
              </Text>
            ) : (
              <Text size="xs" c="dimmed">
                Logged-in users only
              </Text>
            )
          }
        />
        <MetricCard
          title="Engagements"
          value={data.summary.totalEngagements.toLocaleString()}
          subtitle="Logged-in users, clicked to read"
        />
        <MetricCard
          title="Impressions"
          value={data.summary.totalImpressions.toLocaleString()}
          subtitle="Logged-in users, seen in feed"
        />
        <MetricCard
          title="Reactions"
          value={data.summary.totalReactions.toLocaleString()}
          subtitle="Logged-in users only"
        />
        <MetricCard
          title="Total Posts"
          value={data.summary.totalPosts.toLocaleString()}
        />
      </SimpleGrid>

      {/* Charts */}
      <Group justify="space-between" mb="md">
        <Title order={2}>Summary Charts</Title>
        <SegmentedControl
          value={chartPeriod}
          onChange={(value) => setChartPeriod(value as 'day' | 'week' | 'month')}
          data={[
            { label: 'Day', value: 'day' },
            { label: 'Week', value: 'week' },
            { label: 'Month', value: 'month' },
          ]}
        />
      </Group>
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" mb="xl">
        <TimeSeriesChart
          ref={uniqueVisitorsChartRef}
          title="Unique Visitors"
          subtitle={`Any /insights/* page per ${chartPeriod === 'day' ? 'day' : chartPeriod === 'week' ? 'week' : 'month'}`}
          data={data.monthlyData}
          dataKey={showAnonymous ? 'uniqueVisitors' : 'uniqueVisitorsLoggedIn'}
          color="blue.6"
          chartType="bar"
          stacked={showAnonymous}
          stackedSeries={showAnonymous ? [
            { name: 'uniqueVisitorsLoggedIn', color: 'blue.6', label: 'Logged-in Users' },
            { name: 'uniqueVisitorsAnon', color: 'gray.5', label: 'Anonymous Users' },
          ] : []}
        />
        <TimeSeriesChart
          ref={homefeedVisitorsChartRef}
          title="Homefeed Visitors"
          subtitle={`Visited /insights per ${chartPeriod === 'day' ? 'day' : chartPeriod === 'week' ? 'week' : 'month'}`}
          data={data.monthlyData}
          dataKey={showAnonymous ? 'uniqueHomefeedVisitors' : 'uniqueHomefeedVisitorsLoggedIn'}
          color="teal.6"
          chartType="bar"
          stacked={showAnonymous}
          stackedSeries={showAnonymous ? [
            { name: 'uniqueHomefeedVisitorsLoggedIn', color: 'teal.6', label: 'Logged-in Users' },
            { name: 'uniqueHomefeedVisitorsAnon', color: 'gray.5', label: 'Anonymous Users' },
          ] : []}
        />
        <TimeSeriesChart
          ref={viewsChartRef}
          title="Engagements"
          subtitle={`Logged-in users, clicks to read per ${chartPeriod === 'day' ? 'day' : chartPeriod === 'week' ? 'week' : 'month'}`}
          data={data.monthlyData}
          dataKey="engagements"
          color="green.6"
          chartType="bar"
        />
        <TimeSeriesChart
          ref={impressionsChartRef}
          title="Impressions"
          subtitle={`Logged-in users, feed impressions per ${chartPeriod === 'day' ? 'day' : chartPeriod === 'week' ? 'week' : 'month'}`}
          data={data.monthlyData}
          dataKey="impressions"
          color="cyan.6"
          chartType="bar"
        />
        <TimeSeriesChart
          ref={reactionsChartRef}
          title="Reactions"
          subtitle={`Logged-in users, reactions per ${chartPeriod === 'day' ? 'day' : chartPeriod === 'week' ? 'week' : 'month'}`}
          data={data.monthlyData}
          dataKey="reactions"
          color="violet.6"
          chartType="bar"
        />
        <TimeSeriesChart
          ref={postsChartRef}
          title="Posts Published"
          subtitle={`Published posts per ${chartPeriod === 'day' ? 'day' : chartPeriod === 'week' ? 'week' : 'month'}`}
          data={data.monthlyData}
          dataKey="posts"
          color="orange.6"
          chartType="bar"
        />
      </SimpleGrid>

      {/* Top Posts Table */}
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600} size="lg">
            Top Posts
          </Text>
          <Group gap="md">
            <SegmentedControl
              value={timeFilter || 'all'}
              onChange={(value) => setTimeFilter(value === 'all' ? null : (value as '24h' | '7d' | '1m'))}
              data={[
                { label: 'All Time', value: 'all' },
                { label: 'Last 24h', value: '24h' },
                { label: 'Last 7d', value: '7d' },
                { label: 'Last 1m', value: '1m' },
              ]}
            />
            <TextInput
              placeholder="Search posts..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ width: 300 }}
            />
          </Group>
        </Group>
        <DataTable
          data={filteredPosts}
          columns={columns}
          keyField="id"
          defaultSort={{ column: 'viewCount', direction: 'desc' }}
        />
        <Text size="xs" c="dimmed" mt="md">
          Showing up to 100 posts, sorted by views and reactions. Engagement rate = (Views / Impressions) × 100%. Click on a post to see details.
        </Text>
      </Paper>
    </Container>
  );
}

