'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApiData } from '@/hooks/useApiData';
import { useApiUrl } from '@/hooks/useApiUrl';
import {
  Paper,
  Text,
  Group,
  Stack,
  SimpleGrid,
  Loader,
  Alert,
  Anchor,
  Button,
  SegmentedControl,
  Select,
  Modal,
  TextInput,
} from '@mantine/core';
import { CodeHighlight } from '@mantine/code-highlight';
import { IconCircleCheck } from '@tabler/icons-react';
import Link from 'next/link';
import { useDebouncedValue } from '@mantine/hooks';
import { useQueryState, parseAsInteger, parseAsString } from 'nuqs';
import { AppContainer } from '@/components/AppContainer';
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs';
import { useFilter } from '@/contexts/FilterContext';
import { DateTime } from 'luxon';
import {
  SubscriptionCreatableFields,
  SubscriptionStatus,
  PlansResponse,
} from '@/lib/api-types';
import type { SubscriptionCreateResponse } from '@/lib/api-types';
import { UserHoverCard } from '@/components/UserHoverCard';
import type { UsersListResponse, OrganizationsResponse } from '@/lib/api-types';

interface UserDetailResponse {
  user: { id: number; username: string; firstName: string; lastName: string; createdAt: string; lastActiveAt: string | null };
  subscriptions: { id: number }[];
}

interface OrgDetailResponse {
  organization: { id: string; name: string; createdAt: string };
  subscriptions: { id: number }[];
}

const defaultStart = () => DateTime.now().toISO();
const defaultBillingStart = () => DateTime.now().toISO();
const defaultBillingEnd = () => DateTime.now().plus({ months: 1 }).toISO();

