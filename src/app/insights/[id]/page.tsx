'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Table,
  Text,
  Group,
  Grid,
  SimpleGrid,
  Loader,
  Alert,
  Stack,
  Anchor,
  Badge,
  SegmentedControl,
  Tabs,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconEye, IconThumbUp, IconBookmark } from '@tabler/icons-react';
import { MetricCard } from '@/components/MetricCard';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import { UserHoverCard } from '@/components/UserHoverCard';
import { DataTable, Column } from '@/components/DataTable';
import Link from 'next/link';

interface InsightDetail {
  post: {
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    status: string;
    author: {
      id: number;
      username: string | null;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
    };
  };
  stats: {
    impressions: {
      total: number;
      uniqueUsers: number;
    };
    views: {
      total: number;
      uniqueUsers: number;
    };
    totalViews: number;
    engagementRate: number;
    reactions: {
      total: number;
      likes: number;
      dislikes: number;
      uniqueUsers: number;
    };
    saves: {
      total: number;
      uniqueUsers: number;
    };
  };
  tags: Array<{
    id: number;
    name: string;
    description: string | null;
  }>;
  hourlyViews: Array<{
    hour: string;
    views: number;
    uniqueViewers: number;
  }>;
  dailyViews: Array<{
    day: string;
    views: number;
    uniqueViewers: number;
  }>;
  monthlyViews: Array<{
    month: string;
    views: number;
    uniqueViewers: number;
  }>;
  viewers: Array<{
    userId: number;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    impressions: number;
    views: number;
    firstViewed: string;
    lastViewed: string;
  }>;
  reactors: Array<{
    userId: number;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    reactionType: string;
    createdAt: string;
  }>;
  savers: Array<{
    userId: number;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    createdAt: string;
  }>;
}

