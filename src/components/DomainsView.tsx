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
  Table,
  TextInput,
  Anchor,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { IconAlertCircle } from '@tabler/icons-react';
import Link from 'next/link';
import { useFilter } from '@/contexts/FilterContext';
import { ActiveUsersResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';

export function DomainsView() {
  const [search, setSearch] = useState('');
  const { filterGridstatus, timezone } = useFilter();
  const url = `/api/domains?filterGridstatus=${filterGridstatus}&timezone=${timezone}`;
  const { data, loading, error } = useApiData<ActiveUsersResponse>(url, [url, filterGridstatus, timezone]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="md">
          <Skeleton height={50} width={300} />
          <Skeleton height={400} />
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

  if (!data) {
    return null;
  }

  return (
    <Container size="xl" py="xl">
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
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Domain</Table.Th>
              <Table.Th ta="right">24h</Table.Th>
              <Table.Th ta="right">7d</Table.Th>
              <Table.Th ta="right">30d</Table.Th>
              <Table.Th ta="right">90d</Table.Th>
              <Table.Th ta="right">Total</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.byDomain
              .filter((row) => row.domain.toLowerCase().includes(search.toLowerCase()))
              .slice(0, 100)
              .map((row) => (
                <Table.Tr key={row.domain}>
                  <Table.Td>
                    <Anchor component={Link} href={`/domains/${encodeURIComponent(row.domain)}`}>
                      {row.domain}
                    </Anchor>
                  </Table.Td>
                  <Table.Td ta="right">{row.active24h}</Table.Td>
                  <Table.Td ta="right">{row.active7d}</Table.Td>
                  <Table.Td ta="right">{row.active30d}</Table.Td>
                  <Table.Td ta="right">{row.active90d}</Table.Td>
                  <Table.Td ta="right">{row.totalUsers}</Table.Td>
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>
        <Text size="xs" c="dimmed" mt="md">
          Showing up to 100 domains. Excludes free email providers only.
        </Text>
      </Paper>
    </Container>
  );
}

