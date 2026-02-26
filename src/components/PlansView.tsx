'use client';

import {
  Paper,
  Text,
  Anchor,
  Loader,
  Stack,
} from '@mantine/core';
import Link from 'next/link';
import { PlanListItem, PlansResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { AppContainer } from '@/components/AppContainer';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { DataTable, Column } from './DataTable';
import { PageBreadcrumbs } from './PageBreadcrumbs';

export function PlansView() {
  const url = '/api/plans';
  const { data, loading, error } = useApiData<PlansResponse>(url, [url]);
  const plans = data?.plans ?? [];

  const columns: Column<PlanListItem>[] = [
    {
      id: 'id',
      header: 'Id',
      align: 'right',
      render: (row) => row.id,
      sortValue: (row) => row.id,
    },
    {
      id: 'planName',
      header: 'Name',
      align: 'left',
      render: (row) => (
        <Anchor component={Link} href={`/plans/${row.id}`}>
          {row.planName}
        </Anchor>
      ),
      sortValue: (row) => row.planName.toLowerCase(),
    },
  ];

  return (
    <AppContainer>
      <PageBreadcrumbs items={[{ label: 'Plans' }]} />

      {error && (
        <ErrorDisplay title="Error loading plans" error={error} />
      )}

      <Paper shadow="sm" p="md" radius="md" withBorder>
        {loading ? (
          <Stack align="center" py="xl">
            <Loader />
          </Stack>
        ) : (
          <DataTable
            data={plans}
            columns={columns}
            keyField="id"
            defaultSort={{ column: 'id', direction: 'asc' }}
            emptyMessage="No plans found"
          />
        )}
      </Paper>
    </AppContainer>
  );
}
