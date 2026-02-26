'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Group,
  Modal,
  Paper,
  Progress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useQueryState, parseAsString, parseAsStringLiteral } from 'nuqs';
import { CompositeChart } from '@mantine/charts';
import { DateTime } from 'luxon';
import { AppContainer } from '@/components/AppContainer';
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs';
import { DataTable, Column } from '@/components/DataTable';
import { UserHoverCard } from '@/components/UserHoverCard';
import { useUserOrgLookup } from '@/hooks/useUserOrgLookup';
import type { ApiUsageLookupMetaResponse, ApiUsageLookupSegmentResponse } from '@/lib/api-types';
import { DEFAULT_CHART_LEGEND_PROPS } from '@/lib/chart-defaults';

const ID_TYPE_OPTIONS = ['user', 'organization'] as const;
const PERIOD_OPTIONS = ['week', 'month'] as const;
const RANGE_OPTIONS = ['1', '3', '6', '12', 'all'] as const;

interface SegmentBoundary {
  start: string;
  end: string;
  label: string;
}

interface ResultRow {
  period: string;
  requestCount: number;
  totalRows: number;
  distinctUsers: number;
  userIds: number[];
}

function buildSegmentBoundaries(
  period: 'week' | 'month',
  range: string,
  earliestDate: string | null
): SegmentBoundary[] {
  const now = DateTime.utc();
  let startDt: DateTime;
  if (range === 'all' && earliestDate) {
    startDt = DateTime.fromISO(earliestDate, { zone: 'utc' }).startOf(period === 'month' ? 'month' : 'week');
  } else {
    const months = range === 'all' ? 120 : parseInt(range, 10);
    startDt = now.minus({ months }).startOf(period === 'month' ? 'month' : 'week');
  }
  const endDt = now;
  const segments: SegmentBoundary[] = [];
  let cursor = startDt;

  while (cursor < endDt) {
    const segmentEnd = period === 'month'
      ? cursor.plus({ months: 1 })
      : cursor.plus({ weeks: 1 });
    const segmentEndCapped = segmentEnd > endDt ? endDt : segmentEnd;
    segments.push({
      start: cursor.toISO()!,
      end: segmentEndCapped.toISO()!,
      label: period === 'month' ? cursor.toFormat('yyyy-MM') : cursor.toFormat('yyyy-MM-dd'),
    });
    cursor = segmentEnd;
  }

  return segments.reverse();
}

