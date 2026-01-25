'use client';

import { useState, useCallback } from 'react';
import {
  HoverCard,
  Anchor,
  Text,
  Group,
  Stack,
  Badge,
  Loader,
  ThemeIcon,
  Divider,
  Button,
} from '@mantine/core';
import {
  IconUser,
  IconChartBar,
  IconLayout,
  IconBell,
  IconCalendar,
  IconBuilding,
  IconExternalLink,
} from '@tabler/icons-react';
import Link from 'next/link';

interface UserSummary {
  user: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    createdAt: string;
    lastActiveAt: string | null;
  };
  organizations: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  stats: {
    chartCount: number;
    dashboardCount: number;
    alertCount: number;
    apiRequests30d: number;
  };
}

interface UserHoverCardProps {
  userId: number;
  userName: string;
  /** Optional delay in ms before showing the card (default: 400) */
  openDelay?: number;
  /** Optional delay in ms before hiding the card (default: 150) */
  closeDelay?: number;
}

export function UserHoverCard({
  userId,
  userName,
  openDelay = 400,
  closeDelay = 150,
}: UserHoverCardProps) {
  const [data, setData] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchUserSummary = useCallback(async () => {
    if (hasFetched) return;
    
    setLoading(true);
    setError(null);
    setHasFetched(true);
    
    try {
      const response = await fetch(`/api/users-list?id=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId, hasFetched]);

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    
    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  const getDomainFromUsername = (username: string): string | null => {
    if (username.includes('@')) {
      return username.split('@')[1];
    }
    return null;
  };

  return (
    <HoverCard
      width={320}
      shadow="md"
      withArrow
      openDelay={openDelay}
      closeDelay={closeDelay}
      onOpen={fetchUserSummary}
    >
      <HoverCard.Target>
        <Anchor 
          component={Link} 
          href={`/users-list/${userId}`}
          size="sm"
          style={{ 
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%'
          }}
        >
          {userName}
        </Anchor>
      </HoverCard.Target>

      <HoverCard.Dropdown>
        {loading ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        ) : error ? (
          <Text size="sm" c="red">
            {error}
          </Text>
        ) : data ? (
          <Stack gap="sm">
            {/* Header */}
            <Group gap="sm">
              <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                <IconUser size={20} />
              </ThemeIcon>
              <Stack gap={0}>
                <Text fw={600} size="sm">
                  {data.user.firstName && data.user.lastName
                    ? `${data.user.firstName} ${data.user.lastName}`
                    : data.user.username}
                </Text>
                <Text size="xs" c="dimmed">
                  {data.user.username}
                </Text>
              </Stack>
            </Group>

            {/* Domain */}
            {getDomainFromUsername(data.user.username) && (
              <Group gap="xs">
                <Text size="xs" c="dimmed">Domain:</Text>
                <Anchor
                  component={Link}
                  href={`/domains/${encodeURIComponent(getDomainFromUsername(data.user.username)!)}`}
                  size="xs"
                >
                  {getDomainFromUsername(data.user.username)}
                </Anchor>
              </Group>
            )}

            {/* Organizations */}
            {data.organizations.length > 0 && (
              <Group gap="xs" wrap="wrap">
                <IconBuilding size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                {data.organizations.slice(0, 2).map((org) => (
                  <Anchor
                    key={org.id}
                    component={Link}
                    href={`/organizations/${org.id}`}
                    size="xs"
                  >
                    <Badge variant="light" size="sm">
                      {org.name}
                    </Badge>
                  </Anchor>
                ))}
                {data.organizations.length > 2 && (
                  <Text size="xs" c="dimmed">
                    +{data.organizations.length - 2} more
                  </Text>
                )}
              </Group>
            )}

            <Divider />

            {/* Stats */}
            <Group gap="lg" justify="center">
              <Stack gap={0} align="center">
                <Group gap={4}>
                  <IconChartBar size={14} style={{ color: 'var(--mantine-color-blue-6)' }} />
                  <Text size="sm" fw={600}>
                    {data.stats.chartCount}
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">Charts</Text>
              </Stack>
              <Stack gap={0} align="center">
                <Group gap={4}>
                  <IconLayout size={14} style={{ color: 'var(--mantine-color-teal-6)' }} />
                  <Text size="sm" fw={600}>
                    {data.stats.dashboardCount}
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">Dashboards</Text>
              </Stack>
              <Stack gap={0} align="center">
                <Group gap={4}>
                  <IconBell size={14} style={{ color: 'var(--mantine-color-orange-6)' }} />
                  <Text size="sm" fw={600}>
                    {data.stats.alertCount}
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">Alerts</Text>
              </Stack>
            </Group>

            <Divider />

            {/* Activity */}
            <Group justify="space-between">
              <Group gap={4}>
                <IconCalendar size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                <Text size="xs" c="dimmed">Joined</Text>
              </Group>
              <Text size="xs">
                {new Date(data.user.createdAt).toLocaleDateString()}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Last active</Text>
              <Text size="xs" fw={500}>
                {data.user.lastActiveAt
                  ? formatTimeAgo(data.user.lastActiveAt)
                  : 'Never'}
              </Text>
            </Group>

            {/* API Activity */}
            {data.stats.apiRequests30d > 0 && (
              <Group justify="space-between">
                <Text size="xs" c="dimmed">API requests (30d)</Text>
                <Text size="xs" fw={500}>
                  {data.stats.apiRequests30d.toLocaleString()}
                </Text>
              </Group>
            )}

            <Divider />

            {/* CTA Button */}
            <Button
              component={Link}
              href={`/users-list/${userId}`}
              variant="light"
              size="xs"
              fullWidth
              leftSection={<IconExternalLink size={14} />}
            >
              View Profile
            </Button>
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">
            Hover to load user info
          </Text>
        )}
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

