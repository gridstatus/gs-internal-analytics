'use client';

import { Paper, Stack, Text, List } from '@mantine/core';
import { AppContainer } from '@/components/AppContainer';
import { PageBreadcrumbs } from './PageBreadcrumbs';

const IDEAS = [
  'New trial button',
  'Connect to HubSpot',
  'Integrate into front',
  'Delete subscription',
  'Support toggling trial eligibility for user',
  'Support managing page announcements',
];

export function FutureIdeasView() {
  return (
    <AppContainer>
      <PageBreadcrumbs items={[{ label: 'Future Ideas' }]} />
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Text fw={600} size="lg" mb="md">
          Ideas / todo
        </Text>
        <List spacing="xs">
          {IDEAS.map((idea, i) => (
            <List.Item key={i}>{idea}</List.Item>
          ))}
        </List>
      </Paper>
    </AppContainer>
  );
}
