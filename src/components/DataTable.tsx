'use client';

import { useState, useMemo } from 'react';
import { Table, Group, Text } from '@mantine/core';
import { IconChevronUp, IconChevronDown } from '@tabler/icons-react';

export interface Column<T> {
  id: string;
  header: string | React.ReactNode;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right';
  sortValue?: (row: T) => string | number | boolean | null;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: string;
  defaultSort?: { column: string; direction: 'asc' | 'desc' };
  striped?: boolean;
  highlightOnHover?: boolean;
  emptyMessage?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  defaultSort,
  striped = true,
  highlightOnHover = true,
  emptyMessage,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(
    defaultSort?.column || null
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    defaultSort?.direction || 'asc'
  );

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;

    const column = columns.find((col) => col.id === sortColumn);
    if (!column || column.sortable === false) return data;

    return [...data].sort((a, b) => {
      const aValue = column.sortValue ? column.sortValue(a) : null;
      const bValue = column.sortValue ? column.sortValue(b) : null;

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Compare values - handle numeric comparison properly
      let comparison = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        // Try numeric comparison if both are numeric strings
        const aNum = Number(aValue);
        const bNum = Number(bValue);
        if (!isNaN(aNum) && !isNaN(bNum) && aValue === String(aNum) && bValue === String(bNum)) {
          comparison = aNum - bNum;
        } else {
          comparison = aValue.localeCompare(bValue);
        }
      } else {
        // Mixed types or other - use standard comparison
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
        else comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection, columns]);

  const handleSort = (columnId: string) => {
    const column = columns.find((col) => col.id === columnId);
    if (!column || column.sortable === false) return;

    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ columnId }: { columnId: string }) => {
    if (sortColumn !== columnId) return null;
    return sortDirection === 'asc' ? (
      <IconChevronUp size={14} />
    ) : (
      <IconChevronDown size={14} />
    );
  };

  return (
    <Table striped={striped} highlightOnHover={highlightOnHover}>
      <Table.Thead>
        <Table.Tr>
          {columns.map((column) => {
            const isSortable = column.sortable !== false;
            const align = column.align || 'left';

            return (
              <Table.Th
                key={column.id}
                ta={align}
                style={
                  isSortable
                    ? { cursor: 'pointer', userSelect: 'none' }
                    : undefined
                }
                onClick={() => isSortable && handleSort(column.id)}
              >
                {align === 'right' ? (
                  <Group gap={4} justify="flex-end">
                    {column.header}
                    {isSortable && <SortIcon columnId={column.id} />}
                  </Group>
                ) : (
                  <Group gap={4}>
                    {column.header}
                    {isSortable && <SortIcon columnId={column.id} />}
                  </Group>
                )}
              </Table.Th>
            );
          })}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {sortedData.length === 0 ? (
          <Table.Tr>
            <Table.Td colSpan={columns.length}>
              <Text c="dimmed" ta="center">
                {emptyMessage || 'No data available'}
              </Text>
            </Table.Td>
          </Table.Tr>
        ) : (
          sortedData.map((row) => (
            <Table.Tr key={row[keyField]}>
              {columns.map((column) => (
                <Table.Td key={column.id} ta={column.align || 'left'}>
                  {column.render(row)}
                </Table.Td>
              ))}
            </Table.Tr>
          ))
        )}
      </Table.Tbody>
    </Table>
  );
}

