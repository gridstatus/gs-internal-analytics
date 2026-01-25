'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Paper,
  Table,
  Text,
  Group,
  SimpleGrid,
  Loader,
  Alert,
  Stack,
  Anchor,
  Badge,
  Divider,
  SegmentedControl,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';
import { MetricCard } from '@/components/MetricCard';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
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

  return (
    <Container size="xl" py="xl">
      <Group mb="xl">
        <Anchor
          component={Link}
          href="/insights"
          size="sm"
          c="dimmed"
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <IconArrowLeft size={16} />
          Back to Insights
        </Anchor>
      </Group>

      {/* Post Info */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Group justify="space-between" mb="md">
          <Text fw={600} size="lg">
            Post
          </Text>
          <Badge variant="light" color={data.post.status === 'PUBLISHED' ? 'green' : 'gray'}>
            {data.post.status}
          </Badge>
        </Group>
        <Group gap="md" mb="md">
          <Anchor
            href={`https://gridstatus.io/insights/${data.post.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View post on GridStatus.io
          </Anchor>
        </Group>
        <Divider my="md" />
        <Group gap="md">
          <Text size="sm" c="dimmed">
            <Text span fw={600}>Author:</Text> {authorName}
          </Text>
          <Text size="sm" c="dimmed">
            <Text span fw={600}>Created:</Text>{' '}
            {new Date(data.post.createdAt).toLocaleString()}
          </Text>
          <Text size="sm" c="dimmed">
            <Text span fw={600}>Updated:</Text>{' '}
            {new Date(data.post.updatedAt).toLocaleString()}
          </Text>
        </Group>
        {data.tags.length > 0 && (
          <>
            <Divider my="md" />
            <Group gap="xs">
              <Text size="sm" fw={600}>Tags:</Text>
              {data.tags.map((tag) => (
                <Badge key={tag.id} variant="light" color="blue">
                  {tag.name}
                </Badge>
              ))}
            </Group>
          </>
        )}
      </Paper>

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md" mb="xl">
        <MetricCard
          title="Impressions"
          value={data.stats.impressions.total.toLocaleString()}
          subtitle={`${data.stats.impressions.uniqueUsers} unique users`}
        />
        <MetricCard
          title="Views"
          value={data.stats.views.total.toLocaleString()}
          subtitle={`${data.stats.views.uniqueUsers} unique users`}
        />
        <MetricCard
          title="Engagement Rate"
          value={data.stats.engagementRate > 0 ? `${data.stats.engagementRate.toFixed(1)}%` : 'N/A'}
          subtitle={data.stats.engagementRate > 0 ? `${data.stats.views.total} / ${data.stats.impressions.total}` : 'No impressions'}
        />
        <MetricCard
          title="Reactions"
          value={data.stats.reactions.total}
          subtitle={`${data.stats.reactions.likes} likes, ${data.stats.reactions.dislikes} dislikes`}
        />
        <MetricCard
          title="Saves"
          value={data.stats.saves.total}
          subtitle={`${data.stats.saves.uniqueUsers} unique users`}
        />
      </SimpleGrid>

      {/* Views Chart with Toggle */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Group justify="space-between" mb="md">
          <Text fw={600} size="lg">
            Views Over Time
          </Text>
          <SegmentedControl
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
            title=""
            subtitle=""
            data={[...data.hourlyViews].reverse().map((hv) => ({
              month: hv.hour,
              views: hv.views,
              uniqueViewers: hv.uniqueViewers,
            }))}
            dataKey="views"
            color="blue.6"
            chartType="bar"
          />
        )}
        {timePeriod === 'day' && data.dailyViews.length > 0 && (
          <TimeSeriesChart
            title=""
            subtitle=""
            data={[...data.dailyViews].reverse().map((dv) => ({
              month: dv.day,
              views: dv.views,
              uniqueViewers: dv.uniqueViewers,
            }))}
            dataKey="views"
            color="blue.6"
            chartType="bar"
          />
        )}
        {timePeriod === 'month' && data.monthlyViews.length > 0 && (
          <TimeSeriesChart
            title=""
            subtitle=""
            data={[...data.monthlyViews].reverse().map((mv) => ({
              month: mv.month,
              views: mv.views,
              uniqueViewers: mv.uniqueViewers,
            }))}
            dataKey="views"
            color="blue.6"
            chartType="bar"
          />
        )}
        {((timePeriod === 'hour' && data.hourlyViews.length === 0) ||
          (timePeriod === 'day' && data.dailyViews.length === 0) ||
          (timePeriod === 'month' && data.monthlyViews.length === 0)) && (
          <Text c="dimmed" ta="center" py="xl">
            No data available for this time period
          </Text>
        )}
      </Paper>

      {/* Detailed Stats Table */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Text fw={600} size="lg" mb="md">
          Engagement Details
        </Text>
        <Table>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td fw={600}>Impressions</Table.Td>
              <Table.Td>{data.stats.impressions.total.toLocaleString()}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Unique Impression Users</Table.Td>
              <Table.Td>{data.stats.impressions.uniqueUsers}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Views</Table.Td>
              <Table.Td>{data.stats.views.total.toLocaleString()}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Unique Viewers</Table.Td>
              <Table.Td>{data.stats.views.uniqueUsers}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Total Views (All Sources)</Table.Td>
              <Table.Td>{data.stats.totalViews.toLocaleString()}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Engagement Rate</Table.Td>
              <Table.Td>
                {data.stats.engagementRate > 0 ? (
                  <Text span fw={600} c={data.stats.engagementRate >= 10 ? 'green' : data.stats.engagementRate >= 5 ? 'yellow' : 'red'}>
                    {data.stats.engagementRate.toFixed(2)}%
                  </Text>
                ) : (
                  <Text span c="dimmed">N/A (no impressions)</Text>
                )}
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Total Reactions</Table.Td>
              <Table.Td>{data.stats.reactions.total}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Likes</Table.Td>
              <Table.Td>{data.stats.reactions.likes}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Dislikes</Table.Td>
              <Table.Td>{data.stats.reactions.dislikes}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Unique Reactors</Table.Td>
              <Table.Td>{data.stats.reactions.uniqueUsers}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Total Saves</Table.Td>
              <Table.Td>{data.stats.saves.total}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Unique Savers</Table.Td>
              <Table.Td>{data.stats.saves.uniqueUsers}</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Users who viewed */}
      {data.viewers.length > 0 && (
        <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
          <Text fw={600} size="lg" mb="md">
            Users Who Viewed ({data.viewers.length})
          </Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th>
                <Table.Th ta="right">Impressions</Table.Th>
                <Table.Th ta="right">Views</Table.Th>
                <Table.Th>First Viewed</Table.Th>
                <Table.Th>Last Viewed</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.viewers.map((viewer) => {
                const userName = viewer.username ||
                  `${viewer.firstName || ''} ${viewer.lastName || ''}`.trim() ||
                  `User ${viewer.userId}`;
                return (
                  <Table.Tr key={viewer.userId}>
                    <Table.Td>
                      <Anchor component={Link} href={`/users-list/${viewer.userId}`}>
                        {userName}
                      </Anchor>
                    </Table.Td>
                    <Table.Td ta="right">{viewer.impressions}</Table.Td>
                    <Table.Td ta="right">{viewer.views}</Table.Td>
                    <Table.Td>{new Date(viewer.firstViewed).toLocaleString()}</Table.Td>
                    <Table.Td>{new Date(viewer.lastViewed).toLocaleString()}</Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
          {data.viewers.length >= 100 && (
            <Text size="xs" c="dimmed" mt="md">
              Showing first 100 viewers
            </Text>
          )}
        </Paper>
      )}

      {/* Users who reacted */}
      {data.reactors.length > 0 && (
        <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
          <Text fw={600} size="lg" mb="md">
            Users Who Reacted ({data.reactors.length})
          </Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th>
                <Table.Th>Reaction</Table.Th>
                <Table.Th>Date</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.reactors.map((reactor, index) => {
                const userName = reactor.username ||
                  `${reactor.firstName || ''} ${reactor.lastName || ''}`.trim() ||
                  `User ${reactor.userId}`;
                return (
                  <Table.Tr key={`${reactor.userId}-${index}`}>
                    <Table.Td>
                      <Anchor component={Link} href={`/users-list/${reactor.userId}`}>
                        {userName}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={reactor.reactionType === 'LIKE' ? 'green' : 'red'}
                      >
                        {reactor.reactionType}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{new Date(reactor.createdAt).toLocaleString()}</Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
          {data.reactors.length >= 100 && (
            <Text size="xs" c="dimmed" mt="md">
              Showing first 100 reactions
            </Text>
          )}
        </Paper>
      )}

      {/* Users who saved */}
      {data.savers.length > 0 && (
        <Paper shadow="sm" p="md" radius="md" withBorder>
          <Text fw={600} size="lg" mb="md">
            Users Who Saved ({data.savers.length})
          </Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th>
                <Table.Th>Saved Date</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.savers.map((saver) => {
                const userName = saver.username ||
                  `${saver.firstName || ''} ${saver.lastName || ''}`.trim() ||
                  `User ${saver.userId}`;
                return (
                  <Table.Tr key={saver.userId}>
                    <Table.Td>
                      <Anchor component={Link} href={`/users-list/${saver.userId}`}>
                        {userName}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>{new Date(saver.createdAt).toLocaleString()}</Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
          {data.savers.length >= 100 && (
            <Text size="xs" c="dimmed" mt="md">
              Showing first 100 users who saved
            </Text>
          )}
        </Paper>
      )}
    </Container>
  );
}

