'use client';

import { useState, useMemo } from 'react';
import {
  Paper,
  Text,
  Anchor,
  Stack,
  SimpleGrid,
  Group,
  Skeleton,
  TextInput,
  ScrollArea,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { useFilterStore } from '@/stores/filterStore';
import {
  ApiUsageMonitorResponse,
  ApiUsageByIpItem,
  ApiUsageByUserItem,
} from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { AppContainer } from '@/components/AppContainer';
import { UserHoverCard } from '@/components/UserHoverCard';
import { DataTable, Column } from './DataTable';
import { PageBreadcrumbs } from './PageBreadcrumbs';
import { ErrorDisplay } from './ErrorDisplay';

const IP_USAGE_DESCRIPTION =
  'API usage grouped by IP address in the last 24 hours. Shows distinct users, total rows returned, and request count per IP.';

const USER_USAGE_DESCRIPTION =
  'API usage grouped by user/organization in the last 24 hours. Includes plan, client versions, and datasets accessed.';

const TABLE_MAX_HEIGHT = 500;

export function ApiUsageMonitorView() {
  const timezone = useFilterStore((s) => s.timezone);
  const url = useApiUrl('/api/api-usage/monitor', {});
  const { data, loading, error } = useApiData<ApiUsageMonitorResponse>(url, [url]);

  const [searchIp, setSearchIp] = useState('');
  const [searchUser, setSearchUser] = useState('');

  const byIp = data?.byIp ?? [];
  const byUser = data?.byUser ?? [];

  const filteredByIp = useMemo(() => {
    if (!searchIp.trim()) return byIp;
    const q = searchIp.trim().toLowerCase();
    return byIp.filter(
      (row) =>
        (row.ip ?? '').toLowerCase().includes(q) ||
        row.userNames.some((name) => name.toLowerCase().includes(q))
    );
  }, [byIp, searchIp]);

  const filteredByUser = useMemo(() => {
    if (!searchUser.trim()) return byUser;
    const q = searchUser.trim().toLowerCase();
    return byUser.filter(
      (row) =>
        (row.user ?? '').toLowerCase().includes(q) ||
        (row.org ?? '').toLowerCase().includes(q) ||
        row.uniqueDatasets.some((d) => d.toLowerCase().includes(q))
    );
  }, [byUser, searchUser]);

  const ipColumns: Column<ApiUsageByIpItem>[] = [
    {
      id: 'ip',
      header: 'IP Address',
      align: 'left',
      render: (row) => row.ip ?? '—',
      sortValue: (row) => row.ip ?? '',
    },
    {
      id: 'distinctUsers',
      header: 'Distinct Users',
      align: 'right',
      render: (row) => row.distinctUsers.toLocaleString(),
      sortValue: (row) => row.distinctUsers,
    },
    {
      id: 'totalRowsReturned',
      header: 'Total Rows',
      align: 'right',
      render: (row) => row.totalRowsReturned.toLocaleString(),
      sortValue: (row) => row.totalRowsReturned,
    },
    {
      id: 'requestCount',
      header: 'Requests',
      align: 'right',
      render: (row) => row.requestCount.toLocaleString(),
      sortValue: (row) => row.requestCount,
    },
    {
      id: 'userNames',
      header: 'Users',
      align: 'left',
      render: (row) => row.userNames.join(', '),
      sortValue: (row) => row.userNames.join(', ').toLowerCase(),
    },
  ];

  const userColumns: Column<ApiUsageByUserItem>[] = [
    {
      id: 'user',
      header: 'User',
      align: 'left',
      render: (row) =>
        row.userId != null ? (
          <UserHoverCard userId={row.userId} userName={row.user ?? `User ${row.userId}`} />
        ) : (
          row.user ?? '—'
        ),
      sortValue: (row) => (row.user ?? '').toLowerCase(),
    },
    {
      id: 'org',
      header: 'Organization',
      align: 'left',
      render: (row) =>
        row.orgId ? (
          <Anchor component={Link} href={`/organizations/${row.orgId}`}>
            {row.org ?? row.orgId}
          </Anchor>
        ) : (
          row.org ?? '—'
        ),
      sortValue: (row) => (row.org ?? '').toLowerCase(),
    },
    {
      id: 'planId',
      header: 'Plan',
      align: 'right',
      render: (row) =>
        row.planId != null ? (
          <Anchor component={Link} href={`/plans/${row.planId}`}>
            {row.planId}
          </Anchor>
        ) : (
          '—'
        ),
      sortValue: (row) => row.planId ?? 0,
    },
    {
      id: 'totalRequests',
      header: 'Requests',
      align: 'right',
      render: (row) => row.totalRequests.toLocaleString(),
      sortValue: (row) => row.totalRequests,
    },
    {
      id: 'totalRowsReturned',
      header: 'Total Rows',
      align: 'right',
      render: (row) => row.totalRowsReturned.toLocaleString(),
      sortValue: (row) => row.totalRowsReturned,
    },
    {
      id: 'lastRequestTime',
      header: 'Last Request',
      align: 'left',
      render: (row) =>
        row.lastRequestTime
          ? DateTime.fromISO(row.lastRequestTime)
              .setZone(timezone)
              .toLocaleString(DateTime.DATETIME_SHORT)
          : '—',
      sortValue: (row) => (row.lastRequestTime ? new Date(row.lastRequestTime).getTime() : 0),
    },
    {
      id: 'uniqueClientVersions',
      header: 'Client Versions',
      align: 'left',
      render: (row) => row.uniqueClientVersions.join(', ') || '—',
      sortValue: (row) => row.uniqueClientVersions.join(', ').toLowerCase(),
    },
    {
      id: 'uniqueDatasets',
      header: 'Datasets',
      align: 'left',
      render: (row) => row.uniqueDatasets.join(', ') || '—',
      sortValue: (row) => row.uniqueDatasets.join(', ').toLowerCase(),
    },
  ];

  if (loading) {
    return (
      <AppContainer>
        <PageBreadcrumbs items={[{ label: 'API' }, { label: 'API Usage Monitor' }]} />
        <Stack gap="md">
          <Skeleton height={280} />
          <Skeleton height={280} />
        </Stack>
      </AppContainer>
    );
  }

  if (error) {
    return (
      <AppContainer>
        <PageBreadcrumbs items={[{ label: 'API' }, { label: 'API Usage Monitor' }]} />
        <ErrorDisplay error={error} />
      </AppContainer>
    );
  }

  return (
    <AppContainer>
      <PageBreadcrumbs items={[{ label: 'API' }, { label: 'API Usage Monitor' }]} />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Paper shadow="sm" p="md" radius="md" withBorder style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Text fw={600} size="lg" mb={4}>
            Usage by IP
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            {IP_USAGE_DESCRIPTION}
          </Text>
          <Group mb="md">
            <TextInput
              placeholder="Search by IP or user..."
              leftSection={<IconSearch size={16} />}
              value={searchIp}
              onChange={(e) => setSearchIp(e.currentTarget.value)}
              style={{ width: '100%', maxWidth: 300 }}
            />
          </Group>
          <ScrollArea.Autosize mah={TABLE_MAX_HEIGHT} type="scroll" style={{ flex: 1, minHeight: 0 }}>
            <DataTable
              data={filteredByIp}
              columns={ipColumns}
              keyField="ip"
              defaultSort={{ column: 'distinctUsers', direction: 'desc' }}
              emptyMessage="No API usage data"
            />
          </ScrollArea.Autosize>
        </Paper>

        <Paper shadow="sm" p="md" radius="md" withBorder style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Text fw={600} size="lg" mb={4}>
            Usage by User
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            {USER_USAGE_DESCRIPTION}
          </Text>
          <Group mb="md">
            <TextInput
              placeholder="Search by user, org, or dataset..."
              leftSection={<IconSearch size={16} />}
              value={searchUser}
              onChange={(e) => setSearchUser(e.currentTarget.value)}
              style={{ width: '100%', maxWidth: 300 }}
            />
          </Group>
          <ScrollArea.Autosize mah={TABLE_MAX_HEIGHT} type="scroll" style={{ flex: 1, minHeight: 0 }}>
            <DataTable
              data={filteredByUser}
              columns={userColumns}
              keyField="id"
              defaultSort={{ column: 'totalRowsReturned', direction: 'desc' }}
              emptyMessage="No API usage data"
            />
          </ScrollArea.Autosize>
        </Paper>
      </SimpleGrid>
    </AppContainer>
  );
}
