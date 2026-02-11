'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AppShell, NavLink, Title, Group, Switch, Stack, Divider, Text, Container, Center, SegmentedControl, Burger, Select, ScrollArea, HoverCard, Box, Badge } from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { IconDashboard, IconUserPlus, IconWorld, IconChartBar, IconBuilding, IconUserSearch, IconBulb, IconBell, IconCurrencyDollar, IconAlertTriangle, IconListSearch, IconReceipt, IconChartLine, IconDatabase, IconApps, IconTrendingUp } from '@tabler/icons-react';
import Link from 'next/link';
import { SignedIn, SignedOut, SignIn, UserButton } from '@clerk/nextjs';
import { useFilter } from '@/contexts/FilterContext';
import { DEFAULT_TIMEZONE, VALID_TIMEZONES, ValidTimezone } from '@/lib/timezones';
import { useActiveQueriesStore } from '@/stores/activeQueriesStore';
import { SpotlightSearch } from './SpotlightSearch';

function formatQueryDisplayUrl(url: string): string {
  try {
    const path = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
    return path || url;
  } catch {
    return url.split('?')[0] || url;
  }
}

function ActiveQueriesWidget() {
  const activeQueries = useActiveQueriesStore((s) => s.activeQueries);
  const dbQueries = activeQueries.filter((q) => q.source === 'db');
  const posthogQueries = activeQueries.filter((q) => q.source === 'posthog');
  const dbCount = dbQueries.length;
  const posthogCount = posthogQueries.length;
  const count = activeQueries.length;

  return (
    <HoverCard width={320} position="top" withArrow shadow="md" openDelay={200} closeDelay={150}>
      <HoverCard.Target>
        <Box
          p="sm"
          px="md"
          style={{
            borderRadius: 9999,
            border: '1px solid var(--mantine-color-default-border)',
            backgroundColor: 'var(--mantine-color-default)',
            cursor: 'pointer',
            minHeight: 36,
            display: 'flex',
            alignItems: 'center',
            boxShadow: 'var(--mantine-shadow-sm)',
          }}
        >
          <Text size="sm" component="span" c="dimmed">
            Queries:{' '}
            <Text span inherit c={dbCount > 0 ? 'teal' : 'dimmed'}>
              {dbCount} DB
            </Text>
            <Text span inherit c="dimmed">
              ,{' '}
            </Text>
            <Text span inherit c={posthogCount > 0 ? 'violet' : 'dimmed'}>
              {posthogCount} PostHog
            </Text>
          </Text>
        </Box>
      </HoverCard.Target>
        <HoverCard.Dropdown>
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" fw={600}>
                Active requests
              </Text>
              <Badge size="sm" variant="light" color="gray">
                {count} total
              </Badge>
            </Group>
            {count === 0 ? (
              <Text size="xs" c="dimmed" py="xs">
                No requests in flight
              </Text>
            ) : (
              <ScrollArea.Autosize mah={240} type="scroll" scrollbarSize={6}>
                <Stack gap="md">
                  {dbQueries.length > 0 && (
                    <Stack gap={4}>
                      <Group gap={6}>
                        <Badge size="xs" variant="dot" color="teal">
                          DB
                        </Badge>
                        <Text size="xs" c="dimmed">
                          {dbQueries.length} {dbQueries.length === 1 ? 'query' : 'queries'}
                        </Text>
                      </Group>
                      {dbQueries.map((q) => (
                        <Text
                          key={q.id}
                          size="xs"
                          component="div"
                          style={{ wordBreak: 'break-all' }}
                          c="dimmed"
                        >
                          {formatQueryDisplayUrl(q.url)}
                        </Text>
                      ))}
                    </Stack>
                  )}
                  {posthogQueries.length > 0 && (
                    <Stack gap={4}>
                      <Group gap={6}>
                        <Badge size="xs" variant="dot" color="violet">
                          PostHog
                        </Badge>
                        <Text size="xs" c="dimmed">
                          {posthogQueries.length} {posthogQueries.length === 1 ? 'query' : 'queries'}
                        </Text>
                      </Group>
                      {posthogQueries.map((q) => (
                        <Text
                          key={q.id}
                          size="xs"
                          component="div"
                          style={{ wordBreak: 'break-all' }}
                          c="dimmed"
                        >
                          {formatQueryDisplayUrl(q.url)}
                        </Text>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </ScrollArea.Autosize>
            )}
          </Stack>
        </HoverCard.Dropdown>
    </HoverCard>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { filterInternal, setFilterInternal, filterFree, setFilterFree, timezone, setTimezone } = useFilter();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [opened, { toggle, close }] = useDisclosure();
  const [spotlightOpened, { open: openSpotlight, close: closeSpotlight }] = useDisclosure(false);
  const hasActiveQueries = useActiveQueriesStore((s) => s.activeQueries.length > 0);

  const [productsOpen, setProductsOpen] = useLocalStorage({
    key: 'nav:products',
    defaultValue: true,
  });
  const [goToMarketOpen, setGoToMarketOpen] = useLocalStorage({
    key: 'nav:go-to-market',
    defaultValue: true,
  });

  const navLinkStyles = { root: { paddingTop: 2, paddingBottom: 2 } };

  // Keyboard shortcut: Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSpotlight();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSpotlight]);

  return (
    <>
      <SignedOut>
        <Container size="sm" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Center style={{ width: '100%' }}>
            <SignIn 
              appearance={{
                elements: {
                  footer: { display: 'none' },
                },
              }}
            />
          </Center>
        </Container>
      </SignedOut>
      <SignedIn>
        <AppShell
          header={{ height: { base: 60, sm: 0 } }}
          navbar={{ 
            width: 250, 
            breakpoint: 'sm',
            collapsed: { mobile: !opened }
          }}
          padding={{ base: 'xs', sm: 'md' }}
        >
          <AppShell.Header hiddenFrom="sm">
            <Group h="100%" px="md" justify="space-between">
              <Burger opened={opened} onClick={toggle} size="sm" />
              <Title order={4}>Grid Status</Title>
              <UserButton />
            </Group>
          </AppShell.Header>
          <AppShell.Navbar p="xs" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Group mb="xs" justify="space-between" visibleFrom="sm" style={{ flexShrink: 0 }}>
              <Title order={4}>Grid Status</Title>
              <UserButton />
            </Group>
            <ScrollArea style={{ flex: 1, minHeight: 0 }} type="scroll" scrollbarSize={6} styles={{ viewport: { overflowX: 'visible' } }}>
              <Box mx="-xs" px="xs">
              <Stack gap={4} pb="xs">
                <Stack gap={0}>
                  <NavLink
                    component={Link}
                    href="/"
                    label="Home"
                    leftSection={<IconDashboard size={16} />}
                    active={pathname === '/'}
                    onClick={close}
                    styles={navLinkStyles}
                  />
                  <NavLink
                    component={Link}
                    href="/todays-pulse"
                    label="Today's Pulse"
                    leftSection={<IconChartLine size={16} />}
                    active={pathname === '/todays-pulse'}
                    onClick={close}
                    styles={navLinkStyles}
                  />
                  <NavLink
                    component={Link}
                    href="/users"
                    label="User Registrations"
                    leftSection={<IconUserPlus size={16} />}
                    active={pathname === '/users'}
                    onClick={close}
                    styles={navLinkStyles}
                  />
                  
                  <Divider my="sm" mx="-xs" />
                  <NavLink
                    component={Link}
                    href="/users-list"
                    label="Users"
                    leftSection={<IconUserSearch size={16} />}
                    active={pathname?.startsWith('/users-list')}
                    onClick={close}
                    styles={navLinkStyles}
                  />
                  <NavLink
                    component={Link}
                    href="/organizations"
                    label="Organizations"
                    leftSection={<IconBuilding size={16} />}
                    active={pathname?.startsWith('/organizations')}
                    onClick={close}
                    styles={navLinkStyles}
                  />
                  <NavLink
                    component={Link}
                    href="/domains"
                    label="Domains"
                    leftSection={<IconWorld size={16} />}
                    active={pathname?.startsWith('/domains')}
                    onClick={close}
                    styles={navLinkStyles}
                  />
                  <NavLink
                    component={Link}
                    href="/subscriptions"
                    label="Subscriptions"
                    leftSection={<IconReceipt size={16} />}
                    active={pathname?.startsWith('/subscriptions')}
                    onClick={close}
                    styles={navLinkStyles}
                  />
                  <Divider my="sm" mx="-xs" />
                  <NavLink
                    label="Products"
                    leftSection={<IconApps size={16} />}
                    opened={productsOpen}
                    onChange={() => setProductsOpen((prev) => !prev)}
                    styles={navLinkStyles}
                  >
                    <NavLink
                      component={Link}
                      href="/insights"
                      label="Insights"
                      leftSection={<IconBulb size={16} />}
                      active={pathname?.startsWith('/insights')}
                      onClick={close}
                      styles={navLinkStyles}
                    />
                    <NavLink
                      component={Link}
                      href="/charts-dashboards"
                      label="Charts & Dashboards"
                      leftSection={<IconChartBar size={16} />}
                      active={pathname === '/charts-dashboards'}
                      onClick={close}
                      styles={navLinkStyles}
                    />
                    <NavLink
                      component={Link}
                      href="/alerts"
                      label="Alerts"
                      leftSection={<IconBell size={16} />}
                      active={pathname === '/alerts'}
                      onClick={close}
                      styles={navLinkStyles}
                    />
                  </NavLink>
                  <NavLink
                    component={Link}
                    href="/posthog-event-explorer"
                    label="Event Explorer"
                    leftSection={<IconListSearch size={16} />}
                    active={pathname?.startsWith('/posthog-event-explorer')}
                    onClick={close}
                    styles={navLinkStyles}
                  />
                  <NavLink
                    component={Link}
                    href="/datasets"
                    label="Datasets"
                    leftSection={<IconDatabase size={16} />}
                    active={pathname?.startsWith('/datasets')}
                    onClick={close}
                    styles={navLinkStyles}
                  />
                  
                  <NavLink
                    label="Go-to-market"
                    leftSection={<IconTrendingUp size={16} />}
                    opened={goToMarketOpen}
                    onChange={() => setGoToMarketOpen((prev) => !prev)}
                    styles={navLinkStyles}
                  >
                    <NavLink
                      component={Link}
                      href="/pricing-page"
                      label="Pricing Page"
                      leftSection={<IconCurrencyDollar size={16} />}
                      active={pathname === '/pricing-page'}
                      onClick={close}
                      styles={navLinkStyles}
                    />
                    <NavLink
                      component={Link}
                      href="/rate-limit-abusers"
                      label="Rate Limit Activity"
                      leftSection={<IconAlertTriangle size={16} />}
                      active={pathname === '/rate-limit-abusers'}
                      onClick={close}
                      styles={navLinkStyles}
                    />
                  </NavLink>
                </Stack>
              </Stack>
              </Box>
            </ScrollArea>
            <Divider />
            <Stack gap={4} pt="xs" pb="xs" style={{ flexShrink: 0 }}>
              <Text size="sm" fw={500}>Settings</Text>
              <Switch
                label="Filter Internal"
                checked={filterInternal}
                onChange={(e) => setFilterInternal(e.currentTarget.checked)}
              />
              <Switch
                label="Filter Free"
                checked={filterFree}
                onChange={(e) => setFilterFree(e.currentTarget.checked)}
              />
              <Select
                label="Timezone"
                size="xs"
                value={timezone}
                onChange={(value) => setTimezone((value as ValidTimezone) || DEFAULT_TIMEZONE)}
                data={VALID_TIMEZONES}
                allowDeselect={false}
              />
              <div>
                <Text size="xs" c="dimmed" mb={4}>Color Scheme</Text>
                <SegmentedControl
                  value={colorScheme}
                  onChange={(value) => setColorScheme(value as 'light' | 'dark' | 'auto')}
                  data={[
                    { label: 'Light', value: 'light' },
                    { label: 'Dark', value: 'dark' },
                    { label: 'Auto', value: 'auto' },
                  ]}
                  fullWidth
                />
              </div>
            </Stack>
          </AppShell.Navbar>

          <AppShell.Main style={{ minWidth: 0, overflow: 'auto' }}>
            <Box data-main-content style={{ minWidth: 0 }}>{children}</Box>
            {hasActiveQueries && (
              <Box
                style={{
                  position: 'fixed',
                  bottom: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 100,
                }}
              >
                <ActiveQueriesWidget />
              </Box>
            )}
          </AppShell.Main>
        </AppShell>
        <SpotlightSearch opened={spotlightOpened} onClose={closeSpotlight} />
      </SignedIn>
    </>
  );
}
