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
  Group,
} from '@mantine/core';
import { IconSearch, IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';

interface Organization {
  id: string;
  name: string;
  createdAt: string;
  userCount: number;
  newUsers7d: number;
  activeUsers7d: number;
}

type SortColumn = 'name' | 'userCount' | 'newUsers7d' | 'activeUsers7d' | 'createdAt' | null;
type SortDirection = 'asc' | 'desc';

export function OrganizationsView() {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>('userCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    const fetchOrgs = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/organizations?search=${encodeURIComponent(debouncedSearch)}`);
        const data = await response.json();
        setOrganizations(data.organizations || []);
      } catch (error) {
        console.error('Error fetching organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgs();
  }, [debouncedSearch]);

  const sortedOrganizations = useMemo(() => {
    if (!sortColumn) return organizations;

    return [...organizations].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'userCount':
          aValue = a.userCount;
          bValue = b.userCount;
          break;
        case 'newUsers7d':
          aValue = a.newUsers7d;
          bValue = b.newUsers7d;
          break;
        case 'activeUsers7d':
          aValue = a.activeUsers7d;
          bValue = b.activeUsers7d;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [organizations, sortColumn, sortDirection]);

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
      <Title order={1} mb="xl">Organizations</Title>

      <TextInput
        placeholder="Search organizations..."
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
                  onClick={() => handleSort('name')}
                >
                  <Group gap={4}>
                    Name
                    <SortIcon column="name" />
                  </Group>
                </Table.Th>
                <Table.Th 
                  ta="right"
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('userCount')}
                >
                  <Group gap={4} justify="flex-end">
                    Users
                    <SortIcon column="userCount" />
                  </Group>
                </Table.Th>
                <Table.Th 
                  ta="right"
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('newUsers7d')}
                >
                  <Group gap={4} justify="flex-end">
                    New (7d)
                    <SortIcon column="newUsers7d" />
                  </Group>
                </Table.Th>
                <Table.Th 
                  ta="right"
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('activeUsers7d')}
                >
                  <Group gap={4} justify="flex-end">
                    Active (7d)
                    <SortIcon column="activeUsers7d" />
                  </Group>
                </Table.Th>
                <Table.Th 
                  ta="right"
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('createdAt')}
                >
                  <Group gap={4} justify="flex-end">
                    Created
                    <SortIcon column="createdAt" />
                  </Group>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sortedOrganizations.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c="dimmed" ta="center">
                      {search ? 'No organizations found' : 'Start typing to search organizations'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                sortedOrganizations.map((org) => (
                  <Table.Tr key={org.id}>
                    <Table.Td>
                      <Anchor component={Link} href={`/organizations/${org.id}`}>
                        {org.name}
                      </Anchor>
                    </Table.Td>
                    <Table.Td ta="right">{org.userCount}</Table.Td>
                    <Table.Td ta="right">{org.newUsers7d}</Table.Td>
                    <Table.Td ta="right">{org.activeUsers7d}</Table.Td>
                    <Table.Td ta="right">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        )}
        <Text size="xs" c="dimmed" mt="md">
          Showing up to 100 organizations. Click column headers to sort.
        </Text>
      </Paper>
    </Container>
  );
}
