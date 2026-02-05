'use client';

import {
  Container,
  Title,
  Paper,
  Text,
  Anchor,
  Loader,
  Stack,
  Alert,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import Link from 'next/link';
import { PlanListItem, PlansResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
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
    <Container fluid py="xl">
      <PageBreadcrumbs items={[{ label: 'Plans' }]} />
      <Title order={1} mb="xl">
        Plans
      </Title>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error loading plans"
          color="red"
          mb="md"
        >
          {error}
        </Alert>
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
    </Container>
  );
}
