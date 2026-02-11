'use client';

import { useEffect, useState } from 'react';
import {
  Skeleton,
  Alert,
  Stack,
  Paper,
  Text,
  Group,
  Tabs,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { useFilter } from '@/contexts/FilterContext';
import { TopRegistration, TopRegistrationsResponse } from '@/lib/api-types';
import { PageBreadcrumbs } from './PageBreadcrumbs';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { AppContainer } from '@/components/AppContainer';
import { DataTable, Column } from './DataTable';

export function TopRegistrationsView() {
  const [activeTab, setActiveTab] = useState<string | null>('day');

  const url = useApiUrl('/api/top-registrations', {});
  const { data, loading, error } = useApiData<TopRegistrationsResponse>(url, [url]);

  // Initialize active tab from data on first load
  useEffect(() => {
    if (data?.data && data.data.length > 0 && activeTab === null) {
      setActiveTab(data.data[0].periodType);
    }
  }, [data]);

  if (loading) {
    return (
      <AppContainer>
        <Stack gap="md">
          <Skeleton height={50} width={300} />
          <Skeleton height={400} />
        </Stack>
      </AppContainer>
    );
  }

  if (error) {
    return (
      <AppContainer>
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error loading data"
          color="red"
        >
          {error}
        </Alert>
      </AppContainer>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <AppContainer>
        <Alert title="No data" color="yellow">
          No registration data available.
        </Alert>
      </AppContainer>
    );
  }

  // Group data by period type
  const byPeriodType = {
    day: data.data.filter((d) => d.periodType === 'day').slice(0, 100),
    week: data.data.filter((d) => d.periodType === 'week').slice(0, 100),
    month: data.data.filter((d) => d.periodType === 'month').slice(0, 100),
  };

  const formatPeriod = (period: string, type: string) => {
    const start = DateTime.fromISO(period, { zone: 'utc' });
    
    if (type === 'day') {
      return start.toLocaleString(DateTime.DATE_FULL);
    } else if (type === 'week') {
      const end = start.plus({ days: 6 });
      return `${start.toFormat('MMM d')} - ${end.toLocaleString(DateTime.DATE_FULL)}`;
    } else {
      return start.toFormat('MMM yyyy');
    }
  };

  const createColumns = (type: string): Column<TopRegistration & { rank: number }>[] => [
    {
      id: 'rank',
      header: 'Rank',
      align: 'left',
      render: (row) => row.rank,
      sortable: false,
    },
    {
      id: 'period',
      header: type === 'day' ? 'Day' : type === 'week' ? 'Week' : 'Month',
      align: 'left',
      render: (row) => formatPeriod(row.period, row.periodType),
      sortValue: (row) => row.period,
    },
    {
      id: 'registrationCount',
      header: 'Registrations',
      align: 'right',
      render: (row) => row.registrationCount.toLocaleString(),
      sortValue: (row) => row.registrationCount,
    },
  ];

  const renderTable = (periodData: TopRegistration[], type: string) => {
    const dataWithRank = periodData.map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

    return (
      <DataTable
        data={dataWithRank}
        columns={createColumns(type)}
        keyField="period"
        defaultSort={{ column: 'registrationCount', direction: 'desc' }}
      />
    );
  };

  return (
    <AppContainer>
      <PageBreadcrumbs
        items={[
          { label: 'User Registrations', href: '/users' },
          { label: 'Top Registrations' },
        ]}
      />

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="day">Days</Tabs.Tab>
          <Tabs.Tab value="week">Weeks</Tabs.Tab>
          <Tabs.Tab value="month">Months</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="day" pt="md">
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600} size="lg">
                Top Registration Days
              </Text>
              {byPeriodType.day.length >= 100 && (
                <Text size="sm" c="dimmed">
                  Showing top 100 days
                </Text>
              )}
            </Group>
            {renderTable(byPeriodType.day, 'day')}
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="week" pt="md">
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600} size="lg">
                Top Registration Weeks
              </Text>
              {byPeriodType.week.length >= 100 && (
                <Text size="sm" c="dimmed">
                  Showing top 100 weeks
                </Text>
              )}
            </Group>
            {renderTable(byPeriodType.week, 'week')}
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="month" pt="md">
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600} size="lg">
                Top Registration Months
              </Text>
              {byPeriodType.month.length >= 100 && (
                <Text size="sm" c="dimmed">
                  Showing top 100 months
                </Text>
              )}
            </Group>
            {renderTable(byPeriodType.month, 'month')}
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </AppContainer>
  );
}

