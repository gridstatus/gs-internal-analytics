'use client';

import { useParams } from 'next/navigation';
import {
  Paper,
  Stack,
  Anchor,
  Text,
  SegmentedControl,
  Skeleton,
  Alert,
  Table,
  SimpleGrid,
} from '@mantine/core';
import { AppContainer } from '@/components/AppContainer';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import Link from 'next/link';
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs';
import { DateTime } from 'luxon';
import { useQueryState, parseAsStringEnum } from 'nuqs';
import { useApiUrl } from '@/hooks/useApiUrl';
import { useApiData } from '@/hooks/useApiData';
import { useFilter } from '@/contexts/FilterContext';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import { UserHoverCard } from '@/components/UserHoverCard';

interface EventDetailResponse {
  eventName: string;
  period: 'day' | 'week' | 'month';
  frequencyOverTime: Array< { month: string; count: number }>;
  uniqueUsersOverTime: Array< { month: string; uniqueUsers: number }>;
  occurrences: Array< { timestamp: string; email: string | null; userId: number | null }>;
}

export default function PosthogEventDetailPage() {
  const params = useParams();
  const eventName = params.event ? decodeURIComponent(params.event as string) : '';
  const { timezone } = useFilter();

  const [period, setPeriod] = useQueryState(
    'period',
    parseAsStringEnum(['day', 'week', 'month']).withDefault('month')
  );

  const url = eventName
    ? useApiUrl(`/api/posthog-event-explorer/${encodeURIComponent(eventName)}`, { period })
    : null;
  const { data, loading, error } = useApiData<EventDetailResponse>(url, [eventName, period]);

  if (!eventName) {
    return (
      <AppContainer>
        <Alert color="yellow" title="Missing event">Event name is required.</Alert>
      </AppContainer>
    );
  }

  if (loading) {
    return (
      <AppContainer>
        <Stack gap="md">
          <Skeleton height={24} width={200} />
          <Skeleton height={40} width={300} />
          <Skeleton height={320} />
          <Skeleton height={320} />
          <Skeleton height={300} />
        </Stack>
      </AppContainer>
    );
  }

  if (error) {
    return (
      <AppContainer>
        <ErrorDisplay title="Error" error={error} />
      </AppContainer>
    );
  }

  const freq = data?.frequencyOverTime ?? [];
  const users = data?.uniqueUsersOverTime ?? [];
  const occurrences = data?.occurrences ?? [];
  const periodLabel = period === 'day' ? 'Day' : period === 'week' ? 'Week' : 'Month';

  return (
    <AppContainer>
      <Stack gap="md">
        <PageBreadcrumbs
          items={[
            { label: 'Event Explorer', href: '/posthog-event-explorer' },
            { label: eventName },
          ]}
          rightSection={
            <SegmentedControl
              value={period}
              onChange={(v) => setPeriod((v as 'day' | 'week' | 'month') || 'month')}
              data={[
                { label: 'By day', value: 'day' },
                { label: 'By week', value: 'week' },
                { label: 'By month', value: 'month' },
              ]}
            />
          }
        />

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
          <TimeSeriesChart
            title="Frequency over time"
            subtitle={`Event count per ${periodLabel.toLowerCase()}`}
            data={freq}
            dataKey="count"
            color="blue.6"
            chartType="bar"
          />
          <TimeSeriesChart
            title="Unique users over time"
            subtitle={`Distinct users per ${periodLabel.toLowerCase()}`}
            data={users}
            dataKey="uniqueUsers"
            color="teal.6"
            chartType="bar"
          />
        </SimpleGrid>

        <Paper shadow="sm" withBorder p="md">
            <Text fw={600} size="lg" mb="md">
              Recent occurrences
            </Text>
            {occurrences.length === 0 ? (
              <Text size="sm" c="dimmed">
                No occurrences in this window.
              </Text>
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Time</Table.Th>
                    <Table.Th>User</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {occurrences.map((occ, i) => (
                    <Table.Tr key={`${occ.timestamp}-${i}`}>
                      <Table.Td>
                        <Text size="sm">
                          {DateTime.fromISO(occ.timestamp)
                            .setZone(timezone)
                            .toLocaleString(DateTime.DATETIME_SHORT)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {occ.userId ? (
                          <UserHoverCard
                            userId={occ.userId}
                            userName={occ.email || ''}
                          />
                        ) : (
                          <Text size="sm" c="dimmed">
                            {occ.email || '—'}
                          </Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
      </Stack>
    </AppContainer>
  );
}
