'use client';

import { Breadcrumbs, Anchor, Box } from '@mantine/core';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageBreadcrumbsProps {
  items: BreadcrumbItem[];
}

/** One-line min height so layout doesn't shift between home (1 crumb) and detail (2+ crumbs). */
const BREADCRUMB_MIN_HEIGHT = 28;

/**
 * Renders a breadcrumb trail. Items with href are links; the last item is typically current page (no href).
 * Wrapper reserves consistent height to prevent layout shift across pages.
 */
export function PageBreadcrumbs({ items }: PageBreadcrumbsProps) {
  if (items.length === 0) return <Box style={{ minHeight: BREADCRUMB_MIN_HEIGHT }} mb="md" />;

  return (
    <Box style={{ minHeight: BREADCRUMB_MIN_HEIGHT, flexShrink: 0 }} mb="md">
      <Breadcrumbs separator="/">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          if (item.href && !isLast) {
            return (
              <Anchor key={i} component={Link} href={item.href} size="sm" c="dimmed">
                {item.label}
              </Anchor>
            );
          }
          return (
            <span key={i} style={{ fontSize: 'var(--mantine-font-size-sm)', color: 'var(--mantine-color-dimmed)' }}>
              {item.label}
            </span>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}
