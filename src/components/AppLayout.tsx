'use client';

import { usePathname } from 'next/navigation';
import { AppShell, NavLink, Title, Group, Switch, Stack, Divider, Text, Container, Center } from '@mantine/core';
import { IconDashboard, IconApi, IconUserPlus, IconActivity, IconChartBar, IconBuilding, IconUserSearch, IconBulb, IconBell } from '@tabler/icons-react';
import Link from 'next/link';
import { SignedIn, SignedOut, SignIn, UserButton } from '@clerk/nextjs';
import { useFilter } from '@/contexts/FilterContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { filterGridstatus, setFilterGridstatus } = useFilter();

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
          navbar={{ width: 250, breakpoint: 'sm' }}
          padding="md"
        >
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
              />
              <NavLink
                component={Link}
                href="/users"
                label="User Registrations"
                leftSection={<IconUserPlus size={16} />}
                active={pathname === '/users'}
              />
              <NavLink
                component={Link}
                href="/active-users"
                label="Active Users"
                leftSection={<IconActivity size={16} />}
                active={pathname === '/active-users'}
              />
              <NavLink
                component={Link}
                href="/organizations"
                label="Organizations"
                leftSection={<IconBuilding size={16} />}
                active={pathname?.startsWith('/organizations')}
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
              />
              <NavLink
                component={Link}
                href="/charts-dashboards"
                label="Charts & Dashboards"
                leftSection={<IconChartBar size={16} />}
                active={pathname === '/charts-dashboards'}
              />
              <NavLink
                component={Link}
                href="/alerts"
                label="Alerts"
                leftSection={<IconBell size={16} />}
                active={pathname === '/alerts'}
              />
              
              <Text size="xs" fw={600} tt="uppercase" c="dimmed" mt="md" mb="xs">
                API
              </Text>
              <NavLink
                component={Link}
                href="/api-usage"
                label="API Usage"
                leftSection={<IconApi size={16} />}
                active={pathname === '/api-usage'}
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
