'use client';

import { useMemo, useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import type { UsersListResponse, OrganizationsResponse } from '@/lib/api-types';

export interface UserDetailShaped {
  user: { id: number; username: string; firstName: string; lastName: string };
  subscriptions?: { id: number }[];
}

export interface OrgDetailShaped {
  organization: { id: string; name: string };
  subscriptions?: { id: number }[];
}

export interface UserOrgLookupOptions {
  value: string;
  label: string;
}

export function useUserOrgLookup(
  userId: number | null,
  organizationId: string | null
) {
  const [userSearch, setUserSearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [debouncedUserSearch] = useDebouncedValue(userSearch, 300);
  const [debouncedOrgSearch] = useDebouncedValue(orgSearch, 300);

  const usersListUrl = useApiUrl('/api/users-list', { search: debouncedUserSearch || undefined });
  const orgsListUrl = useApiUrl('/api/organizations', { search: debouncedOrgSearch || undefined });
  const { data: usersData } = useApiData<UsersListResponse>(usersListUrl, [usersListUrl]);
  const { data: orgsData } = useApiData<OrganizationsResponse>(orgsListUrl, [orgsListUrl]);

  const userDetailUrl = useApiUrl('/api/users-list', userId != null ? { id: String(userId) } : {});
  const orgDetailUrl = useApiUrl('/api/organizations', organizationId ? { id: organizationId } : {});
  const { data: userDetail } = useApiData<UserDetailShaped>(
    userId != null ? userDetailUrl : null,
    [userId, userDetailUrl]
  );
  const { data: orgDetail } = useApiData<OrgDetailShaped>(
    organizationId ? orgDetailUrl : null,
    [organizationId, orgDetailUrl]
  );

  const userOptions = useMemo((): UserOrgLookupOptions[] => {
    const list = usersData?.users ?? [];
    const opts = list.map((u) => ({
      value: String(u.id),
      label: (u.firstName || u.lastName)
        ? `${u.username} (${[u.firstName, u.lastName].filter(Boolean).join(' ')})`
        : u.username,
    }));
    if (userId != null && !opts.some((o) => o.value === String(userId))) {
      const label = userDetail?.user
        ? `${userDetail.user.username} (${[userDetail.user.firstName, userDetail.user.lastName].filter(Boolean).join(' ')})`
        : `User #${userId}`;
      return [{ value: String(userId), label }, ...opts];
    }
    return opts;
  }, [usersData, userId, userDetail]);

  const orgOptions = useMemo((): UserOrgLookupOptions[] => {
    const list = orgsData?.organizations ?? [];
    const opts = list.map((o) => ({ value: o.id, label: o.name }));
    if (organizationId && !opts.some((o) => o.value === organizationId)) {
      const label = orgDetail?.organization?.name ?? organizationId;
      return [{ value: organizationId, label }, ...opts];
    }
    return opts;
  }, [orgsData, organizationId, orgDetail]);

  return {
    userSearch,
    setUserSearch,
    orgSearch,
    setOrgSearch,
    userOptions,
    orgOptions,
    userDetail,
    orgDetail,
  };
}
