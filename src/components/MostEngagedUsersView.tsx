'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Paper,
  Text,
  Group,
  Loader,
  Alert,
  Stack,
  Badge,
  SegmentedControl,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconThumbUp, IconEye, IconBookmark } from '@tabler/icons-react';
import { UserHoverCard } from './UserHoverCard';
import { Anchor } from '@mantine/core';
import { useFilter } from '@/contexts/FilterContext';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { DataTable, Column } from './DataTable';

interface MostEngagedUser {
  user_id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  reaction_count: number;
  likes_count: number;
  dislikes_count: number;
  engagement_count: number;
  save_count: number;
  total_engagement_score: number;
}

type TimeFilter = '1' | '7' | '30' | '90' | 'all';

export function MostEngagedUsersView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [data, setData] = useState<MostEngagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { filterGridstatus, timezone } = useFilter();
  
  // Initialize timeFilter from URL params
  const timeFilterParam = searchParams.get('timeFilter');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(
    (timeFilterParam && ['1', '7', '30', '90', 'all'].includes(timeFilterParam))
      ? (timeFilterParam as TimeFilter)
      : '7'
  );

  // Update URL when timeFilter changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (timeFilter !== '7') {
      params.set('timeFilter', timeFilter);
    } else {
      params.delete('timeFilter');
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [timeFilter, pathname, router, searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const days = timeFilter === 'all' ? null : parseInt(timeFilter, 10);
        const url = `/api/insights/most-engaged-users?filterGridstatus=${filterGridstatus}&timezone=${timezone}${days !== null ? `&days=${days}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch most engaged users');
        }
        const result = await response.json();
        setData(result.users);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filterGridstatus, timezone, timeFilter]);

  const getUserName = (user: MostEngagedUser) => {
    return user.username ||
      `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
      `User ${user.user_id}`;
  };

  const columns: Column<MostEngagedUser>[] = [
    {
      id: 'user',
      header: 'User',
      align: 'left',
      render: (row) => <UserHoverCard userId={row.user_id} userName={getUserName(row)} />,
      sortValue: (row) => getUserName(row).toLowerCase(),
    },
    {
      id: 'reactions',
      header: (
        <Group gap={4} justify="flex-end">
          <IconThumbUp size={16} />
          Reactions
        </Group>
      ),
      align: 'right',
      render: (row) => (
        <Stack gap={2} align="flex-end">
          <Text fw={600}>{row.reaction_count.toLocaleString()}</Text>
          <Group gap={4} justify="flex-end">
            <Badge variant="light" color="green" size="xs">
              👍 {row.likes_count}
            </Badge>
            <Badge variant="light" color="red" size="xs">
              👎 {row.dislikes_count}
            </Badge>
          </Group>
        </Stack>
      ),
      sortValue: (row) => row.reaction_count,
    },
    {
      id: 'engagements',
      header: (
        <Group gap={4} justify="flex-end">
          <IconEye size={16} />
          Engagements
        </Group>
      ),
      align: 'right',
      render: (row) => <Text fw={600}>{row.engagement_count.toLocaleString()}</Text>,
      sortValue: (row) => row.engagement_count,
    },
    {
      id: 'saves',
      header: (
        <Group gap={4} justify="flex-end">
          <IconBookmark size={16} />
          Saves
        </Group>
      ),
      align: 'right',
      render: (row) => <Text fw={600}>{row.save_count.toLocaleString()}</Text>,
      sortValue: (row) => row.save_count,
    },
    {
      id: 'total',
      header: 'Total Score',
      align: 'right',
      render: (row) => (
        <Badge variant="light" color="blue" size="lg">
          {row.total_engagement_score.toLocaleString()}
        </Badge>
      ),
      sortValue: (row) => row.total_engagement_score,
    },
  ];

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" py="xl">
          <Loader />
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

      <Group justify="space-between" mb="xl" wrap="wrap">
        <Title order={1}>Most Engaged Users</Title>
        <SegmentedControl
          value={timeFilter}
          onChange={(value) => setTimeFilter(value as TimeFilter)}
          data={[
            { label: 'All Time', value: 'all' },
            { label: '1 Day', value: '1' },
            { label: '7 Days', value: '7' },
            { label: '30 Days', value: '30' },
            { label: '90 Days', value: '90' },
          ]}
        />
      </Group>

      <Paper shadow="sm" p="md" radius="md" withBorder>
        <DataTable
          data={data}
          columns={columns}
          keyField="user_id"
          defaultSort={{ column: 'reactions', direction: 'desc' }}
          emptyMessage="No engaged users found"
        />
        {data.length >= 100 && (
          <Text size="xs" c="dimmed" mt="md">
            Showing top 100 most engaged users
          </Text>
        )}
      </Paper>
    </Container>
  );
}

