'use client';

import { ReactNode } from 'react';
import { Breadcrumbs, Anchor, Box, Group } from '@mantine/core';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageBreadcrumbsProps {
  items: BreadcrumbItem[];
  /** Optional content rendered on the right side of the breadcrumb row (e.g. action buttons). */
  rightSection?: ReactNode;
}

/** One-line min height so layout doesn't shift between home (1 crumb) and detail (2+ crumbs). */
const BREADCRUMB_MIN_HEIGHT = 34;

/**
 * Renders a breadcrumb trail that also serves as the page header.
 * The last item is rendered bolder/larger as the current page title.
 * Optional rightSection places tools/actions on the right side of the row.
 */
export function PageBreadcrumbs({ items, rightSection }: PageBreadcrumbsProps) {
  if (items.length === 0) return <Box style={{ minHeight: BREADCRUMB_MIN_HEIGHT }} mb="sm" />;

  return (
    <Group justify="space-between" align="center" style={{ minHeight: BREADCRUMB_MIN_HEIGHT, flexShrink: 0 }} mb="sm" wrap="nowrap">
      <Breadcrumbs separator="/" fz="xl" separatorMargin={"5"}>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          if (item.href && !isLast) {
            return (
              <Anchor key={i} component={Link} href={item.href} fz="xl" c="dimmed">
                {item.label}
              </Anchor>
            );
          }
          return (
            <span
              key={i}
              style={{
                fontWeight: 600,
                color: isLast ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)',
              }}
            >
              {item.label}
            </span>
          );
        })}
      </Breadcrumbs>
      {rightSection && <Group gap="md" wrap="nowrap">{rightSection}</Group>}
    </Group>
  );
}