export default function InsightDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<InsightDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<'hour' | 'day' | 'month'>('day');
  const [activeTab, setActiveTab] = useState<string | null>('viewers');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/insights/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Insight not found');
          } else {
            throw new Error('Failed to fetch insight data');
          }
          return;
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" py="xl">
          <Loader />
        </Stack>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container size="xl" py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error loading insight"
          color="red"
        >
          {error || 'Insight data not available'}
        </Alert>
      </Container>
    );
  }

  const authorName = data.post.author.username ||
    data.post.author.email ||
    `${data.post.author.firstName || ''} ${data.post.author.lastName || ''}`.trim() ||
    `User ${data.post.author.id}`;

  const getUserName = (user: { userId: number; username: string | null; firstName: string | null; lastName: string | null }) => {
    return user.username ||
      `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
      `User ${user.userId}`;
  };

  return (
    <Container size="xl" py="md">
      {/* Compact Header */}
      <Group mb="md">
        <Anchor
          component={Link}
          href="/insights"
          size="sm"
          c="dimmed"
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <IconArrowLeft size={16} />
          Back
        </Anchor>
      </Group>

      {/* Post Content Preview */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="md">
        <Stack gap="sm">
          <Text size="sm" c="dimmed" lineClamp={4}>
            {data.post.content}
          </Text>
          <Group justify="space-between" wrap="wrap">
            <Group gap="md">
              <Text size="sm" c="dimmed">
                By <UserHoverCard userId={data.post.author.id} userName={authorName} />
              </Text>
              <Text size="sm" c="dimmed">
                {new Date(data.post.createdAt).toLocaleDateString()}
              </Text>
              <Badge variant="light" color={data.post.status === 'PUBLISHED' ? 'green' : 'gray'}>
                {data.post.status}
              </Badge>
              {data.tags.length > 0 && (
                <Group gap="xs">
                  {data.tags.map((tag) => (
                    <Badge key={tag.id} variant="light" color="blue" size="sm">
                      {tag.name}
                    </Badge>
                  ))}
                </Group>
              )}
            </Group>
            <Anchor
              href={`https://gridstatus.io/insights/${data.post.id}`}
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
              fw={500}
            >
              View on GridStatus.io →
            </Anchor>
          </Group>
        </Stack>
      </Paper>

      {/* Two-column layout: Stats + Chart */}
      <Grid gutter="md" mb="md">
        {/* Left: Stats */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            <SimpleGrid cols={2} spacing="md">
              <MetricCard
                title="Impressions"
                value={data.stats.impressions.total.toLocaleString()}
                subtitle={`${data.stats.impressions.uniqueUsers} unique`}
              />
              <MetricCard
                title="Views"
                value={data.stats.views.total.toLocaleString()}
                subtitle={`${data.stats.views.uniqueUsers} unique`}
              />
              <MetricCard
                title="Engagement"
                value={data.stats.engagementRate > 0 ? `${data.stats.engagementRate.toFixed(1)}%` : 'N/A'}
                subtitle="views / impressions"
              />
            </SimpleGrid>
          </Stack>
        </Grid.Col>

        {/* Right: Chart */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Group justify="flex-end" mb="xs">
            <SegmentedControl
              size="xs"
              value={timePeriod}
              onChange={(value) => setTimePeriod(value as 'hour' | 'day' | 'month')}
              data={[
                { label: 'Hourly', value: 'hour' },
                { label: 'Daily', value: 'day' },
                { label: 'Monthly', value: 'month' },
              ]}
            />
          </Group>
          {timePeriod === 'hour' && data.hourlyViews.length > 0 && (
            <TimeSeriesChart
              title="Views Over Time"
              subtitle=""
              data={[...data.hourlyViews].reverse().map((hv) => ({
                month: hv.hour,
                views: hv.views,
              }))}
              dataKey="views"
              color="blue.6"
              chartType="bar"
              height={200}
            />
          )}
          {timePeriod === 'day' && data.dailyViews.length > 0 && (
            <TimeSeriesChart
              title="Views Over Time"
              subtitle=""
              data={[...data.dailyViews].reverse().map((dv) => ({
                month: dv.day,
                views: dv.views,
              }))}
              dataKey="views"
              color="blue.6"
              chartType="bar"
              height={200}
            />
          )}
          {timePeriod === 'month' && data.monthlyViews.length > 0 && (
            <TimeSeriesChart
              title="Views Over Time"
              subtitle=""
              data={[...data.monthlyViews].reverse().map((mv) => ({
                month: mv.month,
                views: mv.views,
              }))}
              dataKey="views"
              color="blue.6"
              chartType="bar"
              height={200}
            />
          )}
          {((timePeriod === 'hour' && data.hourlyViews.length === 0) ||
            (timePeriod === 'day' && data.dailyViews.length === 0) ||
            (timePeriod === 'month' && data.monthlyViews.length === 0)) && (
            <Paper shadow="sm" p="md" radius="md" withBorder>
              <Text c="dimmed" ta="center" py="xl">
                No data available
              </Text>
            </Paper>
          )}
        </Grid.Col>
      </Grid>

      {/* Tabbed User Engagement Section */}
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="viewers" leftSection={<IconEye size={16} />}>
              Viewers ({data.viewers.length})
            </Tabs.Tab>
            <Tabs.Tab value="reactors" leftSection={<IconThumbUp size={16} />}>
              Reactions ({data.reactors.length})
            </Tabs.Tab>
            <Tabs.Tab value="savers" leftSection={<IconBookmark size={16} />}>
              Saves ({data.savers.length})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="viewers" pt="md">
            <DataTable
              data={data.viewers}
              columns={[
                {
                  id: 'user',
                  header: 'User',
                  align: 'left',
                  render: (row) => <UserHoverCard userId={row.userId} userName={getUserName(row)} />,
                  sortValue: (row) => getUserName(row).toLowerCase(),
                },
                {
                  id: 'impressions',
                  header: 'Impressions',
                  align: 'right',
                  render: (row) => row.impressions,
                  sortValue: (row) => row.impressions,
                },
                {
                  id: 'views',
                  header: 'Views',
                  align: 'right',
                  render: (row) => row.views,
                  sortValue: (row) => row.views,
                },
                {
                  id: 'firstViewed',
                  header: 'First Viewed',
                  align: 'left',
                  render: (row) => new Date(row.firstViewed).toLocaleString(),
                  sortValue: (row) => new Date(row.firstViewed).getTime(),
                },
                {
                  id: 'lastViewed',
                  header: 'Last Viewed',
                  align: 'left',
                  render: (row) => new Date(row.lastViewed).toLocaleString(),
                  sortValue: (row) => new Date(row.lastViewed).getTime(),
                },
              ]}
              keyField="userId"
              emptyMessage="No viewers yet"
            />
            {data.viewers.length >= 100 && (
              <Text size="xs" c="dimmed" mt="md">
                Showing first 100 viewers
              </Text>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="reactors" pt="md">
            <DataTable
              data={data.reactors.map((reactor, index) => ({ ...reactor, _key: `${reactor.userId}-${index}` }))}
              columns={[
                {
                  id: 'user',
                  header: 'User',
                  align: 'left',
                  render: (row) => <UserHoverCard userId={row.userId} userName={getUserName(row)} />,
                  sortValue: (row) => getUserName(row).toLowerCase(),
                },
                {
                  id: 'reaction',
                  header: 'Reaction',
                  align: 'left',
                  render: (row) => (
                    <Badge
                      variant="light"
                      color={row.reactionType === 'LIKE' ? 'green' : 'red'}
                    >
                      {row.reactionType === 'LIKE' ? '👍 Like' : '👎 Dislike'}
                    </Badge>
                  ),
                  sortValue: (row) => row.reactionType,
                },
                {
                  id: 'createdAt',
                  header: 'Date',
                  align: 'left',
                  render: (row) => new Date(row.createdAt).toLocaleString(),
                  sortValue: (row) => new Date(row.createdAt).getTime(),
                },
              ]}
              keyField="_key"
              emptyMessage="No reactions yet"
            />
            {data.reactors.length >= 100 && (
              <Text size="xs" c="dimmed" mt="md">
                Showing first 100 reactions
              </Text>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="savers" pt="md">
            <DataTable
              data={data.savers}
              columns={[
                {
                  id: 'user',
                  header: 'User',
                  align: 'left',
                  render: (row) => <UserHoverCard userId={row.userId} userName={getUserName(row)} />,
                  sortValue: (row) => getUserName(row).toLowerCase(),
                },
                {
                  id: 'createdAt',
                  header: 'Saved Date',
                  align: 'left',
                  render: (row) => new Date(row.createdAt).toLocaleString(),
                  sortValue: (row) => new Date(row.createdAt).getTime(),
                },
              ]}
              keyField="userId"
              emptyMessage="No saves yet"
            />
            {data.savers.length >= 100 && (
              <Text size="xs" c="dimmed" mt="md">
                Showing first 100 saves
              </Text>
            )}
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  );
}

