'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Modal,
  TextInput,
  Stack,
  Group,
  Text,
  Badge,
  Paper,
  Loader,
  Kbd,
} from '@mantine/core';
import { IconSearch, IconUser, IconBuilding } from '@tabler/icons-react';
import { useFilter } from '@/contexts/FilterContext';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import { UsersListResponse, OrganizationsResponse } from '@/lib/api-types';

interface SpotlightSearchProps {
  opened: boolean;
  onClose: () => void;
}

export function SpotlightSearch({ opened, onClose }: SpotlightSearchProps) {
  const router = useRouter();
  const { filterGridstatus } = useFilter();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch users and organizations in background
  const usersUrl = useApiUrl('/api/users-list', {
    search: search || undefined,
    filterGridstatus,
  });
  const orgsUrl = useApiUrl('/api/organizations', {
    search: search || undefined,
    filterGridstatus,
  });

  const { data: usersData, loading: usersLoading } = useApiData<UsersListResponse>(
    search ? usersUrl : null,
    [search, filterGridstatus]
  );
  const { data: orgsData, loading: orgsLoading } = useApiData<OrganizationsResponse>(
    search ? orgsUrl : null,
    [search, filterGridstatus]
  );

  const users = usersData?.users || [];
  const orgs = orgsData?.organizations || [];

  // Combine and limit results - organizations first, then users
  const allResults = useMemo(() => {
    const results: Array<{ type: 'user' | 'org'; data: typeof users[0] | typeof orgs[0]; id: string }> = [];
    
    // Organizations first
    orgs.slice(0, 10).forEach(org => {
      results.push({ type: 'org', data: org, id: `org-${org.id}` });
    });
    
    // Then users
    users.slice(0, 10).forEach(user => {
      results.push({ type: 'user', data: user, id: `user-${user.id}` });
    });
    
    return results;
  }, [users, orgs]);

  const handleSelect = useCallback((index: number) => {
    const result = allResults[index];
    if (!result) return;

    if (result.type === 'user') {
      router.push(`/users-list/${result.data.id}`);
    } else {
      router.push(`/organizations/${result.data.id}`);
    }
    onClose();
    setSearch('');
    setSelectedIndex(0);
  }, [allResults, router, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!opened) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allResults.length > 0) {
          handleSelect(selectedIndex);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        setSearch('');
        setSelectedIndex(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [opened, allResults.length, selectedIndex, handleSelect, onClose]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Reset when modal closes
  useEffect(() => {
    if (!opened) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [opened]);

  const loading = usersLoading || orgsLoading;
  const hasResults = allResults.length > 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconSearch size={20} />
          <Text fw={600}>Search</Text>
        </Group>
      }
      size="lg"
      centered
    >
      <Stack gap="md">
        <Stack gap={4}>
          <TextInput
            placeholder="Search users or organizations..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            autoFocus
          />
          <Group gap={4} justify="flex-end" visibleFrom="sm">
            <Text size="xs" c="dimmed">Use</Text>
            <Kbd size="xs">↑</Kbd>
            <Kbd size="xs">↓</Kbd>
            <Text size="xs" c="dimmed">to navigate,</Text>
            <Kbd size="xs">↵</Kbd>
            <Text size="xs" c="dimmed">to select</Text>
          </Group>
        </Stack>

        {loading && search && (
          <Group justify="center" py="xl">
            <Loader size="sm" />
          </Group>
        )}

        {!loading && search && !hasResults && (
          <Text c="dimmed" ta="center" py="xl">
            No results found
          </Text>
        )}

        {!loading && hasResults && (
          <Stack gap={2}>
            {allResults.map((result, index) => {
              const isSelected = index === selectedIndex;
              const isUser = result.type === 'user';
              const user = isUser ? result.data as typeof users[0] : null;
              const org = !isUser ? result.data as typeof orgs[0] : null;

              return (
                <Paper
                  key={result.id}
                  p="xs"
                  style={{
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--mantine-color-blue-light)' : undefined,
                    border: isSelected ? '1px solid var(--mantine-color-blue-6)' : '1px solid transparent',
                  }}
                  onClick={() => handleSelect(index)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Group gap="xs" wrap="nowrap">
                    {isUser ? (
                      <>
                        <IconUser size={18} color="var(--mantine-color-blue-6)" />
                        <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
                          <Group gap="xs" wrap="nowrap">
                            <Text fw={500} size="sm" truncate>
                              {user?.firstName && user?.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user?.username}
                            </Text>
                            <Badge size="xs" variant="light" color="blue">
                              User
                            </Badge>
                          </Group>
                          <Text size="xs" c="dimmed" truncate>
                            {user?.username}
                          </Text>
                        </Stack>
                      </>
                    ) : (
                      <>
                        <IconBuilding size={18} color="var(--mantine-color-teal-6)" />
                        <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
                          <Group gap="xs" wrap="nowrap">
                            <Text fw={500} size="sm" truncate>
                              {org?.name}
                            </Text>
                            <Badge size="xs" variant="light" color="teal">
                              Organization
                            </Badge>
                          </Group>
                        </Stack>
                      </>
                    )}
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}

        {!search && (
          <Text c="dimmed" ta="center" py="xl">
            Start typing to search users or organizations
          </Text>
        )}
      </Stack>
    </Modal>
  );
}

