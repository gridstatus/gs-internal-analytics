'use client';

import { useState, useMemo } from 'react';
import {
  Container,
  Title,
  SimpleGrid,
  Skeleton,
  Alert,
  Stack,
  Paper,
  TextInput,
  Text,
  Badge,
  Group,
  ScrollArea,
  Anchor,
  Progress,
} from '@mantine/core';
import { IconAlertCircle, IconSearch } from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';
import { UserHoverCard } from './UserHoverCard';
import Link from 'next/link';
import { ActivitiesResponse, Activity, ActivityType, ActiveUsersResponse } from '@/lib/api-types';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';

const activityTypeLabels: Record<Activity['activityType'], string> = {
  user_registered: 'User Registered',
  joined_org: 'Joined Org',
  created_chart: 'Created Chart',
  created_dashboard: 'Created Dashboard',
  created_api_key: 'Created API Key',
  created_alert: 'Created Alert',
};

const activityTypeColors: Record<Activity['activityType'], string> = {
  user_registered: 'blue',
  joined_org: 'violet',
  created_chart: 'teal',
  created_dashboard: 'cyan',
  created_api_key: 'orange',
  created_alert: 'red',
};

const ALL_ACTIVITY_TYPES: ActivityType[] = [
  'user_registered',
  'joined_org',
  'created_chart',
  'created_dashboard',
  'created_api_key',
  'created_alert',
];

// Combined type for charts and dashboards
const CHARTS_DASHBOARDS_TYPES: ActivityType[] = ['created_chart', 'created_dashboard'];