function compactNumber(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

let patternIdCounter = 0;
function makePartialAwareShape(lastIndex: number) {
  return (props: unknown) => {
    const p = props as Record<string, number>;
    const color = String(p.fill);
    if (p.index !== lastIndex) {
      return <rect x={p.x} y={p.y} width={p.width} height={p.height} fill={color} />;
    }
    const id = `partial-hatch-${patternIdCounter++}`;
    return (
      <g>
        <defs>
          <pattern id={id} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={8} stroke={color} strokeWidth={4} />
          </pattern>
        </defs>
        <rect x={p.x} y={p.y} width={p.width} height={p.height} fill={`url(#${id})`} />
        <line x1={p.x} y1={p.y} x2={p.x + p.width} y2={p.y} stroke={color} strokeWidth={1.5} />
        <line x1={p.x} y1={p.y} x2={p.x} y2={p.y + p.height} stroke={color} strokeWidth={1.5} />
        <line x1={p.x + p.width} y1={p.y} x2={p.x + p.width} y2={p.y + p.height} stroke={color} strokeWidth={1.5} />
      </g>
    );
  };
}

export function ApiUsageLookupView() {
  const [idType, setIdType] = useQueryState(
    'idType',
    parseAsStringLiteral(ID_TYPE_OPTIONS).withDefault('user')
  );
  const [id, setId] = useQueryState('id', parseAsString.withDefault(''));
  const [period, setPeriod] = useQueryState(
    'period',
    parseAsStringLiteral(PERIOD_OPTIONS).withDefault('month')
  );
  const [range, setRange] = useQueryState(
    'range',
    parseAsStringLiteral(RANGE_OPTIONS).withDefault('12')
  );

  const userId = idType === 'user' && id ? parseInt(id, 10) : null;
  const organizationId = idType === 'organization' && id ? id : null;

  const { userSearch, setUserSearch, orgSearch, setOrgSearch, userOptions, orgOptions } =
    useUserOrgLookup(userId, organizationId);

  const handleIdTypeChange = useCallback(
    (v: string) => {
      setIdType(v as 'user' | 'organization');
      setId('');
    },
    [setIdType, setId]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ completed: number; total: number; startTime: number } | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const runStartTimeRef = useRef<number>(0);

  const runLookup = useCallback(async () => {
    const trimmedId = id.trim();
    if (!trimmedId) return;

    setError(null);
    setResults([]);
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setLoading(true);

    try {
      let earliestDate: string | null = null;
      if (range === 'all') {
        const metaUrl = `/api/api-usage/lookup?mode=meta&idType=${encodeURIComponent(idType)}&id=${encodeURIComponent(trimmedId)}`;
        const metaRes = await fetch(metaUrl, { signal });
        if (!metaRes.ok) {
          const err = await metaRes.json().catch(() => ({}));
          throw new Error(err?.error || metaRes.statusText);
        }
        const meta: ApiUsageLookupMetaResponse = await metaRes.json();
        earliestDate = meta.earliestDate;
        if (!earliestDate) {
          setResults([]);
          setLoading(false);
          setProgress(null);
          return;
        }
      }

      const segments = buildSegmentBoundaries(period, range, earliestDate);
      if (segments.length === 0) {
        setLoading(false);
        setProgress(null);
        return;
      }

      runStartTimeRef.current = Date.now();
      setProgress({ completed: 0, total: segments.length, startTime: runStartTimeRef.current });
      const accumulated: ResultRow[] = [];

      for (let i = 0; i < segments.length; i++) {
        if (signal.aborted) break;

        const seg = segments[i];
        const segmentUrl = `/api/api-usage/lookup?idType=${encodeURIComponent(idType)}&id=${encodeURIComponent(trimmedId)}&start=${encodeURIComponent(seg.start)}&end=${encodeURIComponent(seg.end)}`;
        const res = await fetch(segmentUrl, { signal });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = `Segment ${seg.label}: ${err?.error || res.statusText}`;
          setError(msg);
          break;
        }
        const data: ApiUsageLookupSegmentResponse = await res.json();
        accumulated.push({
          period: seg.label,
          requestCount: data.requestCount,
          totalRows: data.totalRows,
          distinctUsers: data.distinctUsers,
          userIds: data.userIds,
        });

        setProgress({ completed: i + 1, total: segments.length, startTime: runStartTimeRef.current });
        setResults([...accumulated]);
      }

      setResults(accumulated);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message);
      }
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [id, idType, period, range]);

  const cancelRun = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  const isOrg = idType === 'organization';
  const [modalRow, setModalRow] = useState<ResultRow | null>(null);

  const columns: Column<ResultRow>[] = useMemo(() => {
    const cols: Column<ResultRow>[] = [
      { id: 'period', header: 'Period', align: 'left', render: (row) => row.period, sortValue: (row) => row.period },
      {
        id: 'requestCount',
        header: 'Request count',
        align: 'right',
        render: (row) => row.requestCount.toLocaleString(),
        sortValue: (row) => row.requestCount,
      },
      {
        id: 'totalRows',
        header: 'Total rows',
        align: 'right',
        render: (row) => row.totalRows.toLocaleString(),
        sortValue: (row) => row.totalRows,
      },
    ];
    if (isOrg) {
      cols.push({
        id: 'distinctUsers',
        header: 'Distinct users',
        align: 'right',
        render: (row) => row.distinctUsers.toLocaleString(),
        sortValue: (row) => row.distinctUsers,
      });
    }
    return cols;
  }, [isOrg]);

  const stats = useMemo(() => {
    if (results.length === 0) return null;
    const complete = results.length > 1 ? results.slice(1) : results;
    const requests = complete.map((r) => r.requestCount);
    const rows = complete.map((r) => r.totalRows);
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const buildStats = (arr: number[]) => ({
      total: sum(arr),
      min: Math.min(...arr),
      max: Math.max(...arr),
      avg: sum(arr) / arr.length,
      median: median(arr),
    });
    return {
      requests: buildStats(requests),
      rows: buildStats(rows),
    };
  }, [results]);

  const progressInfo = progress
    ? (() => {
        const elapsed = (Date.now() - progress.startTime) / 1000;
        const avgPerSegment = progress.completed > 0 ? elapsed / progress.completed : 0;
        const remaining = progress.total - progress.completed;
        const etaSec = Math.round(avgPerSegment * remaining);
        return { ...progress, etaSec };
      })()
    : null;

  const chartData = useMemo(() => {
    if (!stats || results.length === 0) return [];
    const reversed = [...results].reverse();
    return reversed.map((r) => ({
      period: r.period,
      requestCount: r.requestCount,
      mean: stats.requests.avg,
    }));
  }, [results, stats]);

  const rowsChartData = useMemo(() => {
    if (!stats || results.length === 0) return [];
    const reversed = [...results].reverse();
    return reversed.map((r) => ({
      period: r.period,
      totalRows: r.totalRows,
      mean: stats.rows.avg,
    }));
  }, [results, stats]);

  return (
    <AppContainer>
      <PageBreadcrumbs items={[{ label: 'API Usage', href: '/api-usage' }, { label: 'Usage Lookup' }]} />

      <Stack gap="md">
        <Group gap="sm" wrap="wrap" align="flex-end">
          <SegmentedControl
            size="xs"
            value={idType}
            onChange={handleIdTypeChange}
            data={[
              { label: 'User', value: 'user' },
              { label: 'Organization', value: 'organization' },
            ]}
          />
          {idType === 'user' ? (
            <Select
              searchable
              clearable
              placeholder="Search by username or name..."
              data={userOptions}
              value={userId != null ? String(userId) : null}
              onSearchChange={setUserSearch}
              searchValue={userSearch}
              onChange={(v) => setId(v ?? '')}
              nothingFoundMessage="Type to search users"
              size="xs"
              style={{ minWidth: 260, flex: 1, maxWidth: 360 }}
            />
          ) : (
            <Select
              searchable
              clearable
              placeholder="Search organizations..."
              data={orgOptions}
              value={organizationId ?? null}
              onSearchChange={setOrgSearch}
              searchValue={orgSearch}
              onChange={(v) => setId(v ?? '')}
              nothingFoundMessage="Type to search organizations"
              size="xs"
              style={{ minWidth: 260, flex: 1, maxWidth: 360 }}
            />
          )}
          <SegmentedControl
            size="xs"
            value={period}
            onChange={(v) => setPeriod(v as 'week' | 'month')}
            data={[
              { label: 'Week', value: 'week' },
              { label: 'Month', value: 'month' },
            ]}
          />
          <SegmentedControl
            size="xs"
            value={range}
            onChange={(v) => setRange(v as typeof RANGE_OPTIONS[number])}
            data={[
              { label: '1m', value: '1' },
              { label: '3m', value: '3' },
              { label: '6m', value: '6' },
              { label: '12m', value: '12' },
              { label: 'All', value: 'all' },
            ]}
          />
          <Button
            size="xs"
            onClick={runLookup}
            disabled={loading || (userId == null && !organizationId)}
            variant="filled"
          >
            {loading ? 'Running…' : 'Run'}
          </Button>
        </Group>

        {progressInfo && (
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Text fw={600} size="lg" mb="xs">
              Progress
            </Text>
            <Progress value={(progressInfo.completed / progressInfo.total) * 100} size="lg" mb="sm" />
            <Text size="sm" c="dimmed">
              Completed {progressInfo.completed} of {progressInfo.total} segments
              {progressInfo.etaSec > 0 && ` · ~${progressInfo.etaSec}s remaining`}
            </Text>
            <Button variant="light" color="red" size="xs" mt="sm" onClick={cancelRun}>
              Cancel
            </Button>
          </Paper>
        )}

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
            {error}
          </Alert>
        )}

        {!loading && results.length > 0 && (
          <>
            {stats && chartData.length > 0 && (
              <Table
                horizontalSpacing="md"
                verticalSpacing={6}
                style={{ maxWidth: 600 }}
              >
                <Table.Thead>
                  <Table.Tr style={{ borderBottom: '2px solid var(--mantine-color-default-border)' }}>
                    <Table.Th style={{ width: 90 }}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                        Per {period}
                      </Text>
                    </Table.Th>
                    <Table.Th ta="right"><Text size="xs" c="dimmed" tt="uppercase" fw={600}>Total</Text></Table.Th>
                    <Table.Th ta="right"><Text size="xs" c="dimmed" tt="uppercase" fw={600}>Min</Text></Table.Th>
                    <Table.Th ta="right"><Text size="xs" c="dimmed" tt="uppercase" fw={600}>Max</Text></Table.Th>
                    <Table.Th ta="right"><Text size="xs" c="dimmed" tt="uppercase" fw={600}>Avg</Text></Table.Th>
                    <Table.Th ta="right"><Text size="xs" c="dimmed" tt="uppercase" fw={600}>Median</Text></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>
                      <Text size="sm" fw={600}>Requests</Text>
                    </Table.Td>
                    <Table.Td ta="right"><Text size="sm" fw={700}>{stats.requests.total.toLocaleString()}</Text></Table.Td>
                    <Table.Td ta="right"><Text size="sm">{stats.requests.min.toLocaleString()}</Text></Table.Td>
                    <Table.Td ta="right"><Text size="sm">{stats.requests.max.toLocaleString()}</Text></Table.Td>
                    <Table.Td ta="right"><Text size="sm">{Math.round(stats.requests.avg).toLocaleString()}</Text></Table.Td>
                    <Table.Td ta="right"><Text size="sm">{Math.round(stats.requests.median).toLocaleString()}</Text></Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Text size="sm" fw={600}>Rows</Text>
                    </Table.Td>
                    <Table.Td ta="right"><Text size="sm" fw={700}>{stats.rows.total.toLocaleString()}</Text></Table.Td>
                    <Table.Td ta="right"><Text size="sm">{stats.rows.min.toLocaleString()}</Text></Table.Td>
                    <Table.Td ta="right"><Text size="sm">{stats.rows.max.toLocaleString()}</Text></Table.Td>
                    <Table.Td ta="right"><Text size="sm">{Math.round(stats.rows.avg).toLocaleString()}</Text></Table.Td>
                    <Table.Td ta="right"><Text size="sm">{Math.round(stats.rows.median).toLocaleString()}</Text></Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            )}

            {chartData.length > 0 && (
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Paper shadow="sm" p="md" radius="md" withBorder>
                  <Text fw={600} size="lg" mb="md">
                    Requests by period
                  </Text>
                  <CompositeChart
                    h={300}
                    data={chartData}
                    dataKey="period"
                    series={[
                      { name: 'requestCount', type: 'bar', color: 'blue.6', label: 'Request count' },
                      { name: 'mean', type: 'line', color: 'gray.6', strokeDasharray: '5 5', label: 'Mean' },
                    ]}
                    withDots={false}
                    barProps={() => ({
                      shape: makePartialAwareShape(chartData.length - 1),
                    })}
                    curveType="linear"
                    xAxisProps={{ tickFormatter: (v: string) => v === chartData[chartData.length - 1]?.period ? `${v}*` : v }}
                    yAxisProps={{
                      domain: [0, 'auto'],
                      tickFormatter: (value: number) => value.toLocaleString(),
                    }}
                    withLegend
                    legendProps={DEFAULT_CHART_LEGEND_PROPS}
                  />
                </Paper>
                <Paper shadow="sm" p="md" radius="md" withBorder>
                  <Text fw={600} size="lg" mb="md">
                    Rows by period
                  </Text>
                  <CompositeChart
                    h={300}
                    data={rowsChartData}
                    dataKey="period"
                    series={[
                      { name: 'totalRows', type: 'bar', color: 'teal.6', label: 'Total rows' },
                      { name: 'mean', type: 'line', color: 'gray.6', strokeDasharray: '5 5', label: 'Mean' },
                    ]}
                    withDots={false}
                    barProps={() => ({
                      shape: makePartialAwareShape(rowsChartData.length - 1),
                    })}
                    curveType="linear"
                    xAxisProps={{ tickFormatter: (v: string) => v === rowsChartData[rowsChartData.length - 1]?.period ? `${v}*` : v }}
                    yAxisProps={{
                      domain: [0, 'auto'],
                      tickFormatter: compactNumber,
                      width: 55,
                    }}
                    withLegend
                    legendProps={DEFAULT_CHART_LEGEND_PROPS}
                  />
                </Paper>
              </SimpleGrid>
            )}

            <Paper shadow="sm" p="md" radius="md" withBorder>
              <Text fw={600} size="lg" mb="md">
                Results
              </Text>
              <DataTable
                data={results}
                columns={columns}
                keyField="period"
                defaultSort={{ column: 'period', direction: 'desc' }}
                onRowClick={isOrg ? (row) => setModalRow(row) : undefined}
              />
            </Paper>
          </>
        )}
      </Stack>

      <Modal
        title={modalRow ? `Users — ${modalRow.period}` : 'Users'}
        opened={modalRow !== null}
        onClose={() => setModalRow(null)}
        size="sm"
      >
        {modalRow && modalRow.userIds.length > 0 ? (
          <Stack gap="xs">
            {modalRow.userIds.map((uid) => (
              <UserHoverCard key={uid} userId={uid} userName={`User #${uid}`} size="sm" />
            ))}
          </Stack>
        ) : (
          <Text c="dimmed" size="sm">No users in this period.</Text>
        )}
      </Modal>
    </AppContainer>
  );
}
