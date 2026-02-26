'use client';

import { useState, useMemo } from 'react';
import {
  Skeleton,
  Stack,
  Paper,
  Text,
  Group,
  TextInput,
  Anchor,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import Link from 'next/link';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { AppContainer } from '@/components/AppContainer';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { DataTable, Column } from './DataTable';
import { PageBreadcrumbs } from './PageBreadcrumbs';

interface DatasetRow {
  id: string;
  name: string;
  source: string;
  earliestAvailableTimeUtc: string | null;
  numUniqueUsers24h?: number;
}

interface DatasetsResponse {
  data: DatasetRow[];
}

interface Usage24hResponse {
  data: Array<{
    datasetId: string;
    numUniqueUsers: number;
    lastQueryAt: string;
  }>;
}

function formatDataCreated(utc: string | null): string {
  if (!utc) return '—';
  try {
    const d = new Date(utc);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export function DatasetsListView() {
  const [search, setSearch] = useState('');
  const { data, loading, error } = useApiData<DatasetsResponse>('/api/datasets', ['/api/datasets']);
  const usageUrl = useApiUrl('/api/datasets/usage-24h', {});
  const { data: usageData } = useApiData<Usage24hResponse>(usageUrl, [usageUrl]);

  const usageByDatasetId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of usageData?.data ?? []) {
      map.set(row.datasetId, row.numUniqueUsers);
    }
    return map;
  }, [usageData?.data]);

  const mergedData = useMemo(() => {
    const list = data?.data ?? [];
    return list.map((row) => ({
      ...row,
      numUniqueUsers24h: usageByDatasetId.get(row.id),
    }));
  }, [data?.data, usageByDatasetId]);

  const filteredData = useMemo(() => {
    if (!search.trim()) return mergedData;
    const s = search.toLowerCase().trim();
    return mergedData.filter(
      (row) =>
        row.name.toLowerCase().includes(s) ||
        row.id.toLowerCase().includes(s) ||
        row.source.toLowerCase().includes(s)
    );
  }, [mergedData, search]);

  const columns: Column<DatasetRow>[] = [
    {
      id: 'name',
      header: 'Name',
      align: 'left',
      render: (row) => (
        <Anchor component={Link} href={`/datasets/${encodeURIComponent(row.id)}`}>
          {row.name}
        </Anchor>
      ),
      sortValue: (row) => row.name.toLowerCase(),
    },
    {
      id: 'source',
      header: 'Source',
      align: 'left',
      render: (row) => row.source || '—',
      sortValue: (row) => row.source.toLowerCase(),
    },
    {
      id: 'numUniqueUsers24h',
      header: 'Users (24h)',
      align: 'right',
      render: (row) =>
        row.numUniqueUsers24h != null ? row.numUniqueUsers24h.toLocaleString() : '—',
      sortValue: (row) => row.numUniqueUsers24h ?? -1,
    },
    {
      id: 'dataCreated',
      header: 'Data created',
      align: 'left',
      render: (row) => formatDataCreated(row.earliestAvailableTimeUtc),
      sortValue: (row) =>
        row.earliestAvailableTimeUtc ? new Date(row.earliestAvailableTimeUtc).getTime() : 0,
    },
    {
      id: 'id',
      header: 'ID',
      align: 'left',
      render: (row) => (
        <Anchor component={Link} href={`/datasets/${encodeURIComponent(row.id)}`} size="sm" c="dimmed">
          {row.id}
        </Anchor>
      ),
      sortValue: (row) => row.id.toLowerCase(),
    },
  ];

  return (
    <AppContainer>
      <PageBreadcrumbs items={[{ label: 'Datasets' }]} />
      <Text size="sm" c="dimmed" mb="md">
        Click a dataset to see users who queried it.
      </Text>

      {loading ? (
        <Stack gap="md">
          <Skeleton height={400} />
        </Stack>
      ) : error ? (
        <ErrorDisplay title="Error loading datasets" error={error} />
      ) : data ? (
        <Paper shadow="sm" p="md" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Text fw={600} size="lg">
              All datasets
            </Text>
            <TextInput
              placeholder="Search by name, source, or ID..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ width: 280 }}
            />
          </Group>
          <DataTable
            data={filteredData}
            columns={columns}
            keyField="id"
            defaultSort={{ column: 'numUniqueUsers24h', direction: 'desc' }}
            emptyMessage="No datasets found."
          />
          <Text size="xs" c="dimmed" mt="md">
            Showing {filteredData.length} dataset{filteredData.length !== 1 ? 's' : ''}.
          </Text>
        </Paper>
      ) : null}
    </AppContainer>
  );
}
