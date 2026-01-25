'use client';

import { forwardRef } from 'react';
import { Paper, Text, Box } from '@mantine/core';
import { BarChart } from '@mantine/charts';

interface DomainDistributionData {
  usersBucket: number;
  domainCount: number;
}

interface DomainDistributionChartProps {
  title: string;
  subtitle?: string;
  data: DomainDistributionData[];
  height?: number;
}

export const DomainDistributionChart = forwardRef<HTMLDivElement, DomainDistributionChartProps>(
  function DomainDistributionChart({ title, subtitle, data, height = 300 }, ref) {
    const chartData = data.map((point) => ({
      bucket: point.usersBucket === 25 ? '25+' : String(point.usersBucket),
      'Domain Count': point.domainCount,
    }));

    return (
      <Paper shadow="sm" p="md" radius="md" withBorder ref={ref}>
        <Text fw={600} size="lg" mb="xs">
          {title}
        </Text>
        {subtitle && (
          <Text size="sm" c="dimmed" mb="md">
            {subtitle}
          </Text>
        )}
        <Box>
          <BarChart
            h={height}
            data={chartData}
            dataKey="bucket"
            series={[{ name: 'Domain Count', color: 'blue.6' }]}
            xAxisLabel="Users per Domain"
            yAxisLabel="Number of Domains"
            withBarValueLabel
          />
        </Box>
      </Paper>
    );
  }
);
