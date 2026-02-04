'use client';

import { useMemo } from 'react';
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
  SegmentedControl,
  Anchor,
  List,
  Accordion,
} from '@mantine/core';
import { IconAlertCircle, IconSearch } from '@tabler/icons-react';
import Link from 'next/link';
import { useQueryState, parseAsString, parseAsInteger } from 'nuqs';
import { PosthogEventExplorerResponse, PosthogEventExplorerEvent } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';

const OTHER_GROUP = 'Other';

function getGroupKey(eventName: string): string {
  const dot = eventName.indexOf('.');
  return dot > 0 ? eventName.slice(0, dot) : OTHER_GROUP;
}

function groupEventsByPrefix(events: PosthogEventExplorerEvent[]): Map<string, PosthogEventExplorerEvent[]> {
  const map = new Map<string, PosthogEventExplorerEvent[]>();
  for (const row of events) {
    const key = getGroupKey(row.event);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.event.localeCompare(b.event));
  }
  return map;
}

function sortedGroupKeys(map: Map<string, PosthogEventExplorerEvent[]>): string[] {
  const keys = Array.from(map.keys());
  const named = keys.filter((k) => k !== OTHER_GROUP).sort((a, b) => a.localeCompare(b));
  const other = keys.filter((k) => k === OTHER_GROUP);
  return [...named, ...other];
}

export function PosthogEventExplorerView() {
  const [search, setSearch] = useQueryState('search', parseAsString.withDefault(''));
  const [days, setDays] = useQueryState(
    'days',
    parseAsInteger.withDefault(7).withOptions({ shallow: false })
  );

  const url = useApiUrl('/api/posthog-event-explorer', { days });
  const { data, loading, error } = useApiData<PosthogEventExplorerResponse>(url, [url]);

  const filteredEvents = useMemo(() => {
    if (!data?.events) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.events;
    return data.events.filter((row) => row.event.toLowerCase().includes(q));
  }, [data?.events, search]);

  const eventsByGroup = useMemo(() => groupEventsByPrefix(filteredEvents), [filteredEvents]);
  const groupKeys = useMemo(() => sortedGroupKeys(eventsByGroup), [eventsByGroup]);

  const events = data?.events ?? [];
  const hasSearch = search.trim().length > 0;

  return (
    <Container fluid py="xl">
      <Stack gap="md">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
          <Title order={1}>PostHog Event Explorer</Title>
        </Group>

        <Text size="sm" c="dimmed">
          Unique events from the last {days} day{days !== 1 ? 's' : ''} of PostHog data, grouped by prefix (before the first <Text span inherit component="code">.</Text>). Click an event to view its analysis.
        </Text>

        <Group align="flex-end" wrap="wrap" gap="md">
          <TextInput
            placeholder="Search event names..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value || null)}
            style={{ minWidth: 260 }}
          />
          <SegmentedControl
            value={String(days)}
            onChange={(v) => setDays(v ? parseInt(v, 10) : 7)}
            data={[
              { label: '7 days', value: '7' },
              { label: '30 days', value: '30' },
              { label: '90 days', value: '90' },
            ]}
          />
        </Group>

        {loading ? (
          <Skeleton height={400} />
        ) : error ? (
          <Alert icon={<IconAlertCircle size={16} />} title="Error loading data" color="red">
            {error}
          </Alert>
        ) : (
        <Paper shadow="sm" withBorder p="md">
          <Stack gap="xs">
            <Text size="sm" fw={500} c="dimmed">
              {hasSearch
                ? `${filteredEvents.length.toLocaleString()} event${filteredEvents.length !== 1 ? 's' : ''} matching "${search}"`
                : `${events.length.toLocaleString()} unique event${events.length !== 1 ? 's' : ''}`}
            </Text>
            {filteredEvents.length === 0 ? (
              <Text size="sm" c="dimmed">
                {hasSearch ? 'No events match your search.' : 'No events in this period.'}
              </Text>
            ) : (
              <Accordion variant="separated" multiple defaultValue={groupKeys.slice(0, 3)}>
                {groupKeys.map((groupKey) => {
                  const groupEvents = eventsByGroup.get(groupKey) ?? [];
                  const totalUsers = groupEvents.reduce((sum, r) => sum + r.uniqueUsers, 0);
                  return (
                    <Accordion.Item key={groupKey} value={groupKey}>
                      <Accordion.Control>
                        <Group gap="sm">
                          <Text fw={500}>{groupKey}</Text>
                          <Text size="sm" c="dimmed">
                            {groupEvents.length} event{groupEvents.length !== 1 ? 's' : ''} · {totalUsers.toLocaleString()} users
                          </Text>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <List listStyleType="disc" spacing="xs">
                          {groupEvents.map((row) => (
                            <List.Item key={row.event}>
                              <Group gap="sm" wrap="nowrap">
                                <Anchor
                                  component={Link}
                                  href={`/posthog-event-explorer/${encodeURIComponent(row.event)}`}
                                >
                                  {row.event}
                                </Anchor>
                                <Text size="sm" c="dimmed" component="span">
                                  ({row.uniqueUsers.toLocaleString()} users)
                                </Text>
                              </Group>
                            </List.Item>
                          ))}
                        </List>
                      </Accordion.Panel>
                    </Accordion.Item>
                  );
                })}
              </Accordion>
            )}
          </Stack>
        </Paper>
        )}
      </Stack>
    </Container>
  );
}
