'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AppShell, NavLink, Title, Group, Switch, Stack, Divider, Text, Container, Center, SegmentedControl, Burger, Select, ScrollArea } from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconDashboard, IconUserPlus, IconWorld, IconChartBar, IconBuilding, IconUserSearch, IconBulb, IconBell, IconCurrencyDollar, IconAlertTriangle, IconListSearch, IconPackage, IconReceipt, IconChartLine } from '@tabler/icons-react';
import Link from 'next/link';
import { SignedIn, SignedOut, SignIn, UserButton } from '@clerk/nextjs';
import { useFilter } from '@/contexts/FilterContext';
import { DEFAULT_TIMEZONE, VALID_TIMEZONES, ValidTimezone } from '@/lib/timezones';
import { SpotlightSearch } from './SpotlightSearch';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { filterInternal, setFilterInternal, filterFree, setFilterFree, timezone, setTimezone } = useFilter();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [opened, { toggle, close }] = useDisclosure();
  const [spotlightOpened, { open: openSpotlight, close: closeSpotlight }] = useDisclosure(false);

  const navLinkStyles = { root: { paddingTop: 4, paddingBottom: 4 } };

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
          padding="md"
        >
          <AppShell.Header hiddenFrom="sm">
            <Group h="100%" px="md" justify="space-between">
              <Burger opened={opened} onClick={toggle} size="sm" />
              <Title order={4}>Analytics</Title>
              <UserButton />
            </Group>
          </AppShell.Header>
          <AppShell.Navbar p="xs">
            <Stack style={{ height: '100%' }} gap="xs">
              <Group mb="xs" justify="space-between" visibleFrom="sm">
                <Title order={4}>Analytics</Title>
                <UserButton />
              </Group>
              
              <ScrollArea style={{ flex: 1 }}>
                <Stack gap={2}>
                  <Text size="xs" fw={600} tt="uppercase" c="dimmed" mt="xs" mb={2}>
                    Overview
                  </Text>
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
                  
                  <Text size="xs" fw={600} tt="uppercase" c="dimmed" mt="xs" mb={2}>
                    Account Management
                  </Text>
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
                    href="/subscriptions"
                    label="Subscriptions"
                    leftSection={<IconReceipt size={16} />}
                    active={pathname?.startsWith('/subscriptions')}
                    onClick={close}
                    styles={navLinkStyles}
                  />
                  
                  <Text size="xs" fw={600} tt="uppercase" c="dimmed" mt="xs" mb={2}>
                    Product Features
                  </Text>
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
                  
                  <Text size="xs" fw={600} tt="uppercase" c="dimmed" mt="xs" mb={2}>
                    Go-to-market
                  </Text>
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
                    href="/pricing-page"
                    label="Pricing Page"
                    leftSection={<IconCurrencyDollar size={16} />}
                    active={pathname === '/pricing-page'}
                    onClick={close}
                    styles={navLinkStyles}
                  />
                  <NavLink
                    component={Link}
                    href="/plans"
                    label="Plans"
                    leftSection={<IconPackage size={16} />}
                    active={pathname?.startsWith('/plans')}
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

                  <Text size="xs" fw={600} tt="uppercase" c="dimmed" mt="xs" mb={2}>
                    PostHog
                  </Text>
                  <NavLink
                    component={Link}
                    href="/posthog-event-explorer"
                    label="Event Explorer"
                    leftSection={<IconListSearch size={16} />}
                    active={pathname?.startsWith('/posthog-event-explorer')}
                    onClick={close}
                    styles={navLinkStyles}
                  />
                </Stack>
              </ScrollArea>
              
              <Divider mt="xs" />
              <Stack gap={4} mt="xs">
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
            </Stack>
          </AppShell.Navbar>

          <AppShell.Main>
            {children}
          </AppShell.Main>
        </AppShell>
        <SpotlightSearch opened={spotlightOpened} onClose={closeSpotlight} />
      </SignedIn>
    </>
  );
}
