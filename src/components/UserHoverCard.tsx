'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { HoverCard, Anchor, Text, Stack, Loader } from '@mantine/core';
import { DateTime } from 'luxon';
import Link from 'next/link';

interface UserSummary {
  user: {
    firstName: string;
    lastName: string;
    username: string;
    lastActiveAt: string | null;
  };
}

interface UserHoverCardProps {
  userId: number;
  userName: string;
  size?: 'xs' | 'sm';
  openDelay?: number;
  closeDelay?: number;
}

export function UserHoverCard({
  userId,
  userName,
  size = 'sm',
  openDelay = 400,
  closeDelay = 150,
}: UserHoverCardProps) {
  const [data, setData] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldFetch, setShouldFetch] = useState(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    hasFetchedRef.current = false;
    setData(null);
    setError(null);
    setShouldFetch(false);
  }, [userId]);

  useEffect(() => {
    if (!shouldFetch || hasFetchedRef.current) return;

    hasFetchedRef.current = true;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/users-list?id=${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }
        const result = await response.json();
        setData({
          user: {
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            username: result.user.username,
            lastActiveAt: result.user.lastActiveAt,
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        hasFetchedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shouldFetch, userId]);

  const handleOpen = useCallback(() => {
    queueMicrotask(() => setShouldFetch(true));
  }, []);

  const formatTimeAgo = (dateString: string): string => {
    return DateTime.fromISO(dateString).toRelative() || 'Unknown';
  };

  const displayName =
    data?.user.firstName && data.user.lastName
      ? `${data.user.firstName} ${data.user.lastName}`
      : data?.user.username ?? userName;

  return (
    <HoverCard
      width={280}
      shadow="md"
      withArrow
      position="top"
      offset={10}
      openDelay={openDelay}
      closeDelay={closeDelay}
      onOpen={handleOpen}
    >
      <HoverCard.Target>
        <Anchor
          component={Link}
          href={`/users-list/${userId}`}
          size={size}
          style={{
            display: 'inline-block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}
        >
          {userName}
        </Anchor>
      </HoverCard.Target>

      <HoverCard.Dropdown>
        {loading ? (
          <Stack align="center" py="md">
            <Loader size="sm" />
          </Stack>
        ) : error ? (
          <Text size="sm" c="red">
            {error}
          </Text>
        ) : data ? (
          <Stack gap="xs">
            <Text fw={600} size="sm">
              {displayName}
            </Text>
            <Text size="xs" c="dimmed">
              Last active{' '}
              {data.user.lastActiveAt
                ? formatTimeAgo(data.user.lastActiveAt)
                : 'never'}
            </Text>
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
