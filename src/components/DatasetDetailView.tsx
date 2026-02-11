'use client';

import {
  Container,
  Paper,
  Text,
  Select,
  Skeleton,
  Alert,
  Group,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { useQueryState, parseAsInteger } from 'nuqs';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { useFilter } from '@/contexts/FilterContext';
import { UserHoverCard } from './UserHoverCard';
import { InfoHoverIcon } from './InfoHoverIcon';
import { DataTable, Column } from './DataTable';
import { PageBreadcrumbs } from './PageBreadcrumbs';

const DAYS_OPTIONS = [
  { value: '1', label: '1 day' },
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
];

const AVG_BETWEEN_TOOLTIP =
  'Average time between consecutive queries: (last query time − first query time) ÷ (number of requests − 1). Shown only when there are 2 or more requests.';

function formatAvgBetween(avgSeconds: number | null): string {
  if (avgSeconds == null || !Number.isFinite(avgSeconds)) return '—';
  const minutes = avgSeconds / 60;
  const formatted = Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1);
  return `${formatted} min`;
}

interface DatasetUserRow {
  userId: number;
  username: string | null;
  numRequests: number;
  lastQueryAt: string;
  avgSecondsBetween: number | null;
}

interface DatasetUsersResponse {
  data: DatasetUserRow[];
}

interface DatasetDetailViewProps {
  datasetId: string;
}

export function DatasetDetailView({ datasetId }: DatasetDetailViewProps) {
  const { timezone } = useFilter();
  const [days, setDays] = useQueryState(
    'days',
    parseAsInteger.withDefault(1).withOptions({ shallow: false })
  );

  const effectiveDays = [1, 7, 14].includes(days) ? days : 1;
  const apiUrl = useApiUrl('/api/dataset-users', {
    dataset: datasetId,
    days: effectiveDays,
  });
  const { data, loading, error } = useApiData<DatasetUsersResponse>(apiUrl, [apiUrl]);

  const rows = data?.data ?? [];

  const columns: Column<DatasetUserRow>[] = [
    {
      id: 'user',
      header: 'User',
      render: (row) => <UserHoverCard userId={row.userId} userName={row.username ?? ''} />,
      sortValue: (row) => (row.username ?? '').toLowerCase(),
    },
    {
      id: 'numRequests',
      header: 'Requests',
      align: 'right',
      render: (row) => row.numRequests.toLocaleString(),
      sortValue: (row) => row.numRequests,
    },
    {
      id: 'lastQueryAt',
      header: 'Last query',
      render: (row) =>
        DateTime.fromISO(row.lastQueryAt).setZone(timezone).toRelative() ?? '—',
      sortValue: (row) => new Date(row.lastQueryAt).getTime(),
    },
    {
      id: 'avgBetween',
      header: (
        <Group gap={4} wrap="nowrap">
          Avg between
          <InfoHoverIcon tooltip={AVG_BETWEEN_TOOLTIP} />
        </Group>
      ),
      render: (row) => formatAvgBetween(row.avgSecondsBetween),
      sortValue: (row) =>
        row.avgSecondsBetween != null && Number.isFinite(row.avgSecondsBetween)
          ? row.avgSecondsBetween
          : -1,
    },
  ];

  return (
    <Container fluid py="md">
      <PageBreadcrumbs
        items={[
          { label: 'Datasets', href: '/datasets' },
          { label: datasetId },
        ]}
      />

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" mb="md">
          {error}
        </Alert>
      )}

      {loading && (
        <Paper shadow="sm" withBorder p="sm">
          <Skeleton height={32} mb="xs" />
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} height={28} mb="xs" />
          ))}
        </Paper>
      )}

      {!loading && !error && (
        <Paper shadow="sm" withBorder p="sm">
          <Group justify="space-between" align="flex-end" mb="md" wrap="wrap" gap="sm">
            <Text fw={600} size="sm">
              Users who queried
            </Text>
            <Group align="center" gap="sm">
              <Select
                data={DAYS_OPTIONS}
                value={String(effectiveDays)}
                onChange={(v) => setDays(v ? parseInt(v, 10) : 1)}
                style={{ width: 90 }}
                size="xs"
              />
              <Text size="sm" c="dimmed">
                {rows.length === 0 ? '0 users' : `${rows.length.toLocaleString()} user${rows.length !== 1 ? 's' : ''}`}
              </Text>
            </Group>
          </Group>
          <DataTable
            data={rows}
            columns={columns}
            keyField="userId"
            defaultSort={{ column: 'numRequests', direction: 'desc' }}
            emptyMessage="No users queried this dataset in the selected range."
          />
        </Paper>
      )}
    </Container>
  );
}
