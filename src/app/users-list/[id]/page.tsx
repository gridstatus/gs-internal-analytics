'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useApiData } from '@/hooks/useApiData';
import {
  Container,
  Title,
  Paper,
  Table,
  Text,
  Group,
  SimpleGrid,
  Loader,
  Alert,
  Stack,
  Anchor,
  Badge,
  SegmentedControl,
  ScrollArea,
  Button,
  Box,
} from '@mantine/core';
import { CompositeChart } from '@mantine/charts';
import { DateTime } from 'luxon';
import { IconAlertCircle, IconExternalLink } from '@tabler/icons-react';
import type { SubscriptionListRowItem } from '@/lib/api-types';
import { MetricCard } from '@/components/MetricCard';
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import { DEFAULT_CHART_LEGEND_PROPS } from '@/lib/chart-defaults';
import { useFilter } from '@/contexts/FilterContext';
import { useQueryState } from 'nuqs';
import Link from 'next/link';

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  lastActiveAt: string | null;
  isAdmin: boolean;
  clerkId: string | null;
}

interface Organization {
  id: string;
  name: string;
  role: string;
}

interface ApiKey {
  apiKey: string;
  firstUsed: string;
  lastUsed: string;
  requestCount: number;
}

interface InsightPost {
  postId: string;
  content: string;
  createdAt: string;
  authorId: number;
  authorUsername: string | null;
}

interface InsightReaction extends InsightPost {
  reactionType: string;
  reactionDate: string;
}

interface InsightSaved extends InsightPost {
  savedDate: string;
}

interface InsightView extends InsightPost {
  firstViewed: string;
  lastViewed: string;
  viewCount: number;
  viewSources: string;
}

interface Chart {
  id: number;
  name: string;
  createdAt: string;
}

interface Dashboard {
  id: number;
  name: string;
  createdAt: string;
}

interface Alert {
  id: number;
  createdAt: string;
}

interface AlertLog {
  id: string;
  alertId: string | null;
  type: string;
  value: string;
  timestamp: string | null;
  message: string | null;
}

interface UserDetails {
  user: User;
  organizations: Organization[];
  stats: {
    chartCount: number;
    dashboardCount: number;
    alertCount: number;
    apiRequests30d: number;
    apiRows30d: number;
    insightsEngagements: number;
  };
  charts: Chart[];
  dashboards: Dashboard[];
  alerts: Alert[];
  alertLogs: AlertLog[];
  apiKeys: ApiKey[];
  insights?: {
    reactions: InsightReaction[];
    saved: InsightSaved[];
    views: InsightView[];
  };
  subscriptions: SubscriptionListRowItem[];
}

interface ApiUsageData {
  period: string;
  requestCount: number;
  rowsReturned: number;
}

interface PostHogEvent {
  event: string;
  timestamp: string;
  properties: {
    currentUrl: string | null;
    pathname: string | null;
    referrer: string | null;
    deviceType: string | null;
    browser: string | null;
  };
}

interface PostHogEventCount {
  event: string;
  count: number;
}

interface PostHogData {
  email: string;
  days: number;
  eventCounts: PostHogEventCount[];
  events: PostHogEvent[];
  totalEvents: number;
}

interface PostHogSessionData {
  email: string;
  sessionCounts: {
    last1d: number;
    last7d: number;
    last30d: number;
    allTime: number;
  };
}

interface PostHogDaysActiveData {
  email: string;
  daysActive7d: number;
  daysActive30d: number;
  daysActive365d: number;
}

interface PostHogTopPagesData {
  pages: Array<{ pathname: string; views: number }>;
}

interface PostHogDailyActivityData {
  data: Array<{ day: string; sessions: number; pageViews: number }>;
}

interface ApiUsageResponse {
  data: ApiUsageData[];
}

