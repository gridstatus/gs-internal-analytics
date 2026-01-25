'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  TextInput,
  Table,
  Paper,
  Text,
  Anchor,
  Loader,
  Stack,
  Badge,
  Group,
} from '@mantine/core';
import { IconSearch, IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';
import Link from 'next/link';
import { useMemo } from 'react';
import { UsersListItem, UsersListResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';

type SortColumn = 'username' | 'name' | 'hasApiKey' | 'createdAt' | 'lastActiveAt' | null;
type SortDirection = 'asc' | 'desc';

export function UsersListView() {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [sortColumn, setSortColumn] = useState<SortColumn>('lastActiveAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const url = `/api/users-list?search=${encodeURIComponent(debouncedSearch)}`;
  const { data, loading } = useApiData<UsersListResponse>(url, [url]);
  const users = data?.users ?? [];

  const sortedUsers = useMemo(() => {
    if (!sortColumn) return users;

    return [...users].sort((a, b) => {
      let aValue: string | number | boolean | null;
      let bValue: string | number | boolean | null;

      switch (sortColumn) {
        case 'username':
          aValue = a.username.toLowerCase();
          bValue = b.username.toLowerCase();
          break;
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'hasApiKey':
          aValue = a.hasApiKey ? 1 : 0;
          bValue = b.hasApiKey ? 1 : 0;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'lastActiveAt':
          aValue = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
          bValue = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />;
  };

  return (
    <Container size="xl" py="xl">
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
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('username')}
                >
                  <Group gap={4}>
                    Username
                    <SortIcon column="username" />
                  </Group>
                </Table.Th>
                <Table.Th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('name')}
                >
                  <Group gap={4}>
                    Name
                    <SortIcon column="name" />
                  </Group>
                </Table.Th>
                <Table.Th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('hasApiKey')}
                >
                  <Group gap={4}>
                    API Key
                    <SortIcon column="hasApiKey" />
                  </Group>
                </Table.Th>
                <Table.Th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('createdAt')}
                >
                  <Group gap={4}>
                    Created
                    <SortIcon column="createdAt" />
                  </Group>
                </Table.Th>
                <Table.Th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('lastActiveAt')}
                >
                  <Group gap={4}>
                    Last Active
                    <SortIcon column="lastActiveAt" />
                  </Group>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sortedUsers.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c="dimmed" ta="center">
                      {search ? 'No users found' : 'Start typing to search users'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                sortedUsers.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>
                      <Anchor component={Link} href={`/users-list/${user.id}`}>
                        {user.username}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>
                      {user.firstName} {user.lastName}
                    </Table.Td>
                    <Table.Td>
                      {user.hasApiKey ? (
                        <Badge color="green" variant="light">Yes</Badge>
                      ) : (
                        <Badge color="gray" variant="light">No</Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </Table.Td>
                    <Table.Td>
                      {user.lastActiveAt
                        ? new Date(user.lastActiveAt).toLocaleDateString()
                        : 'Never'}
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        )}
        <Text size="xs" c="dimmed" mt="md">
          Showing up to 100 users. Click column headers to sort.
        </Text>
      </Paper>
    </Container>
  );
}

