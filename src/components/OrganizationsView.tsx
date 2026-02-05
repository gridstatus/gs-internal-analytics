'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  TextInput,
  Paper,
  Text,
  Anchor,
  Loader,
  Stack,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';
import { DateTime } from 'luxon';
import Link from 'next/link';
import { OrganizationListItem, OrganizationsResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { useFilter } from '@/contexts/FilterContext';
import { DataTable, Column } from './DataTable';
import { PageBreadcrumbs } from './PageBreadcrumbs';

export function OrganizationsView() {
  const { timezone } = useFilter();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const url = useApiUrl('/api/organizations', { search: debouncedSearch || undefined });
  const { data, loading } = useApiData<OrganizationsResponse>(url, [url, debouncedSearch]);
  const organizations = data?.organizations ?? [];

  const columns: Column<OrganizationListItem>[] = [
    {
      id: 'name',
      header: 'Name',
      align: 'left',
      render: (row) => (
        <Anchor component={Link} href={`/organizations/${row.id}`}>
          {row.name}
        </Anchor>
      ),
      sortValue: (row) => row.name.toLowerCase(),
    },
    {
      id: 'userCount',
      header: 'Users',
      align: 'right',
      render: (row) => row.userCount,
      sortValue: (row) => row.userCount,
    },
    {
      id: 'newUsers7d',
      header: 'New (7d)',
      align: 'right',
      render: (row) => row.newUsers7d,
      sortValue: (row) => row.newUsers7d,
    },
    {
      id: 'activeUsers7d',
      header: 'Active (7d)',
      align: 'right',
      render: (row) => row.activeUsers7d,
      sortValue: (row) => row.activeUsers7d,
    },
    {
      id: 'createdAt',
      header: 'Created',
      align: 'right',
      render: (row) =>
        DateTime.fromISO(row.createdAt)
          .setZone(timezone)
          .toLocaleString(DateTime.DATETIME_SHORT),
      sortValue: (row) => new Date(row.createdAt).getTime(),
    },
  ];

  return (
    <Container fluid py="xl">
      <PageBreadcrumbs items={[{ label: 'Organizations' }]} />
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
          <DataTable
            data={organizations}
            columns={columns}
            keyField="id"
            defaultSort={{ column: 'userCount', direction: 'desc' }}
            emptyMessage={search ? 'No organizations found' : 'Start typing to search organizations'}
          />
        )}
        <Text size="xs" c="dimmed" mt="md">
          Showing up to 100 organizations. Click column headers to sort.
        </Text>
      </Paper>
    </Container>
  );
}
