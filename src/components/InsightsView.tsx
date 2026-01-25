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

  const postsChartRef = useRef<HTMLDivElement>(null);
  const impressionsChartRef = useRef<HTMLDivElement>(null);
  const viewsChartRef = useRef<HTMLDivElement>(null);
  const reactionsChartRef = useRef<HTMLDivElement>(null);
  const authorsChartRef = useRef<HTMLDivElement>(null);

  const chartRefs = [
    { name: 'posts', ref: postsChartRef },
    { name: 'impressions', ref: impressionsChartRef },
    { name: 'views', ref: viewsChartRef },
    { name: 'reactions', ref: reactionsChartRef },
    { name: 'authors', ref: authorsChartRef },
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
  }, [searchParams]);

  // Update URL when timeFilter or chartPeriod changes
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
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    // Only update if URL would actually change
    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [timeFilter, chartPeriod, pathname, router, searchParams]);

  const { timezone } = useFilter();
  const params = new URLSearchParams();
  params.set('timezone', timezone);
  if (timeFilter) {
    params.set('timeFilter', timeFilter);
  }
  if (chartPeriod !== 'month') {
    params.set('chartPeriod', chartPeriod);
  }
  const url = `/api/insights?${params.toString()}`;
  const { data, loading, error } = useApiData<InsightsResponse>(url, [url, timezone]);

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
          No insights data available.
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
    <Container size="xl" py="xl">
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
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="xl">
        <MetricCard
          title="Total Posts"
          value={data.summary.totalPosts}
        />
        <MetricCard
          title="Impressions"
          value={data.summary.totalImpressions.toLocaleString()}
          trend={calculateTrend(
            latestMetric.impressions,
            previousMetric?.impressions
          )}
          trendLabel="MoM"
        />
        <MetricCard
          title="Views"
          value={data.summary.totalViews.toLocaleString()}
          trend={calculateTrend(
            latestMetric.views,
            previousMetric?.views
          )}
          trendLabel="MoM"
        />
        <MetricCard
          title="Total Reactions"
          value={data.summary.totalReactions}
          trend={calculateTrend(
            latestMetric.reactions,
            previousMetric?.reactions
          )}
          trendLabel="MoM"
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
          ref={postsChartRef}
          title="Posts Published"
          subtitle={`Published posts per ${chartPeriod === 'day' ? 'day' : chartPeriod === 'week' ? 'week' : 'month'}`}
          data={data.monthlyData}
          dataKey="posts"
          color="blue.6"
          chartType="bar"
        />
        <TimeSeriesChart
          ref={impressionsChartRef}
          title="Impressions"
          subtitle={`Feed impressions per ${chartPeriod === 'day' ? 'day' : chartPeriod === 'week' ? 'week' : 'month'}`}
          data={data.monthlyData}
          dataKey="impressions"
          color="cyan.6"
          chartType="bar"
        />
        <TimeSeriesChart
          ref={viewsChartRef}
          title="Post Views"
          subtitle={`Feed expanded + detail views per ${chartPeriod === 'day' ? 'day' : chartPeriod === 'week' ? 'week' : 'month'}`}
          data={data.monthlyData}
          dataKey="views"
          color="green.6"
          chartType="bar"
        />
        <TimeSeriesChart
          ref={reactionsChartRef}
          title="Reactions"
          subtitle={`Total reactions per ${chartPeriod === 'day' ? 'day' : chartPeriod === 'week' ? 'week' : 'month'}`}
          data={data.monthlyData}
          dataKey="reactions"
          color="violet.6"
          chartType="bar"
        />
        <TimeSeriesChart
          ref={authorsChartRef}
          title="Unique Authors"
          subtitle={`Authors publishing per ${chartPeriod === 'day' ? 'day' : chartPeriod === 'week' ? 'week' : 'month'}`}
          data={data.monthlyData}
          dataKey="authors"
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

