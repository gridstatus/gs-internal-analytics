'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Skeleton,
  Alert,
  Stack,
  Paper,
  Text,
  Group,
  TextInput,
  Anchor,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { IconAlertCircle } from '@tabler/icons-react';
import Link from 'next/link';
import { useFilter } from '@/contexts/FilterContext';
import { ActiveUsersResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { DataTable, Column } from './DataTable';

export function DomainsView() {
  const [search, setSearch] = useState('');
  const url = useApiUrl('/api/domains', {});
  const { data, loading, error } = useApiData<ActiveUsersResponse>(url, [url]);

  if (loading) {
    return (
      <Container fluid py="xl">
        <Stack gap="md">
          <Skeleton height={50} width={300} />
          <Skeleton height={400} />
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid py="xl">
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

  if (!data) {
    return null;
  }

  const filteredData = data.byDomain
    .filter((row) => row.domain.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 100);

  const columns: Column<typeof filteredData[0]>[] = [
    {
      id: 'domain',
      header: 'Domain',
      align: 'left',
      render: (row) => (
        <Anchor component={Link} href={`/domains/${encodeURIComponent(row.domain)}`}>
          {row.domain}
        </Anchor>
      ),
      sortValue: (row) => row.domain.toLowerCase(),
    },
    {
      id: 'active24h',
      header: '24h',
      align: 'right',
      render: (row) => row.active24h,
      sortValue: (row) => row.active24h,
    },
    {
      id: 'active7d',
      header: '7d',
      align: 'right',
      render: (row) => row.active7d,
      sortValue: (row) => row.active7d,
    },
    {
      id: 'active30d',
      header: '30d',
      align: 'right',
      render: (row) => row.active30d,
      sortValue: (row) => row.active30d,
    },
    {
      id: 'active90d',
      header: '90d',
      align: 'right',
      render: (row) => row.active90d,
      sortValue: (row) => row.active90d,
    },
    {
      id: 'totalUsers',
      header: 'Total',
      align: 'right',
      render: (row) => row.totalUsers,
      sortValue: (row) => row.totalUsers,
    },
  ];

  return (
    <Container fluid py="xl">
      <Title order={1} mb="xl">Domains</Title>

      {/* Domain breakdown table */}
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600} size="lg">
            Active Users by Domain
          </Text>
          <TextInput
            placeholder="Search domains..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ width: 250 }}
          />
        </Group>
        <DataTable
          data={filteredData}
          columns={columns}
          keyField="domain"
          defaultSort={{ column: 'totalUsers', direction: 'desc' }}
        />
        <Text size="xs" c="dimmed" mt="md">
          Showing up to 100 domains.
        </Text>
      </Paper>
    </Container>
  );
}

