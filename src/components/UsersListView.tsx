'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  TextInput,
  Paper,
  Text,
  Loader,
  Stack,
  Badge,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';
import { DateTime } from 'luxon';
import { UsersListItem, UsersListResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { UserHoverCard } from './UserHoverCard';
import { useFilter } from '@/contexts/FilterContext';
import { DataTable, Column } from './DataTable';

export function UsersListView() {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const { filterGridstatus, timezone } = useFilter();

  const url = `/api/users-list?search=${encodeURIComponent(debouncedSearch)}&filterGridstatus=${filterGridstatus}&timezone=${timezone}`;
  const { data, loading } = useApiData<UsersListResponse>(url, [url, filterGridstatus, timezone]);
  const users = data?.users ?? [];

  const columns: Column<UsersListItem>[] = [
    {
      id: 'username',
      header: 'Username',
      align: 'left',
      render: (row) => <UserHoverCard userId={row.id} userName={row.username} />,
      sortValue: (row) => row.username.toLowerCase(),
    },
    {
      id: 'name',
      header: 'Name',
      align: 'left',
      render: (row) => `${row.firstName} ${row.lastName}`,
      sortValue: (row) => `${row.firstName} ${row.lastName}`.toLowerCase(),
    },
    {
      id: 'hasApiKey',
      header: 'API Key',
      align: 'left',
      render: (row) =>
        row.hasApiKey ? (
          <Badge color="green" variant="light">Yes</Badge>
        ) : (
          <Badge color="gray" variant="light">No</Badge>
        ),
      sortValue: (row) => row.hasApiKey ? 1 : 0,
    },
    {
      id: 'createdAt',
      header: 'Created',
      align: 'left',
      render: (row) =>
        DateTime.fromISO(row.createdAt)
          .setZone(timezone)
          .toLocaleString(DateTime.DATETIME_SHORT),
      sortValue: (row) => new Date(row.createdAt).getTime(),
    },
    {
      id: 'lastActiveAt',
      header: 'Last Active',
      align: 'left',
      render: (row) =>
        row.lastActiveAt
          ? DateTime.fromISO(row.lastActiveAt)
              .setZone(timezone)
              .toLocaleString(DateTime.DATETIME_SHORT)
          : 'Never',
      sortValue: (row) => row.lastActiveAt ? new Date(row.lastActiveAt).getTime() : 0,
    },
  ];

  return (
    <Container fluid py="xl">
      <Title order={1} mb="xl">Users</Title>

      <TextInput
        placeholder="Search users by username, first name, or last name..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        mb="lg"
        size="md"
      />

      <Paper shadow="sm" p="md" radius="md" withBorder>
        {loading ? (
          <Stack align="center" py="xl">
            <Loader />
          </Stack>
        ) : (
          <DataTable
            data={users}
            columns={columns}
            keyField="id"
            defaultSort={{ column: 'lastActiveAt', direction: 'desc' }}
            emptyMessage={search ? 'No users found' : 'Start typing to search users'}
          />
        )}
        <Text size="xs" c="dimmed" mt="md">
          Showing up to 100 users. Click column headers to sort.
        </Text>
      </Paper>
    </Container>
  );
}