export default function NewSubscriptionPage() {
  const router = useRouter();
  const { timezone } = useFilter();
  const [userId, setUserId] = useQueryState('userId', parseAsInteger);
  const [organizationId, setOrganizationId] = useQueryState('organizationId', parseAsString);

  const [userSearch, setUserSearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [debouncedUserSearch] = useDebouncedValue(userSearch, 300);
  const [debouncedOrgSearch] = useDebouncedValue(orgSearch, 300);

  const usersListUrl = useApiUrl('/api/users-list', { search: debouncedUserSearch || undefined });
  const orgsListUrl = useApiUrl('/api/organizations', { search: debouncedOrgSearch || undefined });
  const { data: usersData } = useApiData<UsersListResponse>(usersListUrl, [usersListUrl, debouncedUserSearch]);
  const { data: orgsData } = useApiData<OrganizationsResponse>(orgsListUrl, [orgsListUrl, debouncedOrgSearch]);

  const userDetailUrl = useApiUrl('/api/users-list', userId != null ? { id: String(userId) } : {});
  const orgDetailUrl = useApiUrl('/api/organizations', organizationId != null && organizationId !== '' ? { id: organizationId } : {});
  const { data: userDetail } = useApiData<UserDetailResponse>(userId != null ? userDetailUrl : null, [userId, userDetailUrl]);
  const { data: orgDetail } = useApiData<OrgDetailResponse>(organizationId != null && organizationId !== '' ? orgDetailUrl : null, [organizationId, orgDetailUrl]);

  const { data: canEditData, loading: canEditLoading } = useApiData<{ canEdit: boolean }>('/api/auth/can-edit', []);
  const canEdit = canEditData?.canEdit ?? false;

  const { data: plansData } = useApiData<PlansResponse>(canEdit ? '/api/plans' : null, [canEdit]);
  const plans = plansData?.plans ?? [];
  const planOptions = useMemo(
    () => plans.map((p) => ({ value: String(p.id), label: `${p.planName} (id=${p.id})` })),
    [plans]
  );

  const [form, setForm] = useState<SubscriptionCreatableFields>({
    userId: null,
    organizationId: null,
    planId: plans[0]?.id ?? 1,
    status: 'active' as SubscriptionStatus,
    startDate: defaultStart(),
    enforceApiUsageLimit: true,
    cancelAtPeriodEnd: false,
    currentBillingPeriodStart: defaultBillingStart(),
    currentBillingPeriodEnd: defaultBillingEnd(),
  });

  useEffect(() => {
    setForm((f) => ({
      ...f,
      userId: userId ?? null,
      organizationId: organizationId && organizationId !== '' ? organizationId : null,
    }));
  }, [userId, organizationId]);

  const userOptions = useMemo(() => {
    const list = usersData?.users ?? [];
    const opts = list.map((u) => ({ value: String(u.id), label: `${u.username} (${u.firstName} ${u.lastName})` }));
    if (userId != null && !opts.some((o) => o.value === String(userId))) {
      const label = userDetail?.user
        ? `${userDetail.user.username} (${userDetail.user.firstName} ${userDetail.user.lastName})`
        : `User #${userId}`;
      return [{ value: String(userId), label }, ...opts];
    }
    return opts;
  }, [usersData, userId, userDetail]);

  const orgOptions = useMemo(() => {
    const list = orgsData?.organizations ?? [];
    const opts = list.map((o) => ({ value: o.id, label: o.name }));
    if (organizationId && organizationId !== '' && !opts.some((o) => o.value === organizationId)) {
      const label = orgDetail?.organization?.name ?? organizationId;
      return [{ value: organizationId, label }, ...opts];
    }
    return opts;
  }, [orgsData, organizationId, orgDetail]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSql, setPreviewSql] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);

  const canSubmit =
    form.userId != null &&
    form.planId != null &&
    form.status &&
    form.startDate &&
    form.currentBillingPeriodStart;

  const buildPayload = useCallback((): Record<string, unknown> => {
    return {
      userId: form.userId,
      organizationId: form.organizationId,
      planId: form.planId,
      status: form.status,
      startDate: form.startDate,
      enforceApiUsageLimit: form.enforceApiUsageLimit,
      cancelAtPeriodEnd: form.cancelAtPeriodEnd,
      currentBillingPeriodStart: form.currentBillingPeriodStart,
      currentBillingPeriodEnd: form.currentBillingPeriodEnd,
    };
  }, [form]);

  const handlePreview = useCallback(async () => {
    setPreviewError(null);
    setPreviewSql(null);
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/subscriptions?preview=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data?.errors) ? data.errors.join('. ') : data?.error || res.statusText;
        setPreviewError(msg);
        return;
      }
      setPreviewSql(data.sql);
    } catch {
      setPreviewError('Failed to load query preview');
    } finally {
      setPreviewLoading(false);
    }
  }, [buildPayload]);

  const handleConfirm = useCallback(async () => {
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = (await res.json().catch(() => ({}))) as SubscriptionCreateResponse & { error?: string; errors?: string[] };
      if (!res.ok) {
        const msg =
          res.status === 403
            ? 'You are not authorized to create subscriptions.'
            : Array.isArray(data?.errors)
              ? data.errors.join('. ')
              : data?.error || res.statusText;
        setCreateError(msg);
        return;
      }
      setCreatedId(data.subscription?.id ?? null);
      setCreateSuccess(true);
    } finally {
      setCreateLoading(false);
    }
  }, [buildPayload]);

  const handleCloseModal = useCallback(() => {
    setPreviewOpen(false);
    if (createSuccess && createdId != null) {
      router.push(`/subscriptions/${createdId}`);
      return;
    }
    setCreateSuccess(false);
    setCreateError(null);
  }, [createSuccess, createdId, router]);

  if (canEditLoading) {
    return (
      <AppContainer>
        <PageBreadcrumbs
          items={[
            { label: 'Subscriptions', href: '/subscriptions' },
            { label: 'New Subscription' },
          ]}
        />
        <Stack align="center" py="xl">
          <Loader />
        </Stack>
      </AppContainer>
    );
  }

  if (!canEdit) {
    return (
      <AppContainer>
        <PageBreadcrumbs
          items={[
            { label: 'Subscriptions', href: '/subscriptions' },
            { label: 'New Subscription' },
          ]}
        />
        <Alert color="yellow" title="Not authorized">
          Only authorized editors can create subscriptions. Use the Subscription List to view existing subscriptions.
        </Alert>
      </AppContainer>
    );
  }

  return (
    <AppContainer>
      <PageBreadcrumbs
        items={[
          { label: 'Subscriptions', href: '/subscriptions' },
          { label: 'New Subscription' },
        ]}
      />

      <Stack gap="md">
        <Stack gap="md" style={{ width: 'fit-content' }}>
        <Paper shadow="sm" p="md" radius="md" withBorder style={{ width: 'fit-content' }}>
          <Text fw={600} size="sm" mb="xs">
            User & organization
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" verticalSpacing="xs" style={{ minWidth: 320 }}>
            <Select
              label="User"
              searchable
              clearable
              placeholder="Search by username or name..."
              data={userOptions}
              value={userId != null ? String(userId) : null}
              onSearchChange={setUserSearch}
              searchValue={userSearch}
              onChange={(v) => setUserId(v != null && v !== '' ? parseInt(v, 10) : null)}
              nothingFoundMessage="Type to search users"
              size="xs"
              style={{ minWidth: 280 }}
            />
            <Select
              label="Organization"
              searchable
              clearable
              placeholder="Search organizations..."
              data={orgOptions}
              value={organizationId ?? null}
              onSearchChange={setOrgSearch}
              searchValue={orgSearch}
              onChange={(v) => setOrganizationId(v ?? null)}
              nothingFoundMessage="Type to search organizations"
              size="xs"
              style={{ minWidth: 280 }}
            />
          </SimpleGrid>
          {(userDetail?.user || orgDetail?.organization) && (
            <Group gap="lg" wrap="wrap" mt="xs" pt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
              {userDetail?.user && (
                <Group gap={6} wrap="nowrap">
                  <Text size="xs" c="dimmed">User:</Text>
                  <UserHoverCard
                    userId={userDetail.user.id}
                    userName={userDetail.user.username}
                    size="xs"
                  />
                  <Text size="xs" c="dimmed">
                    · {userDetail.subscriptions?.length ?? 0} existing sub{userDetail.subscriptions?.length === 1 ? '' : 's'}
                  </Text>
                </Group>
              )}
              {orgDetail?.organization && (
                <Group gap={6} wrap="nowrap">
                  <Text size="xs" c="dimmed">Org:</Text>
                  <Anchor component={Link} href={`/organizations/${orgDetail.organization.id}`} size="xs">
                    {orgDetail.organization.name}
                  </Anchor>
                  <Text size="xs" c="dimmed">
                    · {orgDetail.subscriptions?.length ?? 0} existing sub{orgDetail.subscriptions?.length === 1 ? '' : 's'}
                  </Text>
                </Group>
              )}
            </Group>
          )}
        </Paper>

        <Paper shadow="sm" p="md" radius="md" withBorder style={{ width: 'fit-content', minWidth: 320 }}>
          <Text fw={600} size="sm" mb="xs">
            Subscription settings
          </Text>
          <Stack gap="md">
            <Select
              label="Plan"
              data={planOptions}
              value={String(form.planId)}
              onChange={(v) => v != null && setForm((f) => ({ ...f, planId: parseInt(v, 10) }))}
              allowDeselect={false}
              style={{ minWidth: 280 }}
            />
            <div>
              <Text size="sm" fw={500} mb={4}>Status</Text>
              <SegmentedControl
                size="xs"
                data={[{ label: 'Active', value: 'active' }, { label: 'Trialing', value: 'trialing' }]}
                value={form.status}
                onChange={(v) => setForm((f) => ({ ...f, status: v as SubscriptionStatus }))}
              />
            </div>
            <TextInput
              label="Start date"
              type="datetime-local"
              style={{ minWidth: 280 }}
              value={
                form.startDate
                  ? DateTime.fromISO(form.startDate).setZone(timezone).toFormat("yyyy-MM-dd'T'HH:mm")
                  : ''
              }
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  startDate: e.target.value
                    ? DateTime.fromFormat(e.target.value, "yyyy-MM-dd'T'HH:mm", { zone: timezone }).toISO() ?? ''
                    : defaultStart(),
                }))
              }
            />
            <Group align="flex-end" gap="lg">
              <div>
                <Text size="sm" fw={500} mb={4}>Enforce API usage limit</Text>
                <SegmentedControl
                  size="xs"
                  data={[{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }]}
                  value={form.enforceApiUsageLimit ? 'true' : 'false'}
                  onChange={(v) => setForm((f) => ({ ...f, enforceApiUsageLimit: v === 'true' }))}
                />
              </div>
              <div>
                <Text size="sm" fw={500} mb={4}>Cancel at period end</Text>
                <SegmentedControl
                  size="xs"
                  data={[{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }]}
                  value={(form.cancelAtPeriodEnd ?? false) ? 'true' : 'false'}
                  onChange={(v) => setForm((f) => ({ ...f, cancelAtPeriodEnd: v === 'true' }))}
                />
              </div>
            </Group>
            <Group align="flex-end" gap="md" wrap="wrap">
              <TextInput
                label="Billing period start"
                type="datetime-local"
                style={{ minWidth: 280 }}
                value={
                  form.currentBillingPeriodStart
                    ? DateTime.fromISO(form.currentBillingPeriodStart).setZone(timezone).toFormat("yyyy-MM-dd'T'HH:mm")
                    : ''
                }
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    currentBillingPeriodStart: e.target.value
                      ? DateTime.fromFormat(e.target.value, "yyyy-MM-dd'T'HH:mm", { zone: timezone }).toISO() ?? ''
                      : defaultBillingStart(),
                  }))
                }
              />
              <TextInput
                label="Billing period end"
                type="datetime-local"
                placeholder="Optional"
                style={{ minWidth: 280 }}
                value={
                  form.currentBillingPeriodEnd
                    ? DateTime.fromISO(form.currentBillingPeriodEnd).setZone(timezone).toFormat("yyyy-MM-dd'T'HH:mm")
                    : ''
                }
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    currentBillingPeriodEnd: e.target.value
                      ? DateTime.fromFormat(e.target.value, "yyyy-MM-dd'T'HH:mm", { zone: timezone }).toISO() ?? null
                      : null,
                  }))
                }
              />
            </Group>
          </Stack>
        </Paper>

        <Group justify="flex-end">
          <Button color="green" onClick={handlePreview} disabled={!canSubmit} style={{ width: 'fit-content' }}>
            Continue
          </Button>
        </Group>
        </Stack>
      </Stack>

      <Modal
        opened={previewOpen}
        onClose={handleCloseModal}
        closeOnClickOutside={!createLoading}
        closeOnEscape={!createLoading}
        title={createSuccess ? 'Subscription created' : 'Confirm create'}
        size="xl"
      >
        <Stack>
          {createSuccess ? (
            <>
              <Stack align="center" gap="xs" py="lg">
                <IconCircleCheck size={48} color="var(--mantine-color-green-6)" />
                <Text fw={600} size="lg">Subscription created</Text>
              </Stack>
              <Group justify="flex-end">
                <Button onClick={handleCloseModal}>Go to subscription</Button>
              </Group>
            </>
          ) : (
            <>
              <Text size="sm" c="dimmed">Review the SQL below, then confirm to create the subscription.</Text>
              {previewLoading ? (
                <Group justify="center" py="sm">
                  <Loader size="sm" />
                </Group>
              ) : previewError ? (
                <Alert color="red" variant="light">
                  {previewError}
                </Alert>
              ) : previewSql ? (
                <CodeHighlight code={previewSql} language="sql" />
              ) : null}

              {createError && (
                <Alert color="red" variant="light">
                  {createError}
                </Alert>
              )}

              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={handleCloseModal} disabled={createLoading}>
                  Cancel
                </Button>
                <Button
                  color="green"
                  onClick={handleConfirm}
                  loading={createLoading}
                  disabled={previewLoading || !!previewError}
                >
                  Confirm create
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </AppContainer>
  );
}