export default function UserDetailPage() {
  const params = useParams();
  const id = params.id as string;
  // const [apiUsageDays, setApiUsageDays] = useState<number>(1);
  const [posthogDays, setPosthogDays] = useState<number | 'all'>(30);

  // Fetch main user data
  const userUrl = id ? `/api/users-list?id=${id}` : null;
  const { data, loading, error } = useApiData<UserDetails>(userUrl, [id]);

  // Fetch API usage data (commented out)
  // const apiUsageUrl = id ? `/api/users-list/${id}/api-usage?days=${apiUsageDays}` : null;
  // const { data: apiUsageResponse, loading: apiUsageLoading, error: apiUsageError } = useApiData<ApiUsageResponse>(apiUsageUrl, [id, apiUsageDays]);
  // const apiUsageData = apiUsageResponse?.data || [];

  // Fetch PostHog events data
  const posthogUrl = id ? `/api/users-list/${id}/posthog-events?days=${posthogDays === 'all' ? 'all' : posthogDays}` : null;
  const { data: posthogData, loading: posthogLoading, error: posthogError } = useApiData<PostHogData>(posthogUrl, [id, posthogDays]);

  // Fetch PostHog session counts
  const sessionsUrl = id ? `/api/users-list/${id}/posthog-sessions` : null;
  const { data: sessionsData, loading: sessionsLoading } = useApiData<PostHogSessionData>(sessionsUrl, [id]);

  // Fetch PostHog days active (7d, 30d, 365d)
  const daysActiveUrl = id ? `/api/users-list/${id}/posthog-days-active` : null;
  const { data: daysActiveData } = useApiData<PostHogDaysActiveData>(daysActiveUrl, [id]);

  // Fetch PostHog top pages (top 10)
  const topPagesUrl = id ? `/api/users-list/${id}/posthog-top-pages` : null;
  const { data: topPagesData, loading: topPagesLoading } = useApiData<PostHogTopPagesData>(topPagesUrl, [id]);

  const [activityPeriod, setActivityPeriod] = useQueryState('activity_period', { defaultValue: 'day' });
  const dailyActivityUrl = id
    ? `/api/users-list/${id}/posthog-daily-activity${activityPeriod !== 'day' ? `?period=${activityPeriod}` : ''}`
    : null;
  const { data: dailyActivityData, loading: dailyActivityLoading } = useApiData<PostHogDailyActivityData>(dailyActivityUrl, [dailyActivityUrl]);
  const { timezone } = useFilter();

  const daysSinceSignup = data?.user.createdAt
    ? Math.floor(
        (Date.now() - new Date(data.user.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  if (loading) {
    return (
      <Container fluid py="xl">
        <Stack align="center" py="xl">
          <Loader />
        </Stack>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container fluid py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error loading user"
          color="red"
        >
          {error || 'User data not available'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid py="xl">
      <PageBreadcrumbs
        items={[
          { label: 'Users', href: '/users-list' },
          { label: data.user.username },
        ]}
      />
      <Group justify="space-between" mb="xl">
        <Stack gap={4}>
          <Title order={1}>
            {data.user.username}
            {(data.user.firstName || data.user.lastName) && (
              <> · {[data.user.firstName, data.user.lastName].filter(Boolean).join(' ')}</>
            )}
          </Title>
          <Text size="sm" c="dimmed">
            Last active: {data.user.lastActiveAt
              ? new Date(data.user.lastActiveAt).toLocaleDateString()
              : 'Never'}
            {daysSinceSignup !== null && ` • ${daysSinceSignup.toLocaleString()} days since sign up`}
          </Text>
        </Stack>
        <Group gap="md">
          {data.user.clerkId && (
            <Button
              component="a"
              href={`https://dashboard.clerk.com/apps/app_2IMRywc1hPChiNOSh8b9KZqUW7Q/instances/ins_2L4cECyyYvS7ZKGFX6N3KnHeB1h/users/${data.user.clerkId}?user_back_page=users`}
              target="_blank"
              rel="noopener noreferrer"
              leftSection={<IconExternalLink size={16} />}
              variant="light"
            >
              Open in Clerk
            </Button>
          )}
          {data.user.isAdmin && (
            <Badge color="red" size="lg">Admin</Badge>
          )}
        </Group>
      </Group>

      {/* PostHog days active (last 7, 30, 365 days) */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
        <MetricCard
          title="Days active (7d)"
          value={daysActiveData?.daysActive7d ?? '—'}
        />
        <MetricCard
          title="Days active (30d)"
          value={daysActiveData?.daysActive30d ?? '—'}
        />
        <MetricCard
          title="Days active (365d)"
          value={daysActiveData?.daysActive365d ?? '—'}
        />
      </SimpleGrid>

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 6 }} spacing="md" mb="xl">
        <MetricCard
          title="Insights engagements"
          value={data.stats.insightsEngagements}
        />
        <MetricCard
          title="Charts"
          value={data.stats.chartCount}
        />
        <MetricCard
          title="Dashboards"
          value={data.stats.dashboardCount}
        />
        <MetricCard
          title="Alerts"
          value={data.stats.alertCount}
        />
        <MetricCard
          title="API Requests (30d)"
          value={data.stats.apiRequests30d}
        />
        <MetricCard
          title="API Rows (30d)"
          value={data.stats.apiRows30d.toLocaleString()}
        />
      </SimpleGrid>

      {/* Two-column layout: Sidebar (left) + Main content (right) */}
      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md" mb="xl">
        {/* Left Sidebar - User Info */}
        <Stack gap="md">
          {/* User Details */}
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Text fw={600} size="lg" mb="md">
              User Details
            </Text>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">ID</Text>
                <Text size="sm" fw={500}>{data.user.id}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Subscriptions</Text>
                {(data.subscriptions ?? []).length > 0 ? (
                  <Stack gap={2} align="flex-end">
                    {data.subscriptions.map((sub) => (
                      <Anchor key={sub.id} component={Link} href={`/subscriptions/${sub.id}`} size="sm">
                        #{sub.id} – {sub.planName ?? 'Unknown plan'} ({sub.status})
                      </Anchor>
                    ))}
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">None</Text>
                )}
              </Group>
              {data.user.username.includes('@') && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Domain</Text>
                  <Anchor
                    component={Link}
                    href={`/domains/${encodeURIComponent(data.user.username.split('@')[1])}`}
                    size="sm"
                  >
                    {data.user.username.split('@')[1]}
                  </Anchor>
                </Group>
              )}
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Created</Text>
                <Text size="sm">{new Date(data.user.createdAt).toLocaleDateString()}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Last Active</Text>
                <Text size="sm">
                  {data.user.lastActiveAt
                    ? new Date(data.user.lastActiveAt).toLocaleDateString()
                    : 'Never'}
                </Text>
              </Group>
            </Stack>
          </Paper>

          {/* Organizations */}
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Text fw={600} size="lg" mb="md">
              Organizations ({data.organizations.length})
            </Text>
            {data.organizations.length === 0 ? (
              <Text c="dimmed" size="sm">Not a member of any organizations</Text>
            ) : (
              <Stack gap="xs">
                {data.organizations.map((org) => (
                  <Group key={org.id} justify="space-between">
                    <Anchor component={Link} href={`/organizations/${org.id}`} size="sm">
                      {org.name}
                    </Anchor>
                    <Badge variant="light" size="sm">{org.role}</Badge>
                  </Group>
                ))}
              </Stack>
            )}
          </Paper>

          {/* PostHog Sessions */}
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Text fw={600} size="lg" mb="md">
              Sessions (PostHog)
            </Text>
            {sessionsLoading ? (
              <Stack align="center" py="md">
                <Loader size="sm" />
              </Stack>
            ) : sessionsData ? (
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Last 24h</Text>
                  <Text size="sm" fw={500}>{sessionsData.sessionCounts.last1d.toLocaleString()}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Last 7d</Text>
                  <Text size="sm" fw={500}>{sessionsData.sessionCounts.last7d.toLocaleString()}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Last 30d</Text>
                  <Text size="sm" fw={500}>{sessionsData.sessionCounts.last30d.toLocaleString()}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">All Time</Text>
                  <Text size="sm" fw={500}>{sessionsData.sessionCounts.allTime.toLocaleString()}</Text>
                </Group>
              </Stack>
            ) : (
              <Text c="dimmed" size="sm">Unable to load session data</Text>
            )}
          </Paper>

          {/* Top pages (PostHog) */}
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Text fw={600} size="lg" mb="md">
              Top pages
            </Text>
            {topPagesLoading ? (
              <Stack align="center" py="md">
                <Loader size="sm" />
              </Stack>
            ) : topPagesData?.pages && topPagesData.pages.length > 0 ? (
              <Stack gap="xs">
                {topPagesData.pages.map((p, i) => (
                  <Group key={i} justify="space-between" wrap="nowrap">
                    <Text size="sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }} title={p.pathname}>
                      {p.pathname}
                    </Text>
                    <Text size="sm" fw={500} style={{ flexShrink: 0 }}>
                      {p.views.toLocaleString()}
                    </Text>
                  </Group>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" size="sm">No page view data</Text>
            )}
          </Paper>

          {/* Charts */}
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Text fw={600} size="lg" mb="md">
              Charts ({data.charts.length})
            </Text>
            {data.charts.length === 0 ? (
              <Text c="dimmed" size="sm">User has not created any charts</Text>
            ) : (
              <ScrollArea style={{ maxHeight: '200px' }}>
                <Stack gap="xs">
                  {data.charts.map((chart) => (
                    <Group key={chart.id} justify="space-between">
                      <Text size="sm">{chart.name || `Chart ${chart.id}`}</Text>
                      <Text size="xs" c="dimmed">
                        {new Date(chart.createdAt).toLocaleDateString()}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </ScrollArea>
            )}
          </Paper>

          {/* Dashboards */}
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Text fw={600} size="lg" mb="md">
              Dashboards ({data.dashboards.length})
            </Text>
            {data.dashboards.length === 0 ? (
              <Text c="dimmed" size="sm">User has not created any dashboards</Text>
            ) : (
              <ScrollArea style={{ maxHeight: '200px' }}>
                <Stack gap="xs">
                  {data.dashboards.map((dashboard) => (
                    <Group key={dashboard.id} justify="space-between">
                      <Text size="sm">{dashboard.name || `Dashboard ${dashboard.id}`}</Text>
                      <Text size="xs" c="dimmed">
                        {new Date(dashboard.createdAt).toLocaleDateString()}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </ScrollArea>
            )}
          </Paper>

          {/* Alerts */}
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Text fw={600} size="lg" mb="md">
              Alerts ({data.alerts.length})
            </Text>
            {data.alerts.length === 0 ? (
              <Text c="dimmed" size="sm">User has not created any alerts</Text>
            ) : (
              <ScrollArea style={{ maxHeight: '200px' }}>
                <Stack gap="xs">
                  {data.alerts.map((alert) => (
                    <Group key={alert.id} justify="space-between">
                      <Text size="sm">Alert {alert.id}</Text>
                      <Text size="xs" c="dimmed">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </ScrollArea>
            )}
          </Paper>

          {/* Alert Logs */}
          <Paper shadow="sm" p="md" radius="md" withBorder style={{ maxHeight: '400px', display: 'flex', flexDirection: 'column' }}>
            <Text fw={600} size="lg" mb="md">
              Alert Logs ({data.alertLogs.length})
            </Text>
            {data.alertLogs.length === 0 ? (
              <Text c="dimmed" size="sm">No alert logs</Text>
            ) : (
              <ScrollArea style={{ flex: 1 }}>
                <Stack gap="xs">
                  {data.alertLogs.map((log) => (
                    <Stack key={log.id} gap={4} pb="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                      <Group justify="space-between" wrap="nowrap">
                        <Badge size="xs" variant="light" color={
                          log.type === 'email' ? 'blue' :
                          log.type === 'sms' ? 'green' :
                          log.type === 'error' ? 'red' : 'gray'
                        }>
                          {log.type}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          {log.timestamp ? formatTimeAgo(log.timestamp) : '—'}
                        </Text>
                      </Group>
                      <Text size="sm" lineClamp={2} title={log.value}>
                        {log.value}
                      </Text>
                      {log.message && (
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {log.message}
                        </Text>
                      )}
                    </Stack>
                  ))}
                </Stack>
              </ScrollArea>
            )}
          </Paper>

          {/* API Keys */}
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Text fw={600} size="lg" mb="md">
              API Keys ({data.apiKeys.length})
            </Text>
            {data.apiKeys.length === 0 ? (
              <Text c="dimmed" size="sm">No API keys created</Text>
            ) : (
              <ScrollArea style={{ maxHeight: '200px' }}>
                <Stack gap="xs">
                  {data.apiKeys.map((key, index) => (
                    <Stack key={index} gap={4}>
                      <Text ff="monospace" size="xs" style={{ wordBreak: 'break-all' }}>
                        {key.apiKey}
                      </Text>
                      <Group justify="space-between">
                        <Text size="xs" c="dimmed">
                          {new Date(key.lastUsed).toLocaleDateString()}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {key.requestCount.toLocaleString()} req
                        </Text>
                      </Group>
                    </Stack>
                  ))}
                </Stack>
              </ScrollArea>
            )}
          </Paper>
        </Stack>

        {/* Right Main Content - 2 columns */}
        <SimpleGrid cols={1} spacing="md" style={{ gridColumn: 'span 2' }}>
          {/* Sessions & page views */}
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Group justify="space-between" mb="md" wrap="wrap">
              <Text fw={600} size="lg">
                Sessions & page views
                {activityPeriod === 'day' && ' (last 30 days)'}
                {activityPeriod === 'week' && ' (last year)'}
                {activityPeriod === 'month' && ' (all time)'}
              </Text>
              <SegmentedControl
                value={activityPeriod}
                onChange={(v) => setActivityPeriod(v as 'day' | 'week' | 'month')}
                data={[
                  { label: 'Day', value: 'day' },
                  { label: 'Week', value: 'week' },
                  { label: 'Month', value: 'month' },
                ]}
              />
            </Group>
            {dailyActivityLoading ? (
              <Stack align="center" py="xl">
                <Loader />
              </Stack>
            ) : dailyActivityData?.data?.length ? (
              (() => {
                const chartData = dailyActivityData.data.map((row) => {
                  const dt = DateTime.fromISO(row.day, { zone: 'utc' }).setZone(timezone);
                  const label =
                    activityPeriod === 'month'
                      ? dt.toLocaleString({ month: 'short', year: 'numeric' })
                      : activityPeriod === 'week'
                        ? `Week of ${dt.toLocaleString({ month: 'short', day: 'numeric' })}`
                        : dt.toLocaleString({ month: 'short', day: 'numeric' });
                  return { ...row, label };
                });
                return (
                  <Stack gap="xl">
                    <Box>
                      <Text size="sm" fw={500} c="dimmed" mb="xs">Sessions</Text>
                      <CompositeChart
                        h={220}
                        data={chartData}
                        dataKey="label"
                        series={[{ name: 'sessions', type: 'line', color: 'blue.6', label: 'Sessions' }]}
                        curveType="linear"
                        yAxisProps={{ domain: [0, 'auto'], tickFormatter: (v: number) => v.toLocaleString() }}
                      />
                    </Box>
                    <Box>
                      <Text size="sm" fw={500} c="dimmed" mb="xs">Page views</Text>
                      <CompositeChart
                        h={220}
                        data={chartData}
                        dataKey="label"
                        series={[{ name: 'pageViews', type: 'line', color: 'teal.6', label: 'Page views' }]}
                        curveType="linear"
                        yAxisProps={{ domain: [0, 'auto'], tickFormatter: (v: number) => v.toLocaleString() }}
                      />
                    </Box>
                  </Stack>
                );
              })()
            ) : (
              <Text c="dimmed" size="sm">No activity data</Text>
            )}
          </Paper>

          {/* PostHog Events */}
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600} size="lg">
                PostHog Events {posthogData && `(${posthogData.totalEvents.toLocaleString()} total)`}
              </Text>
              <SegmentedControl
                value={posthogDays === 'all' ? 'all' : posthogDays.toString()}
                onChange={(value) => setPosthogDays(value === 'all' ? 'all' : parseInt(value, 10))}
                data={[
                  { label: '7 Days', value: '7' },
                  { label: '30 Days', value: '30' },
                  { label: '90 Days', value: '90' },
                  { label: 'All Time', value: 'all' },
                ]}
              />
            </Group>
            
            {posthogError ? (
              <Alert color="red" title="Error">
                {posthogError}
              </Alert>
            ) : posthogLoading ? (
              <Stack align="center" py="xl">
                <Loader />
              </Stack>
            ) : !posthogData || posthogData.totalEvents === 0 ? (
              <Text c="dimmed">No PostHog events found for this user</Text>
            ) : (
              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
                {/* Event Counts */}
                <Stack gap="xs">
                  <Text fw={600}>Events by Type</Text>
                  <ScrollArea h={400}>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Event</Table.Th>
                          <Table.Th style={{ textAlign: 'right' }}>Count</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {posthogData.eventCounts.map((ec) => (
                          <Table.Tr key={ec.event}>
                            <Table.Td>
                              <Text size="sm" ff="monospace">
                                {ec.event}
                              </Text>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right' }}>
                              <Text size="sm">{ec.count.toLocaleString()}</Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                </Stack>

                {/* Recent Events */}
                <Stack gap="xs">
                  <Text fw={600}>Recent Activity (last 100)</Text>
                  <ScrollArea h={400}>
                    <Stack gap={4}>
                      {posthogData.events.map((event, idx) => (
                        <Group
                          key={idx}
                          gap="xs"
                          wrap="nowrap"
                          py={6}
                          style={{
                            borderBottom: '1px solid var(--mantine-color-default-border)',
                          }}
                        >
                          <Badge
                            size="xs"
                            variant="light"
                            color={
                              event.event === '$pageview' ? 'blue' :
                              event.event === '$autocapture' ? 'gray' :
                              event.event.startsWith('$') ? 'gray' : 'violet'
                            }
                            style={{ flexShrink: 0 }}
                          >
                            {event.event.replace('$', '')}
                          </Badge>
                          <Text
                            size="sm"
                            ff="monospace"
                            style={{
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={event.properties.currentUrl || event.properties.pathname || event.event}
                          >
                            {event.properties.pathname || event.event}
                          </Text>
                          <Text size="xs" c="dimmed" style={{ flexShrink: 0, minWidth: 50, textAlign: 'right' }}>
                            {formatTimeAgo(event.timestamp)}
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  </ScrollArea>
                </Stack>
              </SimpleGrid>
            )}
          </Paper>

          {/* API Usage - commented out
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600} size="lg">
                API Usage
              </Text>
              <SegmentedControl
                value={apiUsageDays.toString()}
                onChange={(value) => setApiUsageDays(parseInt(value, 10))}
                data={[
                  { label: '1 Day', value: '1' },
                  { label: '7 Days', value: '7' },
                  { label: '30 Days', value: '30' },
                  { label: '90 Days', value: '90' },
                ]}
              />
            </Group>
            
            {apiUsageError ? (
              <Alert color="red" title="Error">
                {apiUsageError}
              </Alert>
            ) : apiUsageLoading ? (
              <Loader />
            ) : apiUsageData.length === 0 ? (
              <Text c="dimmed">No API usage data for the selected period</Text>
            ) : (
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <TimeSeriesChart
                  title="API Requests"
                  subtitle={`Requests over last ${apiUsageDays} day${apiUsageDays > 1 ? 's' : ''}`}
                  data={apiUsageData.map(d => ({
                    month: d.period,
                    requests: d.requestCount,
                  }))}
                  dataKey="requests"
                  color="blue.6"
                  chartType="bar"
                />
                <TimeSeriesChart
                  title="Rows Returned"
                  subtitle={`Total rows returned over last ${apiUsageDays} day${apiUsageDays > 1 ? 's' : ''}`}
                  data={apiUsageData.map(d => ({
                    month: d.period,
                    rows: d.rowsReturned,
                  }))}
                  dataKey="rows"
                  color="green.6"
                  chartType="bar"
                />
              </SimpleGrid>
            )}
          </Stack>
          */}
        </SimpleGrid>
      </SimpleGrid>

      {/* Insights Activity - Full width */}
      {data.insights && (
        <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
          <Text fw={600} size="lg" mb="md">
            Insights Activity
          </Text>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            {/* Likes */}
            <Paper withBorder p="sm" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
              <Text fw={600} mb="sm">
                Likes ({data.insights.reactions.filter(r => r.reactionType === 'LIKE').length})
              </Text>
              <ScrollArea style={{ flex: 1 }}>
                <Stack gap="xs">
                  {data.insights.reactions
                    .filter(r => r.reactionType === 'LIKE')
                    .map((reaction) => (
                      <Anchor
                        key={reaction.postId}
                        component={Link}
                        href={`/insights/${reaction.postId}`}
                        style={{ textDecoration: 'none' }}
                      >
                        <Paper p="xs" withBorder style={{ cursor: 'pointer' }}>
                          <Text size="sm" lineClamp={3} mb={4}>
                            {reaction.content}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {formatTimeAgo(reaction.reactionDate)}
                          </Text>
                        </Paper>
                      </Anchor>
                    ))}
                  {data.insights.reactions.filter(r => r.reactionType === 'LIKE').length === 0 && (
                    <Text c="dimmed" size="sm">No likes</Text>
                  )}
                </Stack>
              </ScrollArea>
            </Paper>

            {/* Saved */}
            <Paper withBorder p="sm" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
              <Text fw={600} mb="sm">
                Saved ({data.insights.saved.length})
              </Text>
              <ScrollArea style={{ flex: 1 }}>
                <Stack gap="xs">
                  {data.insights.saved.map((saved) => (
                    <Anchor
                      key={saved.postId}
                      component={Link}
                      href={`/insights/${saved.postId}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <Paper p="xs" withBorder style={{ cursor: 'pointer' }}>
                        <Text size="sm" lineClamp={3} mb={4}>
                          {saved.content}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {formatTimeAgo(saved.savedDate)}
                        </Text>
                      </Paper>
                    </Anchor>
                  ))}
                  {data.insights.saved.length === 0 && (
                    <Text c="dimmed" size="sm">No saved posts</Text>
                  )}
                </Stack>
              </ScrollArea>
            </Paper>

            {/* Engagements (Views) */}
            <Paper withBorder p="sm" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
              <Text fw={600} mb="sm">
                Engagements ({data.insights.views.length})
              </Text>
              <ScrollArea style={{ flex: 1 }}>
                <Stack gap="xs">
                  {data.insights.views.map((view) => {
                    const engagementTypes = view.viewSources.split(', ').map(s => {
                      if (s === 'feed_expanded') return 'Expanded';
                      if (s === 'detail') return 'Detail';
                      return s;
                    });
                    return (
                      <Anchor
                        key={view.postId}
                        component={Link}
                        href={`/insights/${view.postId}`}
                        style={{ textDecoration: 'none' }}
                      >
                        <Paper p="xs" withBorder style={{ cursor: 'pointer' }}>
                          <Text size="sm" lineClamp={3} mb={4}>
                            {view.content}
                          </Text>
                          <Group gap="xs" mb={4}>
                            {engagementTypes.map((type, idx) => (
                              <Badge key={idx} size="xs" variant="light" color="blue">
                                {type}
                              </Badge>
                            ))}
                          </Group>
                          <Text size="xs" c="dimmed">
                            {formatTimeAgo(view.lastViewed)}
                          </Text>
                        </Paper>
                      </Anchor>
                    );
                  })}
                  {data.insights.views.length === 0 && (
                    <Text c="dimmed" size="sm">No engagements</Text>
                  )}
                </Stack>
              </ScrollArea>
            </Paper>
          </SimpleGrid>
        </Paper>
      )}
    </Container>
  );
}

