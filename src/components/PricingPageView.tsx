'use client';

import { useState } from 'react';
import {
  Skeleton,
  Alert,
  Stack,
  Paper,
  Text,
  Group,
  TextInput,
  SimpleGrid,
  ScrollArea,
  Badge,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { useFilter } from '@/contexts/FilterContext';
import { UserHoverCard } from './UserHoverCard';
import { AppContainer } from '@/components/AppContainer';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { PageBreadcrumbs } from './PageBreadcrumbs';

interface PricingPageVisitCount {
  email: string;
  visitCount: number;
  userId: number | null;
}

interface PricingPageResponse {
  visitCounts: {
    '1d': number;
    '7d': number;
    '30d': number;
  };
  mostVisits: {
    '1d': PricingPageVisitCount[];
    '7d': PricingPageVisitCount[];
    '30d': PricingPageVisitCount[];
  };
}

export function PricingPageView() {
  const [search, setSearch] = useState('');
  const url = useApiUrl('/api/pricing-page', {});
  const { data, loading, error } = useApiData<PricingPageResponse>(url, [url]);

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
        <ErrorDisplay title="Error loading data" error={error} />
      </AppContainer>
    );
  }

  if (!data) {
    return null;
  }

  const filterBySearch = <T extends { email: string }>(items: T[]): T[] => {
    if (!search) return items;
    const searchLower = search.toLowerCase();
    return items.filter((item) =>
      item.email.toLowerCase().includes(searchLower)
    );
  };

  const filteredMostVisits1d = filterBySearch(data.mostVisits['1d']);
  const filteredMostVisits7d = filterBySearch(data.mostVisits['7d']);
  const filteredMostVisits30d = filterBySearch(data.mostVisits['30d']);

  return (
    <AppContainer>
      <PageBreadcrumbs
        items={[{ label: 'Pricing Page' }]}
        rightSection={
          <TextInput
            placeholder="Search by email..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ width: 300 }}
          />
        }
      />
      <Text size="sm" c="dimmed" mb="md">
        Logged-in users who have visited the pricing page
      </Text>

      {/* Multi-column layout */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xs">
        {/* Last 24h */}
        <Paper
          shadow="sm"
          p="xs"
          radius="md"
          withBorder
          style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}
        >
          <Stack gap={4} style={{ flex: 1 }}>
            <Group justify="space-between" gap="xs" mb={4}>
              <Badge color="teal" variant="light" size="sm">
                Last 24h
              </Badge>
              <Text size="xs" c="dimmed" fw={500}>
                {filteredMostVisits1d.length}
              </Text>
            </Group>
            
            <ScrollArea style={{ flex: 1 }} offsetScrollbars>
              <Stack gap={4}>
                {filteredMostVisits1d.length === 0 ? (
                  <Text size="xs" c="dimmed" py="sm" ta="center">
                    {search ? 'No matches' : 'None'}
                  </Text>
                ) : (
                  filteredMostVisits1d.map((item, index) => (
                    <Paper
                      key={`${item.email}-${index}`}
                      p={6}
                      withBorder
                    >
                      <Stack gap={2}>
                        <Group justify="space-between" gap={4} wrap="nowrap">
                          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                            {item.userId ? (
                              <UserHoverCard userId={item.userId} userName={item.email} />
                            ) : (
                              <Text size="xs" fw={500} lineClamp={1}>
                                {item.email}
                              </Text>
                            )}
                          </div>
                          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                            {item.visitCount}
                          </Text>
                        </Group>
                      </Stack>
                    </Paper>
                  ))
                )}
              </Stack>
            </ScrollArea>
          </Stack>
        </Paper>

        {/* Last 7d */}
        <Paper
          shadow="sm"
          p="xs"
          radius="md"
          withBorder
          style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}
        >
          <Stack gap={4} style={{ flex: 1 }}>
            <Group justify="space-between" gap="xs" mb={4}>
              <Badge color="violet" variant="light" size="sm">
                Last 7d
              </Badge>
              <Text size="xs" c="dimmed" fw={500}>
                {filteredMostVisits7d.length}
              </Text>
            </Group>
            
            <ScrollArea style={{ flex: 1 }} offsetScrollbars>
              <Stack gap={4}>
                {filteredMostVisits7d.length === 0 ? (
                  <Text size="xs" c="dimmed" py="sm" ta="center">
                    {search ? 'No matches' : 'None'}
                  </Text>
                ) : (
                  filteredMostVisits7d.map((item, index) => (
                    <Paper
                      key={`${item.email}-${index}`}
                      p={6}
                      withBorder
                    >
                      <Stack gap={2}>
                        <Group justify="space-between" gap={4} wrap="nowrap">
                          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                            {item.userId ? (
                              <UserHoverCard userId={item.userId} userName={item.email} />
                            ) : (
                              <Text size="xs" fw={500} lineClamp={1}>
                                {item.email}
                              </Text>
                            )}
                          </div>
                          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                            {item.visitCount}
                          </Text>
                        </Group>
                      </Stack>
                    </Paper>
                  ))
                )}
              </Stack>
            </ScrollArea>
          </Stack>
        </Paper>

        {/* Last 30d */}
        <Paper
          shadow="sm"
          p="xs"
          radius="md"
          withBorder
          style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}
        >
          <Stack gap={4} style={{ flex: 1 }}>
            <Group justify="space-between" gap="xs" mb={4}>
              <Badge color="orange" variant="light" size="sm">
                Last 30d
              </Badge>
              <Text size="xs" c="dimmed" fw={500}>
                {filteredMostVisits30d.length}
              </Text>
            </Group>
            
            <ScrollArea style={{ flex: 1 }} offsetScrollbars>
              <Stack gap={4}>
                {filteredMostVisits30d.length === 0 ? (
                  <Text size="xs" c="dimmed" py="sm" ta="center">
                    {search ? 'No matches' : 'None'}
                  </Text>
                ) : (
                  filteredMostVisits30d.map((item, index) => (
                    <Paper
                      key={`${item.email}-${index}`}
                      p={6}
                      withBorder
                    >
                      <Stack gap={2}>
                        <Group justify="space-between" gap={4} wrap="nowrap">
                          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                            {item.userId ? (
                              <UserHoverCard userId={item.userId} userName={item.email} />
                            ) : (
                              <Text size="xs" fw={500} lineClamp={1}>
                                {item.email}
                              </Text>
                            )}
                          </div>
                          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                            {item.visitCount}
                          </Text>
                        </Group>
                      </Stack>
                    </Paper>
                  ))
                )}
              </Stack>
            </ScrollArea>
          </Stack>
        </Paper>
      </SimpleGrid>
    </AppContainer>
  );
}

