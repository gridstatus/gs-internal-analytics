'use client';

import { useState } from 'react';
import {
  Paper,
  Text,
  Group,
  Loader,
  Alert,
  Stack,
  Badge,
  SegmentedControl,
} from '@mantine/core';
import { IconThumbUp, IconEye, IconBookmark } from '@tabler/icons-react';
import { UserHoverCard } from './UserHoverCard';
import { useFilter } from '@/contexts/FilterContext';
import { PageBreadcrumbs } from './PageBreadcrumbs';
import { useQueryState, parseAsStringEnum } from 'nuqs';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { AppContainer } from '@/components/AppContainer';
import { ErrorDisplay } from '@/components/ErrorDisplay';
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

interface MostEngagedUsersResponse {
  users: MostEngagedUser[];
}

export function MostEngagedUsersView() {
  // URL state management with nuqs
  const [timeFilter, setTimeFilter] = useQueryState(
    'timeFilter',
    parseAsStringEnum(['1', '7', '30', '90', 'all']).withDefault('7')
  );

  const days = timeFilter === 'all' ? null : parseInt(timeFilter, 10);
  const apiUrl = useApiUrl('/api/insights/most-engaged-users', { days });
  const { data: response, loading, error } = useApiData<MostEngagedUsersResponse>(apiUrl, [apiUrl, timeFilter]);
  const data = response?.users || [];

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
      <AppContainer>
        <Stack align="center" py="xl">
          <Loader />
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
      <PageBreadcrumbs
        items={[
          { label: 'Insights', href: '/insights' },
          { label: 'Most Engaged Users' },
        ]}
        rightSection={
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
        }
      />

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
    </AppContainer>
  );
}

