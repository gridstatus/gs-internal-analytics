'use client';

import { usePathname } from 'next/navigation';
import { AppShell, NavLink, Title, Group, Switch, Stack, Divider, Text, Container, Center, SegmentedControl, Burger } from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconDashboard, IconUserPlus, IconWorld, IconChartBar, IconBuilding, IconUserSearch, IconBulb, IconBell } from '@tabler/icons-react';
import Link from 'next/link';
import { SignedIn, SignedOut, SignIn, UserButton } from '@clerk/nextjs';
import { useFilter } from '@/contexts/FilterContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { filterGridstatus, setFilterGridstatus } = useFilter();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [opened, { toggle, close }] = useDisclosure();

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
          <AppShell.Navbar p="md">
            <Stack style={{ height: '100%' }}>
              <Group mb="md" justify="space-between">
                <Title order={4}>Analytics</Title>
                <UserButton />
              </Group>
              
              <Text size="xs" fw={600} tt="uppercase" c="dimmed" mt="xs" mb="xs">
                Overview
              </Text>
              <NavLink
                component={Link}
                href="/"
                label="Home"
                leftSection={<IconDashboard size={16} />}
                active={pathname === '/'}
                onClick={close}
              />
              <NavLink
                component={Link}
                href="/users"
                label="User Registrations"
                leftSection={<IconUserPlus size={16} />}
                active={pathname === '/users'}
                onClick={close}
              />
              
              <Text size="xs" fw={600} tt="uppercase" c="dimmed" mt="md" mb="xs">
                Users and Orgs
              </Text>
              <NavLink
                component={Link}
                href="/users-list"
                label="Users"
                leftSection={<IconUserSearch size={16} />}
                active={pathname?.startsWith('/users-list')}
                onClick={close}
              />
              <NavLink
                component={Link}
                href="/domains"
                label="Domains"
                leftSection={<IconWorld size={16} />}
                active={pathname?.startsWith('/domains')}
                onClick={close}
              />
              <NavLink
                component={Link}
                href="/organizations"
                label="Organizations"
                leftSection={<IconBuilding size={16} />}
                active={pathname?.startsWith('/organizations')}
                onClick={close}
              />
              
              <Text size="xs" fw={600} tt="uppercase" c="dimmed" mt="md" mb="xs">
                Product Features
              </Text>
              <NavLink
                component={Link}
                href="/insights"
                label="Insights"
                leftSection={<IconBulb size={16} />}
                active={pathname?.startsWith('/insights')}
                onClick={close}
              />
              <NavLink
                component={Link}
                href="/charts-dashboards"
                label="Charts & Dashboards"
                leftSection={<IconChartBar size={16} />}
                active={pathname === '/charts-dashboards'}
                onClick={close}
              />
              <NavLink
                component={Link}
                href="/alerts"
                label="Alerts"
                leftSection={<IconBell size={16} />}
                active={pathname === '/alerts'}
                onClick={close}
              />
              
              <div style={{ flex: 1 }} />
              <Divider />
              <Stack gap="xs" mt="md">
                <Text size="sm" fw={500}>Settings</Text>
                <Switch
                  label="Filter Internal"
                  checked={filterGridstatus}
                  onChange={(e) => setFilterGridstatus(e.currentTarget.checked)}
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
      </SignedIn>
    </>
  );
}
