'use client';

import { useState } from 'react';
import { Box, Group, SegmentedControl, Select, SimpleGrid, Text } from '@mantine/core';
import { UserHoverCard } from '@/components/UserHoverCard';
import { useUserOrgLookup } from '@/hooks/useUserOrgLookup';
import type { UserDetailShaped, OrgDetailShaped } from '@/hooks/useUserOrgLookup';

export type UserOrgLookupMode = 'subscription' | 'oneOf';

export interface UserOrgLookupProps {
  mode: UserOrgLookupMode;
  userId: number | null;
  organizationId: string | null;
  onUserIdChange: (id: number | null) => void;
  onOrganizationIdChange: (id: string | null) => void;
  /** Renders after the selected summary. For subscription mode: receives detail so you can show e.g. subscription count. */
  selectedExtra?: (context: { userDetail: UserDetailShaped | null; orgDetail: OrgDetailShaped | null }) => React.ReactNode;
  /** When provided, replaces the default selected summary (use for full custom summary e.g. with subscription counts). */
  selectedSummaryContent?: (context: { userDetail: UserDetailShaped | null; orgDetail: OrgDetailShaped | null }) => React.ReactNode;
  labelUser?: string;
  labelOrganization?: string;
  size?: 'xs' | 'sm' | 'md';
  /** Min width for the selects grid (subscription) or single select (oneOf) */
  minWidth?: number;
}

export function UserOrgLookup({
  mode,
  userId,
  organizationId,
  onUserIdChange,
  onOrganizationIdChange,
  selectedExtra,
  selectedSummaryContent,
  labelUser = 'User',
  labelOrganization = 'Organization',
  size = 'xs',
  minWidth = 320,
}: UserOrgLookupProps) {
  const { userSearch, setUserSearch, orgSearch, setOrgSearch, userOptions, orgOptions, userDetail, orgDetail } =
    useUserOrgLookup(userId, organizationId);

  const [oneOfSegmentType, setOneOfSegmentType] = useState<'user' | 'organization'>(() =>
    userId != null ? 'user' : organizationId ? 'organization' : 'user'
  );

  const oneOfActiveType = userId != null ? 'user' : organizationId ? 'organization' : oneOfSegmentType;

  const handleOneOfTypeChange = (v: string) => {
    const next = v as 'user' | 'organization';
    setOneOfSegmentType(next);
    if (next === 'user') {
      onOrganizationIdChange(null);
    } else {
      onUserIdChange(null);
    }
  };

  const handleOneOfUserChange = (v: string | null) => {
    if (v != null && v !== '') {
      onUserIdChange(parseInt(v, 10));
      onOrganizationIdChange(null);
    } else {
      onUserIdChange(null);
    }
  };

  const handleOneOfOrgChange = (v: string | null) => {
    if (v) {
      onOrganizationIdChange(v);
      onUserIdChange(null);
    } else {
      onOrganizationIdChange(null);
    }
  };

  if (mode === 'oneOf') {
    return (
      <Box>
        <Box mb="sm">
          <Text size="sm" c="dimmed" mb={4}>
            Entity
          </Text>
          <SegmentedControl
            value={oneOfActiveType}
            onChange={handleOneOfTypeChange}
            data={[
              { label: labelUser, value: 'user' },
              { label: labelOrganization, value: 'organization' },
            ]}
          />
        </Box>
        {oneOfActiveType === 'user' ? (
          <Select
            label={labelUser}
            searchable
            clearable
            placeholder="Search by username or name..."
            data={userOptions}
            value={userId != null ? String(userId) : null}
            onSearchChange={setUserSearch}
            searchValue={userSearch}
            onChange={handleOneOfUserChange}
            nothingFoundMessage="Type to search users"
            size={size}
            style={{ minWidth }}
          />
        ) : (
          <Select
            label={labelOrganization}
            searchable
            clearable
            placeholder="Search organizations..."
            data={orgOptions}
            value={organizationId ?? null}
            onSearchChange={setOrgSearch}
            searchValue={orgSearch}
            onChange={handleOneOfOrgChange}
            nothingFoundMessage="Type to search organizations"
            size={size}
            style={{ minWidth }}
          />
        )}
        {(userDetail?.user || orgDetail?.organization) && (
          <Box pt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            <Text size="xs" c="dimmed" mb={4}>
              Selected
            </Text>
            {selectedSummaryContent?.({
              userDetail: userDetail ?? null,
              orgDetail: orgDetail ?? null,
            }) ?? (
              <>
                {userDetail?.user && (
                  <UserHoverCard
                    userId={userDetail.user.id}
                    userName={userDetail.user.username}
                    size="xs"
                  />
                )}
                {orgDetail?.organization && (
                  <Text size="sm" fw={500}>
                    {orgDetail.organization.name}
                  </Text>
                )}
                {selectedExtra?.({ userDetail: userDetail ?? null, orgDetail: orgDetail ?? null })}
              </>
            )}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" verticalSpacing="xs" style={{ minWidth }}>
        <Select
          label={labelUser}
          searchable
          clearable
          placeholder="Search by username or name..."
          data={userOptions}
          value={userId != null ? String(userId) : null}
          onSearchChange={setUserSearch}
          searchValue={userSearch}
          onChange={(v) => onUserIdChange(v != null && v !== '' ? parseInt(v, 10) : null)}
          nothingFoundMessage="Type to search users"
          size={size}
          style={{ minWidth: 280 }}
        />
        <Select
          label={labelOrganization}
          searchable
          clearable
          placeholder="Search organizations..."
          data={orgOptions}
          value={organizationId ?? null}
          onSearchChange={setOrgSearch}
          searchValue={orgSearch}
          onChange={(v) => onOrganizationIdChange(v ?? null)}
          nothingFoundMessage="Type to search organizations"
          size={size}
          style={{ minWidth: 280 }}
        />
      </SimpleGrid>
      {(userDetail?.user || orgDetail?.organization) && (
        <Group gap="lg" wrap="wrap" mt="xs" pt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
          {selectedSummaryContent?.({
            userDetail: userDetail ?? null,
            orgDetail: orgDetail ?? null,
          }) ?? (
            <>
              {userDetail?.user && (
                <Group gap={6} wrap="nowrap">
                  <Text size="xs" c="dimmed">
                    User:
                  </Text>
                  <UserHoverCard
                    userId={userDetail.user.id}
                    userName={userDetail.user.username}
                    size="xs"
                  />
                </Group>
              )}
              {orgDetail?.organization && (
                <Group gap={6} wrap="nowrap">
                  <Text size="xs" c="dimmed">
                    Org:
                  </Text>
                  <Text size="sm" fw={500}>
                    {orgDetail.organization.name}
                  </Text>
                </Group>
              )}
              {selectedExtra?.({ userDetail: userDetail ?? null, orgDetail: orgDetail ?? null })}
            </>
          )}
        </Group>
      )}
    </Box>
  );
}
