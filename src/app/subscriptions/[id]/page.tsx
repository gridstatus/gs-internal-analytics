'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApiData } from '@/hooks/useApiData';
import {
  Paper,
  Text,
  Group,
  SimpleGrid,
  Table,
  Loader,
  Alert,
  Stack,
  Anchor,
  Badge,
  Button,
  SegmentedControl,
  Select,
  NumberInput,
  MultiSelect,
  Modal,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { CodeHighlight } from '@mantine/code-highlight';
import { IconAlertCircle, IconCircleCheck, IconLock, IconLockOpen, IconPencil, IconTrash } from '@tabler/icons-react';
import Link from 'next/link';
import { AppContainer } from '@/components/AppContainer';
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs';
import { useFilter } from '@/contexts/FilterContext';
import { DateTime } from 'luxon';
import {
  SubscriptionDetailResponse,
  SubscriptionDetail,
  SubscriptionEditableFields,
  SubscriptionStatus,
  EDITABLE_FIELD_KEYS,
  PlansResponse,
  SUBSCRIPTION_STATUSES,
} from '@/lib/api-types';
import { UserHoverCard } from '@/components/UserHoverCard';
import { InfoHoverIcon } from '@/components/InfoHoverIcon';
import { StripeSubscriptionId } from '@/components/StripeSubscriptionId';


function formatOverride(value: number | null): string {
  if (value == null) return '—';
  if (value === -1) return 'Unlimited';
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString();
}

function subToEditable(sub: SubscriptionDetail): SubscriptionEditableFields {
  return {
    planId: sub.planId!,
    status: sub.status as SubscriptionStatus,
    enforceApiUsageLimit: sub.enforceApiUsageLimit,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    currentBillingPeriodStart: sub.currentBillingPeriodStart,
    currentBillingPeriodEnd: sub.currentBillingPeriodEnd,
    apiRowsReturnedLimitOverride: sub.apiRowsReturnedLimitOverride,
    apiRequestsLimitOverride: sub.apiRequestsLimitOverride,
    apiRowsPerResponseLimitOverride: sub.apiRowsPerResponseLimitOverride,
    alertsLimitOverride: sub.alertsLimitOverride,
    dashboardsLimitOverride: sub.dashboardsLimitOverride,
    downloadsLimitOverride: sub.downloadsLimitOverride,
    chartsLimitOverride: sub.chartsLimitOverride,
    perSecondApiRateLimitOverride: sub.perSecondApiRateLimitOverride,
    perMinuteApiRateLimitOverride: sub.perMinuteApiRateLimitOverride,
    perHourApiRateLimitOverride: sub.perHourApiRateLimitOverride,
    entitlementOverrides: sub.entitlementOverrides,
  };
}

function formatEditableValue(
  key: keyof SubscriptionEditableFields,
  value: unknown,
  planLookup?: Map<number, string>,
): string {
  if (value == null) return 'NULL';
  if (key === 'planId' && typeof value === 'number' && planLookup) {
    const name = planLookup.get(value);
    return name ? `${name} (id=${value})` : `id=${value}`;
  }
  if (key === 'entitlementOverrides' && Array.isArray(value)) return value.length ? value.join(', ') : '[]';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  return String(value);
}

const EDITABLE_LABELS: Record<keyof SubscriptionEditableFields, string> = {
  planId: 'Plan',
  status: 'Status',
  enforceApiUsageLimit: 'Enforce API usage limit',
  cancelAtPeriodEnd: 'Cancel at period end',
  currentBillingPeriodStart: 'Billing period start',
  currentBillingPeriodEnd: 'Billing period end',
  apiRowsReturnedLimitOverride: 'API rows returned override',
  apiRequestsLimitOverride: 'API requests override',
  apiRowsPerResponseLimitOverride: 'API rows per response override',
  alertsLimitOverride: 'Alerts override',
  dashboardsLimitOverride: 'Dashboards override',
  downloadsLimitOverride: 'Downloads override',
  chartsLimitOverride: 'Charts override',
  perSecondApiRateLimitOverride: 'Per second rate limit override',
  perMinuteApiRateLimitOverride: 'Per minute rate limit override',
  perHourApiRateLimitOverride: 'Per hour rate limit override',
  entitlementOverrides: 'Entitlement overrides',
};

export default function SubscriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { timezone } = useFilter();

  const [refetchKey, setRefetchKey] = useState(0);
  const url = id ? `/api/subscriptions/${id}` : null;
  const { data, loading, error } = useApiData<SubscriptionDetailResponse>(url, [id, refetchKey]);

  const { data: canEditData } = useApiData<{ canEdit: boolean }>(
    '/api/auth/can-edit',
    []
  );
  const canEdit = canEditData?.canEdit ?? false;

  const { data: plansData } = useApiData<PlansResponse>(canEdit ? '/api/plans' : null, [canEdit]);
  const plans = plansData?.plans ?? [];
  const planOptions = useMemo(
    () => plans.map((p) => ({ value: String(p.id), label: `${p.planName} (id=${p.id})` })),
    [plans]
  );

  const { data: entitlementsData } = useApiData<{ entitlements: string[] }>(
    canEdit ? '/api/entitlements' : null,
    [canEdit]
  );
  const entitlementOptions = entitlementsData?.entitlements ?? [];

  const [isLocked, setIsLocked] = useState(true);
  const [form, setForm] = useState<SubscriptionEditableFields | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSql, setPreviewSql] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePreviewSql, setDeletePreviewSql] = useState<string | null>(null);
  const [deletePreviewLoading, setDeletePreviewLoading] = useState(false);
  const [deletePreviewError, setDeletePreviewError] = useState<string | null>(null);

  const sub = data?.subscription;
  const editing = !isLocked && form != null;
  const canDelete = editing && sub != null && (sub.stripeSubscriptionId == null || sub.stripeSubscriptionId === '');
  const initialEditable = sub ? subToEditable(sub) : null;

  const syncFormFromSub = useCallback(() => {
    if (sub) setForm(subToEditable(sub));
  }, [sub]);

  const unlock = useCallback(() => {
    if (!canEdit) return;
    syncFormFromSub();
    setIsLocked(false);
    setSaveError(null);
    setSaveSuccess(false);
  }, [canEdit, syncFormFromSub]);

  const lock = useCallback(() => {
    setIsLocked(true);
    setForm(null);
    setSaveError(null);
  }, []);

  const hasChanges = useMemo(() => {
    if (!form || !initialEditable) return false;
    return EDITABLE_FIELD_KEYS.some((key) => {
      const a = form[key];
      const b = initialEditable[key];
      if (Array.isArray(a) && Array.isArray(b)) return JSON.stringify(a) !== JSON.stringify(b);
      return a !== b;
    });
  }, [form, initialEditable]);

  const buildPayload = useCallback((): Record<string, unknown> => {
    if (!form || !initialEditable) return {};
    const payload: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELD_KEYS) {
      const a = form[key];
      const b = initialEditable[key];
      const changed = Array.isArray(a) && Array.isArray(b)
        ? JSON.stringify(a) !== JSON.stringify(b)
        : a !== b;
      if (changed) payload[key] = a;
    }
    return payload;
  }, [form, initialEditable]);

  const planLookup = useMemo(
    () => new Map(plans.map((p) => [p.id, p.planName])),
    [plans]
  );

  const changesList = useMemo(() => {
    if (!form || !initialEditable) return [];
    return EDITABLE_FIELD_KEYS.filter((key) => {
      const a = form[key];
      const b = initialEditable[key];
      return Array.isArray(a) && Array.isArray(b)
        ? JSON.stringify(a) !== JSON.stringify(b)
        : a !== b;
    }).map((key) => ({
      key,
      label: EDITABLE_LABELS[key],
      old: formatEditableValue(key, initialEditable[key], planLookup),
      new: formatEditableValue(key, form[key], planLookup),
    }));
  }, [form, initialEditable, planLookup]);

  const handleSave = useCallback(async () => {
    if (!canEdit || !id) return;
    setSaveError(null);
    setPreviewError(null);
    setPreviewSql(null);
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const payload = buildPayload();
      const res = await fetch(`/api/subscriptions/${id}?preview=true`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
  }, [canEdit, id, buildPayload]);

  const handleConfirm = useCallback(async () => {
    if (!canEdit || !id) return;
    const payload = buildPayload();
    if (Object.keys(payload).length === 0) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = res.status === 403
          ? 'You are not authorized to edit subscriptions.'
          : res.status === 409
            ? 'This subscription was modified by someone else. Please reload and try again.'
            : Array.isArray(data?.errors) ? data.errors.join('. ') : data?.error || res.statusText;
        setSaveError(msg);
        return;
      }
      setSaveSuccess(true);
    } finally {
      setSaveLoading(false);
    }
  }, [canEdit, id, buildPayload]);

  const handleCloseModal = useCallback(() => {
    setPreviewOpen(false);
    if (saveSuccess) {
      setRefetchKey((k) => k + 1);
      setIsLocked(true);
      setForm(null);
    }
    setSaveSuccess(false);
    setSaveError(null);
  }, [saveSuccess]);

  useEffect(() => {
    if (!deleteModalOpen || !id) return;
    setDeletePreviewSql(null);
    setDeletePreviewError(null);
    setDeletePreviewLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/subscriptions/${id}?preview=true`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setDeletePreviewError(data?.error ?? res.statusText);
          return;
        }
        setDeletePreviewSql(data.sql ?? null);
      } catch {
        if (!cancelled) setDeletePreviewError('Failed to load query preview');
      } finally {
        if (!cancelled) setDeletePreviewLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [deleteModalOpen, id]);

  const handleCloseDeleteModal = useCallback(() => {
    if (deleteLoading) return;
    setDeleteModalOpen(false);
    setDeletePreviewSql(null);
    setDeletePreviewError(null);
    setDeleteError(null);
  }, [deleteLoading]);

  const handleConfirmDelete = useCallback(async () => {
    if (!canEdit || !id) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data?.error ?? res.statusText);
        return;
      }
      router.push('/subscriptions');
    } finally {
      setDeleteLoading(false);
    }
  }, [canEdit, id, router]);

  // --- Render ---

  if (loading) {
    return (
      <AppContainer>
        <Stack align="center" py="xl">
          <Loader />
        </Stack>
      </AppContainer>
    );
  }

  if (error || !data) {
    return (
      <AppContainer>
        <Alert icon={<IconAlertCircle size={16} />} title="Error loading subscription" color="red">
          {error || 'Subscription data not available'}
        </Alert>
      </AppContainer>
    );
  }

  const { subscription: subRow } = data;

  return (
    <AppContainer>
      <PageBreadcrumbs
        items={[
          { label: 'Subscriptions', href: '/subscriptions' },
          { label: `Subscription #${subRow.id}` },
        ]}
        rightSection={
          !editing ? (
            <Tooltip
              label="Not authorized to edit"
              disabled={canEdit}
              events={{ hover: true, focus: true, touch: true }}
            >
              <Button
                variant="light"
                size="xs"
                leftSection={<IconLockOpen size={14} />}
                onClick={unlock}
                disabled={!canEdit}
              >
                Unlock to edit
              </Button>
            </Tooltip>
          ) : undefined
        }
      />

      {/* Editing banner */}
      {editing && (
        <Alert
          icon={<IconPencil size={18} />}
          color="yellow"
          variant="filled"
          mb="md"
          styles={{ root: { borderRadius: 'var(--mantine-radius-md)' } }}
        >
          <Group justify="space-between" align="center" wrap="wrap">
            <Text fw={600} size="sm">
              Editing mode — changes are not saved until you confirm.
            </Text>
            <Group gap="xs">
              <Tooltip
                label="Cannot delete a subscription linked to Stripe"
                disabled={canDelete}
                events={{ hover: true, focus: true, touch: true }}
              >
                <span>
                  <Button
                    size="xs"
                    variant="white"
                    color="red"
                    onClick={() => { setDeleteError(null); setDeleteModalOpen(true); }}
                    disabled={!canDelete}
                    leftSection={<IconTrash size={14} />}
                  >
                    Delete subscription
                  </Button>
                </span>
              </Tooltip>
              <Button
                size="xs"
                variant="white"
                color="dark"
                onClick={lock}
              >
                <Group gap={4}>
                  <IconLock size={14} />
                  Discard &amp; lock
                </Group>
              </Button>
              <Button
                size="xs"
                color="green"
                onClick={handleSave}
                disabled={!hasChanges}
              >
                Save changes
              </Button>
            </Group>
          </Group>
        </Alert>
      )}


      {/* ───────── Read-only info ───────── */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="md">
        <Text fw={600} size="lg" mb="md">
          Subscription info
        </Text>
        <Table>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td fw={600}>ID</Table.Td>
              <Table.Td>{subRow.id}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>User</Table.Td>
              <Table.Td>
                {subRow.userId != null ? (
                  <UserHoverCard
                    userId={subRow.userId}
                    userName={subRow.username ?? `User ${subRow.userId}`}
                  />
                ) : (
                  '—'
                )}
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Organization</Table.Td>
              <Table.Td>
                {subRow.organizationId ? (
                  <Anchor component={Link} href={`/organizations/${subRow.organizationId}`}>
                    {subRow.organizationName ?? subRow.organizationId}
                  </Anchor>
                ) : (
                  '—'
                )}
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Start date</Table.Td>
              <Table.Td>
                {DateTime.fromISO(subRow.startDate).setZone(timezone).toLocaleString(DateTime.DATETIME_SHORT)}
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Stripe subscription</Table.Td>
              <Table.Td>
                <StripeSubscriptionId id={subRow.stripeSubscriptionId} />
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={600}>Created</Table.Td>
              <Table.Td>
                {subRow.createdAt
                  ? DateTime.fromISO(subRow.createdAt).setZone(timezone).toLocaleString(DateTime.DATETIME_SHORT)
                  : '—'}
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Paper>

      {/* ───────── Editable sections ───────── */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        {/* Subscription settings */}
        <Paper
          shadow="sm"
          p="md"
          radius="md"
          withBorder
          styles={editing ? { root: { outline: '2px solid var(--mantine-color-yellow-6)' } } : undefined}
        >
          <Text fw={600} size="lg" mb="md">
            Subscription settings
          </Text>
          <Table>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td fw={600}>Plan</Table.Td>
                <Table.Td>
                  {editing && form ? (
                    <Select
                      data={planOptions}
                      value={String(form.planId)}
                      onChange={(v) =>
                        v != null && setForm((f) => (f ? { ...f, planId: parseInt(String(v), 10) } : f))
                      }
                      allowDeselect={false}
                    />
                  ) : subRow.planId != null ? (
                    <Anchor component={Link} href={`/plans/${subRow.planId}`}>
                      {subRow.planName ?? `Plan ${subRow.planId}`}
                    </Anchor>
                  ) : (
                    '—'
                  )}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Status</Table.Td>
                <Table.Td>
                  {editing && form ? (
                    <Select
                      data={SUBSCRIPTION_STATUSES.map((s) => ({ value: s, label: s }))}
                      value={form.status}
                      onChange={(v) => v != null && setForm((f) => (f ? { ...f, status: v as typeof form.status } : f))}
                    />
                  ) : (
                    <Badge variant="light">{subRow.status}</Badge>
                  )}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Cancel at period end</Table.Td>
                <Table.Td>
                  {editing && form ? (
                    <SegmentedControl
                      size="xs"
                      data={[{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }]}
                      value={(form.cancelAtPeriodEnd ?? false) ? 'true' : 'false'}
                      onChange={(v) => setForm((f) => (f ? { ...f, cancelAtPeriodEnd: v === 'true' } : f))}
                    />
                  ) : (
                    subRow.cancelAtPeriodEnd == null ? '—' : subRow.cancelAtPeriodEnd ? 'Yes' : 'No'
                  )}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Enforce API usage limit</Table.Td>
                <Table.Td>
                  {editing && form ? (
                    <SegmentedControl
                      size="xs"
                      data={[{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }]}
                      value={form.enforceApiUsageLimit ? 'true' : 'false'}
                      onChange={(v) => setForm((f) => (f ? { ...f, enforceApiUsageLimit: v === 'true' } : f))}
                    />
                  ) : (
                    subRow.enforceApiUsageLimit ? 'Yes' : 'No'
                  )}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Billing period start</Table.Td>
                <Table.Td>
                  {editing && form ? (
                    <TextInput
                      type="datetime-local"
                      value={
                        form.currentBillingPeriodStart
                          ? DateTime.fromISO(form.currentBillingPeriodStart).setZone(timezone).toFormat("yyyy-MM-dd'T'HH:mm")
                          : ''
                      }
                      onChange={(e) =>
                        setForm((f) =>
                          f
                            ? {
                                ...f,
                                currentBillingPeriodStart: e.target.value
                                  ? DateTime.fromFormat(e.target.value, "yyyy-MM-dd'T'HH:mm", { zone: timezone }).toISO() ?? ''
                                  : '',
                              }
                            : f
                        )
                      }
                    />
                  ) : (
                    DateTime.fromISO(subRow.currentBillingPeriodStart)
                      .setZone(timezone)
                      .toLocaleString(DateTime.DATETIME_SHORT)
                  )}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td fw={600}>Billing period end</Table.Td>
                <Table.Td>
                  {editing && form ? (
                    <TextInput
                      type="datetime-local"
                      value={
                        form.currentBillingPeriodEnd
                          ? DateTime.fromISO(form.currentBillingPeriodEnd).setZone(timezone).toFormat("yyyy-MM-dd'T'HH:mm")
                          : ''
                      }
                      onChange={(e) =>
                        setForm((f) =>
                          f
                            ? {
                                ...f,
                                currentBillingPeriodEnd: e.target.value
                                  ? DateTime.fromFormat(e.target.value, "yyyy-MM-dd'T'HH:mm", { zone: timezone }).toISO()
                                  : null,
                              }
                            : f
                        )
                      }
                      placeholder="Leave empty for NULL"
                    />
                  ) : subRow.currentBillingPeriodEnd ? (
                    DateTime.fromISO(subRow.currentBillingPeriodEnd)
                      .setZone(timezone)
                      .toLocaleString(DateTime.DATETIME_SHORT)
                  ) : (
                    '—'
                  )}
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Paper>

        {/* Subscription overrides */}
        <Paper
          shadow="sm"
          p="md"
          radius="md"
          withBorder
          styles={editing ? { root: { outline: '2px solid var(--mantine-color-yellow-6)' } } : undefined}
        >
          <Group gap="xs" mb="md">
            <Text fw={600} size="lg">
              Subscription overrides
            </Text>
            <InfoHoverIcon tooltip="These values override the base plan defaults. Limits replace the plan value; entitlements are unioned with the plan's entitlements." />
          </Group>
          <Table>
            <Table.Tbody>
              {(
                [
                  ['apiRowsReturnedLimitOverride', 'API rows returned'],
                  ['apiRequestsLimitOverride', 'API requests'],
                  ['apiRowsPerResponseLimitOverride', 'API rows per response'],
                  ['alertsLimitOverride', 'Alerts'],
                  ['dashboardsLimitOverride', 'Dashboards'],
                  ['downloadsLimitOverride', 'Downloads'],
                  ['chartsLimitOverride', 'Charts'],
                  ['perSecondApiRateLimitOverride', 'Per second rate limit'],
                  ['perMinuteApiRateLimitOverride', 'Per minute rate limit'],
                  ['perHourApiRateLimitOverride', 'Per hour rate limit'],
                ] as const
              ).map(([key, label]) => {
                const allowUnlimited =
                  key === 'alertsLimitOverride' ||
                  key === 'dashboardsLimitOverride' ||
                  key === 'downloadsLimitOverride' ||
                  key === 'chartsLimitOverride' ||
                  key === 'apiRequestsLimitOverride';
                return (
                  <Table.Tr key={key}>
                    <Table.Td fw={600}>{label}</Table.Td>
                    <Table.Td>
                      {editing && form ? (
                        <NumberInput
                          value={form[key] ?? ''}
                          onChange={(v) => {
                            const num = v === '' || v == null ? null : typeof v === 'number' ? v : Number(v);
                            setForm((f) => (f ? { ...f, [key]: Number.isNaN(num) ? null : num } : f));
                          }}
                          min={allowUnlimited ? -1 : 0}
                          placeholder={allowUnlimited ? 'No override (use -1 for unlimited)' : 'No override'}
                          allowNegative={allowUnlimited}
                        />
                      ) : (
                        formatOverride(subRow[key])
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              <Table.Tr>
                <Table.Td fw={600}>Entitlement overrides</Table.Td>
                <Table.Td>
                  {editing && form ? (
                    <MultiSelect
                      data={entitlementOptions}
                      value={form.entitlementOverrides ?? []}
                      onChange={(v) => setForm((f) => (f ? { ...f, entitlementOverrides: v.length ? v : null } : f))}
                      placeholder="None"
                      clearable
                    />
                  ) : subRow.entitlementOverrides != null && subRow.entitlementOverrides.length > 0 ? (
                    subRow.entitlementOverrides.join(', ')
                  ) : (
                    '—'
                  )}
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Paper>
      </SimpleGrid>

      {/* Save bar at the bottom when editing with changes */}
      {editing && hasChanges && (
        <Group justify="flex-end" mt="md">
          <Button color="green" onClick={handleSave}>
            Save changes
          </Button>
        </Group>
      )}

      {/* Delete confirmation modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete subscription"
        closeOnClickOutside={!deleteLoading}
        closeOnEscape={!deleteLoading}
        size="xl"
      >
        <Stack>
          <Text size="sm">
            Delete subscription #{subRow.id}
            {subRow.username ? ` (${subRow.username})` : ''}
            {subRow.organizationName ? ` — ${subRow.organizationName}` : ''}? This cannot be undone.
          </Text>
          <Text size="sm" fw={500}>
            Query preview
          </Text>
          {deletePreviewLoading ? (
            <Group justify="center" py="sm">
              <Loader size="sm" />
            </Group>
          ) : deletePreviewError ? (
            <Alert color="red" variant="light">
              {deletePreviewError}
            </Alert>
          ) : deletePreviewSql ? (
            <CodeHighlight code={deletePreviewSql} language="sql" />
          ) : null}
          {deleteError && (
            <Alert color="red" variant="light">
              {deleteError}
            </Alert>
          )}
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={handleCloseDeleteModal} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleConfirmDelete}
              loading={deleteLoading}
              disabled={deletePreviewLoading || !!deletePreviewError}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Confirm modal */}
      <Modal
        opened={previewOpen}
        onClose={handleCloseModal}
        closeOnClickOutside={!saveLoading}
        closeOnEscape={!saveLoading}
        title={saveSuccess ? 'Update complete' : 'Confirm changes'}
        size="xl"
      >
        <Stack>
          {saveSuccess ? (
            <>
              <Stack align="center" gap="xs" py="lg">
                <IconCircleCheck size={48} color="var(--mantine-color-green-6)" />
                <Text fw={600} size="lg">Update successful</Text>
                <Text size="sm" c="dimmed">Close this dialog to see the updated subscription.</Text>
              </Stack>
              <Group justify="flex-end">
                <Button onClick={handleCloseModal}>Close</Button>
              </Group>
            </>
          ) : (
            <>
              <Text size="sm" fw={500}>
                Subscription #{subRow.id}
                {subRow.username ? ` — ${subRow.username}` : ''}
                {subRow.organizationName ? ` (${subRow.organizationName})` : ''}
              </Text>
              <Text size="sm" c="dimmed">
                Review the changes below.
              </Text>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Field</Table.Th>
                    <Table.Th>Old value</Table.Th>
                    <Table.Th>New value</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {changesList.map(({ key, label, old, new: newVal }) => (
                    <Table.Tr key={key}>
                      <Table.Td fw={500}>{label}</Table.Td>
                      <Table.Td c="red.7">{old}</Table.Td>
                      <Table.Td c="green.7">{newVal}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              {/* SQL query preview */}
              <Text size="sm" fw={500} mt="xs">
                Query preview
              </Text>
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

              {saveError && (
                <Alert color="red" variant="light">
                  {saveError}
                </Alert>
              )}

              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={handleCloseModal} disabled={saveLoading}>
                  Cancel
                </Button>
                <Button
                  color="green"
                  onClick={handleConfirm}
                  loading={saveLoading}
                  disabled={previewLoading || !!previewError}
                >
                  Confirm
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </AppContainer>
  );
}
