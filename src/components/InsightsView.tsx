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
  Table,
  Paper,
  Text,
  TextInput,
  Anchor,
  SegmentedControl,
} from '@mantine/core';
import { IconAlertCircle, IconSearch } from '@tabler/icons-react';
import { MetricCard } from './MetricCard';
import { TimeSeriesChart } from './TimeSeriesChart';
import { ExportButton } from './ExportButton';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface MonthlyInsightData {
  month: string;
  posts: number;
  authors: number;
  impressions: number;
  views: number;
  postsViewed: number;
  uniqueViewers: number;
  uniqueImpressionUsers: number;
  reactions: number;
  likes: number;
  dislikes: number;
  postsWithReactions: number;
  uniqueReactors: number;
  postsMomChange: number;
  impressionsMomChange: number;
  viewsMomChange: number;
  reactionsMomChange: number;
}

interface TopPost {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorId: number;
  username: string | null;
  email: string | null;
  impressions: number;
  viewCount: number;
  reactionCount: number;
  saveCount: number;
  likeCount: number;
  dislikeCount: number;
  engagementRate: number;
}

interface InsightsResponse {
  summary: {
    totalPosts: number;
    totalImpressions: number;
    totalViews: number;
    totalReactions: number;
    uniqueAuthors: number;
  };
  monthlyData: MonthlyInsightData[];
  topPosts: TopPost[];
}

export function InsightsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Initialize timeFilter from URL params
  const timeFilterParam = searchParams.get('timeFilter');
  const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | '1m' | null>(
    timeFilterParam && ['24h', '7d', '1m'].includes(timeFilterParam) 
      ? (timeFilterParam as '24h' | '7d' | '1m')
      : null
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
  }, [searchParams]);

  // Update URL when timeFilter changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (timeFilter) {
      params.set('timeFilter', timeFilter);
    } else {
      params.delete('timeFilter');
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    // Only update if URL would actually change
    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [timeFilter, pathname, router, searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const url = timeFilter 
          ? `/api/insights?timeFilter=${timeFilter}`
          : '/api/insights';
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch insights data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeFilter]);

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

  const filteredPosts = data.topPosts.filter(
    (post) =>
      post.content.toLowerCase().includes(search.toLowerCase()) ||
      (post.username && post.username.toLowerCase().includes(search.toLowerCase()))
  );

  // Truncate content for table display
  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Insights</Title>
        <ExportButton charts={chartRefs} />
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
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" mb="xl">
        <TimeSeriesChart
          ref={postsChartRef}
          title="Posts Published"
          subtitle="Published posts per month"
          data={data.monthlyData}
          dataKey="posts"
          color="blue.6"
          chartType="bar"
        />
        <TimeSeriesChart
          ref={impressionsChartRef}
          title="Impressions"
          subtitle="Feed impressions per month"
          data={data.monthlyData}
          dataKey="impressions"
          color="cyan.6"
          chartType="bar"
        />
        <TimeSeriesChart
          ref={viewsChartRef}
          title="Post Views"
          subtitle="Feed expanded + detail views per month"
          data={data.monthlyData}
          dataKey="views"
          color="green.6"
          chartType="bar"
        />
        <TimeSeriesChart
          ref={reactionsChartRef}
          title="Reactions"
          subtitle="Total reactions per month"
          data={data.monthlyData}
          dataKey="reactions"
          color="violet.6"
          chartType="bar"
        />
        <TimeSeriesChart
          ref={authorsChartRef}
          title="Unique Authors"
          subtitle="Authors publishing per month"
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
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Content</Table.Th>
              <Table.Th>Author</Table.Th>
              <Table.Th ta="right">Impressions</Table.Th>
              <Table.Th ta="right">Views</Table.Th>
              <Table.Th ta="right">Engagement</Table.Th>
              <Table.Th ta="right">Up</Table.Th>
              <Table.Th ta="right">Down</Table.Th>
              <Table.Th ta="right">Saves</Table.Th>
              <Table.Th>Created</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredPosts.slice(0, 100).map((post) => (
              <Table.Tr key={post.id}>
                <Table.Td>
                  <Anchor component={Link} href={`/insights/${post.id}`}>
                    {truncateContent(post.content)}
                  </Anchor>
                </Table.Td>
                <Table.Td>{post.username || post.email || `User ${post.authorId}`}</Table.Td>
                <Table.Td ta="right">{post.impressions.toLocaleString()}</Table.Td>
                <Table.Td ta="right">{post.viewCount.toLocaleString()}</Table.Td>
                <Table.Td ta="right">
                  {post.impressions > 0 ? (
                    <Text span fw={600} c={post.engagementRate >= 10 ? 'green' : post.engagementRate >= 5 ? 'yellow' : 'red'}>
                      {post.engagementRate.toFixed(1)}%
                    </Text>
                  ) : (
                    <Text span c="dimmed">N/A</Text>
                  )}
                </Table.Td>
                <Table.Td ta="right">{post.likeCount}</Table.Td>
                <Table.Td ta="right">{post.dislikeCount}</Table.Td>
                <Table.Td ta="right">{post.saveCount}</Table.Td>
                <Table.Td>
                  {new Date(post.createdAt).toLocaleDateString()}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Text size="xs" c="dimmed" mt="md">
          Showing up to 100 posts, sorted by views and reactions. Engagement rate = (Views / Impressions) × 100%. Click on a post to see details.
        </Text>
      </Paper>
    </Container>
  );
}