export function Dashboard() {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const activitiesUrl = useApiUrl('/api/activities', {});
  const activeUsersUrl = useApiUrl('/api/domains', {});
  const { data, loading, error } = useApiData<ActivitiesResponse>(activitiesUrl, [activitiesUrl]);
  const { data: activeUsersData, loading: activeUsersLoading, error: activeUsersError } = useApiData<ActiveUsersResponse>(activeUsersUrl, [activeUsersUrl]);

  // Group activities by type and filter by search
  const activitiesByType = useMemo(() => {
    if (!data) return {} as Record<ActivityType | 'charts_dashboards', Activity[]>;
    
    const searchLower = debouncedSearch.toLowerCase();
    const grouped = {} as Record<ActivityType | 'charts_dashboards', Activity[]>;
    
    ALL_ACTIVITY_TYPES.forEach(type => {
      // Skip individual chart/dashboard types - we'll combine them
      if (CHARTS_DASHBOARDS_TYPES.includes(type)) return;
      
      grouped[type] = data.activities
        .filter(activity => {
          if (activity.activityType !== type) return false;
          
          // Filter by search
          const matchesSearch = 
            activity.username.toLowerCase().includes(searchLower) ||
            activityTypeLabels[activity.activityType].toLowerCase().includes(searchLower) ||
            (activity.activityDetail && activity.activityDetail.toLowerCase().includes(searchLower));
          return matchesSearch;
        })
        .slice(0, 50); // Limit to 50 per column for performance
    });
    
    // Combine charts and dashboards into one column
    grouped['charts_dashboards'] = data.activities
      .filter(activity => {
        if (!CHARTS_DASHBOARDS_TYPES.includes(activity.activityType)) return false;
        
        // Filter by search
        const matchesSearch = 
          activity.username.toLowerCase().includes(searchLower) ||
          activityTypeLabels[activity.activityType].toLowerCase().includes(searchLower) ||
          (activity.activityDetail && activity.activityDetail.toLowerCase().includes(searchLower));
        return matchesSearch;
      })
      .slice(0, 50);
    
    return grouped;
  }, [data, debouncedSearch]);

  const formatDate = (dateString: string, short: boolean = false) => {
    const date = new Date(dateString);
    if (short) {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'now';
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading || activeUsersLoading) {
    return (
      <Container fluid py="xl">
        <Stack gap="md">
          <Skeleton height={50} width={300} />
          <Skeleton height={200} />
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} height={100} />
            ))}
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 5 }} spacing="md">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} height={600} />
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    );
  }

  if (error || activeUsersError) {
    return (
      <Container fluid py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error loading data"
          color="red"
        >
          {error || activeUsersError}
        </Alert>
      </Container>
    );
  }

  if (!data || !activeUsersData) {
    return null;
  }

  const pct24h = Math.round((activeUsersData.active24h / activeUsersData.totalUsers) * 100);
  const pct7d = Math.round((activeUsersData.active7d / activeUsersData.totalUsers) * 100);
  const pct30d = Math.round((activeUsersData.active30d / activeUsersData.totalUsers) * 100);
  const pct90d = Math.round((activeUsersData.active90d / activeUsersData.totalUsers) * 100);

  return (
    <Container fluid py="xl">
      <Title order={1} mb="xl">User Analytics Dashboard</Title>

      {/* Activity Breakdown */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Text fw={600} size="lg" mb="md">
          Activity Breakdown
        </Text>
        <Stack gap="lg">
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm">24 Hours</Text>
              <Text size="sm" c="dimmed">{activeUsersData.active24h.toLocaleString()} / {activeUsersData.totalUsers.toLocaleString()} ({pct24h}%)</Text>
            </Group>
            <Progress value={pct24h} size="lg" color="green" />
          </div>
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm">7 Days</Text>
              <Text size="sm" c="dimmed">{activeUsersData.active7d.toLocaleString()} / {activeUsersData.totalUsers.toLocaleString()} ({pct7d}%)</Text>
            </Group>
            <Progress value={pct7d} size="lg" color="teal" />
          </div>
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm">30 Days</Text>
              <Text size="sm" c="dimmed">{activeUsersData.active30d.toLocaleString()} / {activeUsersData.totalUsers.toLocaleString()} ({pct30d}%)</Text>
            </Group>
            <Progress value={pct30d} size="lg" color="blue" />
          </div>
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm">90 Days</Text>
              <Text size="sm" c="dimmed">{activeUsersData.active90d.toLocaleString()} / {activeUsersData.totalUsers.toLocaleString()} ({pct90d}%)</Text>
            </Group>
            <Progress value={pct90d} size="lg" color="violet" />
          </div>
        </Stack>
        <Text size="xs" c="dimmed" mt="md">
          Based on last_active_at timestamp. Total registered users: {activeUsersData.totalUsers.toLocaleString()}
        </Text>
      </Paper>

      {/* Activity Feed - TweetDeck Style */}
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap">
          <Title order={2}>Activity Feed</Title>
          <TextInput
            placeholder="Search activities..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, maxWidth: 400 }}
          />
        </Group>

        {/* Multi-column layout */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 5 }} spacing="xs">
          {/* Charts & Dashboards combined column */}
          <Paper
            key="charts_dashboards"
            shadow="sm"
            p="xs"
            radius="md"
            withBorder
            style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}
          >
            <Stack gap={4} style={{ flex: 1 }}>
              <Group justify="space-between" gap="xs" mb={4}>
                <Badge color="teal" variant="light" size="sm">
                  Charts & Dashboards
                </Badge>
                <Text size="xs" c="dimmed" fw={500}>
                  {activitiesByType['charts_dashboards']?.length || 0}
                </Text>
              </Group>
              
              <ScrollArea style={{ flex: 1 }} offsetScrollbars>
                <Stack gap={4}>
                  {(activitiesByType['charts_dashboards'] || []).length === 0 ? (
                    <Text size="xs" c="dimmed" py="sm" ta="center">
                      {search ? 'No matches' : 'None'}
                    </Text>
                  ) : (
                    (activitiesByType['charts_dashboards'] || []).map((activity, index) => (
                      <Paper
                        key={`${activity.userId}-${activity.activityType}-${activity.activityDate}-${index}`}
                        p={6}
                        withBorder
                      >
                        <Stack gap={2}>
                          <Group justify="space-between" gap={4} wrap="nowrap">
                            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                              <UserHoverCard userId={activity.userId} userName={activity.username} />
                            </div>
                            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                              {formatDate(activity.activityDate, true)}
                            </Text>
                          </Group>
                          <Group gap={4} wrap="nowrap">
                            <Badge 
                              color={activityTypeColors[activity.activityType]} 
                              variant="light" 
                              size="xs"
                              style={{ flexShrink: 0 }}
                            >
                              {activityTypeLabels[activity.activityType]}
                            </Badge>
                          </Group>
                          {activity.activityDetail && (
                            <Text size="xs" fw={500} lineClamp={2} style={{ marginTop: 2 }}>
                              {activity.activityDetail}
                            </Text>
                          )}
                        </Stack>
                      </Paper>
                    ))
                  )}
                </Stack>
              </ScrollArea>
            </Stack>
          </Paper>

          {/* Other activity type columns */}
          {ALL_ACTIVITY_TYPES.filter(type => !CHARTS_DASHBOARDS_TYPES.includes(type)).map((type) => {
            const activities = activitiesByType[type] || [];
            return (
              <Paper
                key={type}
                shadow="sm"
                p="xs"
                radius="md"
                withBorder
                style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}
              >
                <Stack gap={4} style={{ flex: 1 }}>
                  <Group justify="space-between" gap="xs" mb={4}>
                    <Badge color={activityTypeColors[type]} variant="light" size="sm">
                      {activityTypeLabels[type]}
                    </Badge>
                    <Text size="xs" c="dimmed" fw={500}>
                      {activities.length}
                    </Text>
                  </Group>
                  
                  <ScrollArea style={{ flex: 1 }} offsetScrollbars>
                    <Stack gap={4}>
                      {activities.length === 0 ? (
                        <Text size="xs" c="dimmed" py="sm" ta="center">
                          {search ? 'No matches' : 'None'}
                        </Text>
                      ) : (
                        activities.map((activity, index) => (
                          <Paper
                            key={`${activity.userId}-${activity.activityType}-${activity.activityDate}-${index}`}
                            p={6}
                            withBorder
                          >
                            <Stack gap={2}>
                              <Group justify="space-between" gap={4} wrap="nowrap">
                                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                  <UserHoverCard userId={activity.userId} userName={activity.username} />
                                </div>
                                <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                                  {formatDate(activity.activityDate, true)}
                                </Text>
                              </Group>
                              {activity.activityDetail && (
                                <Text size="xs" fw={500} lineClamp={2} style={{ marginTop: 2 }}>
                                  {activity.activityDetail}
                                </Text>
                              )}
                            </Stack>
                          </Paper>
                        ))
                      )}
                    </Stack>
                  </ScrollArea>
                </Stack>
              </Paper>
            );
          })}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
