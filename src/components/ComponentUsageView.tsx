'use client';

import { useState } from 'react';
import {
  Skeleton,
  Alert,
  Stack,
  Paper,
  Text,
  TextInput,
  Group,
  SimpleGrid,
  Modal,
  ScrollArea,
} from '@mantine/core';
import { IconAlertCircle, IconSearch } from '@tabler/icons-react';
import { UserHoverCard } from './UserHoverCard';
import type { ComponentUsageRow } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { AppContainer } from '@/components/AppContainer';
import { DataTable, Column } from './DataTable';
import { PageBreadcrumbs } from './PageBreadcrumbs';

export function ComponentUsageView() {
  const [search, setSearch] = useState('');
  const [modalRow, setModalRow] = useState<ComponentUsageRow | null>(null);
  const url = useApiUrl('/api/component-usage', {});
  const { data, loading, error } = useApiData<ComponentUsageRow[]>(url, [url]);

  const filteredData =
    data?.filter((row) =>
      (row.componentType ?? '').toLowerCase().includes(search.toLowerCase())
    ) ?? [];

  const columns: Column<ComponentUsageRow>[] = [
    {
      id: 'componentType',
      header: 'Component Type',
      align: 'left',
      render: (row) => row.componentType ?? '—',
      sortValue: (row) => (row.componentType ?? '').toLowerCase(),
    },
    {
      id: 'chartsTotalCount',
      header: 'Charts Count',
      align: 'right',
      render: (row) => row.chartsTotalCount.toLocaleString(),
      sortValue: (row) => row.chartsTotalCount,
    },
    {
      id: 'chartsUniqueUsers',
      header: 'Charts Users',
      align: 'right',
      render: (row) => row.chartsUniqueUsers.toLocaleString(),
      sortValue: (row) => row.chartsUniqueUsers,
    },
    {
      id: 'dashboardsTotalCount',
      header: 'Dashboards Count',
      align: 'right',
      render: (row) => row.dashboardsTotalCount.toLocaleString(),
      sortValue: (row) => row.dashboardsTotalCount,
    },
    {
      id: 'dashboardsUniqueUsers',
      header: 'Dashboards Users',
      align: 'right',
      render: (row) => row.dashboardsUniqueUsers.toLocaleString(),
      sortValue: (row) => row.dashboardsUniqueUsers,
    },
  ];

  return (
    <AppContainer>
      <PageBreadcrumbs
        items={[
          { label: 'Charts & Dashboards', href: '/charts-dashboards' },
          { label: 'Component Usage' },
        ]}
      />

      {loading ? (
        <Stack gap="md">
          <Skeleton height={40} />
          <Skeleton height={400} />
        </Stack>
      ) : error ? (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error loading data"
          color="red"
        >
          {error}
        </Alert>
      ) : data ? (
        <Paper shadow="sm" p="md" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Text fw={600} size="lg">
              Component usage in charts and dashboards
            </Text>
            <TextInput
              placeholder="Search by component type..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ width: '100%', maxWidth: 300 }}
            />
          </Group>
          <DataTable
            data={filteredData}
            columns={columns}
            keyField="componentType"
            defaultSort={{ column: 'chartsTotalCount', direction: 'desc' }}
            onRowClick={setModalRow}
          />
          <Text size="xs" c="dimmed" mt="md">
            Click a row to see users who use this component in charts or
            dashboards.
          </Text>
        </Paper>
      ) : null}

      <Modal
        opened={modalRow !== null}
        onClose={() => setModalRow(null)}
        title={modalRow ? `Users — ${modalRow.componentType}` : ''}
        size="md"
      >
        {modalRow && (
          <ScrollArea.Autosize mah={400}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <div>
                <Text size="sm" fw={600} mb="xs">
                  Charts users
                </Text>
                {modalRow.chartsUsers.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    No users
                  </Text>
                ) : (
                  <Stack gap={4}>
                    {modalRow.chartsUsers.map((u) => (
                      <UserHoverCard
                        key={u.id}
                        userId={u.id}
                        userName={u.username}
                      />
                    ))}
                  </Stack>
                )}
              </div>
              <div>
                <Text size="sm" fw={600} mb="xs">
                  Dashboards users
                </Text>
                {modalRow.dashboardsUsers.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    No users
                  </Text>
                ) : (
                  <Stack gap={4}>
                    {modalRow.dashboardsUsers.map((u) => (
                      <UserHoverCard
                        key={u.id}
                        userId={u.id}
                        userName={u.username}
                      />
                    ))}
                  </Stack>
                )}
              </div>
            </SimpleGrid>
          </ScrollArea.Autosize>
        )}
      </Modal>
    </AppContainer>
  );
}
