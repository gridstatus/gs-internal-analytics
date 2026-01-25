'use client';

import { Paper, Text, Group, ThemeIcon } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';
import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string | ReactNode;
  trend?: number;
  trendLabel?: string;
}

export function MetricCard({ title, value, subtitle, trend, trendLabel }: MetricCardProps) {
  const getTrendIcon = () => {
    if (trend === undefined) return null;
    if (trend > 0) return <IconTrendingUp size={16} />;
    if (trend < 0) return <IconTrendingDown size={16} />;
    return <IconMinus size={16} />;
  };

  const getTrendColor = () => {
    if (trend === undefined) return 'gray';
    if (trend > 0) return 'green';
    if (trend < 0) return 'red';
    return 'gray';
  };

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Text size="sm" c="dimmed" fw={500}>
        {title}
      </Text>
      <Group justify="space-between" mt="xs">
        <Text size="xl" fw={700}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
        {trend !== undefined && (
          <Group gap="xs">
            <ThemeIcon color={getTrendColor()} variant="light" size="sm">
              {getTrendIcon()}
            </ThemeIcon>
            <Text size="sm" c={getTrendColor()}>
              {trend > 0 ? '+' : ''}
              {trend}%
              {trendLabel && ` ${trendLabel}`}
            </Text>
          </Group>
        )}
      </Group>
      {subtitle && (
        <div style={{ marginTop: '8px' }}>
          {typeof subtitle === 'string' ? (
            <Text size="xs" c="dimmed">
              {subtitle}
            </Text>
          ) : (
            subtitle
          )}
        </div>
      )}
    </Paper>
  );
}
