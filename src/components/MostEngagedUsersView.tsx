'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Paper,
  Table,
  Text,
  Group,
  Loader,
  Alert,
  Stack,
  Badge,
  SegmentedControl,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconThumbUp, IconEye, IconBookmark, IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import { UserHoverCard } from './UserHoverCard';
import { Anchor } from '@mantine/core';
import { useFilter } from '@/contexts/FilterContext';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

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

type SortBy = 'total' | 'reactions' | 'engagements' | 'saves' | null;
type SortDirection = 'asc' | 'desc';
type TimeFilter = '1' | '7' | '30' | '90' | 'all';

export function MostEngagedUsersView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [data, setData] = useState<MostEngagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('reactions');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { filterGridstatus } = useFilter();
  
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
        const url = `/api/insights/most-engaged-users?filterGridstatus=${filterGridstatus}${days !== null ? `&days=${days}` : ''}`;
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
  }, [filterGridstatus, timeFilter]);

  const getUserName = (user: MostEngagedUser) => {
    return user.username ||
      `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
      `User ${user.user_id}`;
  };

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ column }: { column: SortBy }) => {
    if (sortBy !== column) return null;
    return sortDirection === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />;
  };

  const sortedData = [...data].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'reactions':
        comparison = a.reaction_count - b.reaction_count;
        break;
      case 'engagements':
        comparison = a.engagement_count - b.engagement_count;
        break;
      case 'saves':
        comparison = a.save_count - b.save_count;
        break;
      case 'total':
      default:
        comparison = a.total_engagement_score - b.total_engagement_score;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

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
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Rank</Table.Th>
              <Table.Th>User</Table.Th>
              <Table.Th 
                ta="right"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('reactions')}
              >
                <Group gap={4} justify="flex-end">
                  <IconThumbUp size={16} />
                  Reactions
                  <SortIcon column="reactions" />
                </Group>
              </Table.Th>
              <Table.Th 
                ta="right"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('engagements')}
              >
                <Group gap={4} justify="flex-end">
                  <IconEye size={16} />
                  Engagements
                  <SortIcon column="engagements" />
                </Group>
              </Table.Th>
              <Table.Th 
                ta="right"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('saves')}
              >
                <Group gap={4} justify="flex-end">
                  <IconBookmark size={16} />
                  Saves
                  <SortIcon column="saves" />
                </Group>
              </Table.Th>
              <Table.Th 
                ta="right"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('total')}
              >
                <Group gap={4} justify="flex-end">
                  Total Score
                  <SortIcon column="total" />
                </Group>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedData.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text c="dimmed" ta="center" py="md">
                    No engaged users found
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              sortedData.map((user, index) => (
                <Table.Tr key={user.user_id}>
                  <Table.Td>
                    <Text fw={600}>#{index + 1}</Text>
                  </Table.Td>
                  <Table.Td>
                    <UserHoverCard userId={user.user_id} userName={getUserName(user)} />
                  </Table.Td>
                  <Table.Td ta="right">
                    <Stack gap={2} align="flex-end">
                      <Text fw={600}>{user.reaction_count.toLocaleString()}</Text>
                      <Group gap={4} justify="flex-end">
                        <Badge variant="light" color="green" size="xs">
                          👍 {user.likes_count}
                        </Badge>
                        <Badge variant="light" color="red" size="xs">
                          👎 {user.dislikes_count}
                        </Badge>
                      </Group>
                    </Stack>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text fw={600}>{user.engagement_count.toLocaleString()}</Text>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text fw={600}>{user.save_count.toLocaleString()}</Text>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Badge variant="light" color="blue" size="lg">
                      {user.total_engagement_score.toLocaleString()}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
        {sortedData.length >= 100 && (
          <Text size="xs" c="dimmed" mt="md">
            Showing top 100 most engaged users
          </Text>
        )}
      </Paper>
    </Container>
  );
}

