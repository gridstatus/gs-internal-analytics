'use client';

import { forwardRef } from 'react';
import { Paper, Text, Box } from '@mantine/core';
import { CompositeChart, BarChart } from '@mantine/charts';
import { useFilter } from '@/contexts/FilterContext';
import { DateTime } from 'luxon';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartDataPoint = { month: string } & Record<string, any>;

interface TimeSeriesChartProps {
  title: string;
  subtitle?: string;
  data: ChartDataPoint[];
  dataKey: string;
  showMoM?: boolean;
  color?: string;
  height?: number;
  chartType?: 'line' | 'bar';
  stacked?: boolean;
  stackedSeries?: Array<{ name: string; color: string; label: string }>;
}

export const TimeSeriesChart = forwardRef<HTMLDivElement, TimeSeriesChartProps>(
  function TimeSeriesChart(
    { title, subtitle, data, dataKey, showMoM = true, color = 'blue.6', height = 300, chartType = 'line', stacked = false, stackedSeries = [] },
    ref
  ) {
    const { timezone } = useFilter();
    // Calculate MoM change for each data point
    const chartData = data.map((point, index) => {
      const currentValue = Number(point[dataKey]) || 0;
      const previousValue = index > 0 ? Number(data[index - 1][dataKey]) || 0 : 0;
      let momChange =
        index > 0 && previousValue !== 0
          ? ((currentValue - previousValue) / previousValue) * 100
          : 0;
      
      // Round to 1 decimal place and cap at ±100%
      momChange = Math.round(momChange * 10) / 10;
      momChange = Math.max(-100, Math.min(100, momChange));

      return {
        ...point,
        [dataKey]: currentValue,
        momChange,
      };
    });

    const formatXAxisLabel = (value: string) => {
      // Check if it's an ISO datetime string (hourly)
      if (value.includes('T')) {
        return DateTime.fromISO(value).setZone(timezone).toLocaleString({
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }

      const parts = value.split('-');
      if (parts.length === 3) {
        // Daily format: YYYY-MM-DD
        // Use UTC to avoid shifts for calendar dates
        return DateTime.fromISO(value, { zone: 'utc' }).toLocaleString({
          month: 'short',
          day: 'numeric',
        });
      }

      // Monthly format: YYYY-MM
      // Use UTC to avoid shifts for calendar dates
      return DateTime.fromISO(value, { zone: 'utc' }).toLocaleString({
        month: 'short',
        year: '2-digit',
      });
    };

    const chartDataWithLabel = chartData.map((point) => ({
      ...point,
      label: formatXAxisLabel(String(point.month)),
    }));

    const xAxisProps = {
      tickFormatter: (value: string) => value,
    };

    if (chartType === 'bar') {
      const series = stacked && stackedSeries.length > 0
        ? stackedSeries.map(s => ({ name: s.name, color: s.color, label: s.label || s.name, stackId: 'stack' }))
        : [{ name: dataKey, color }];
      
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
              data={chartDataWithLabel}
              dataKey="label"
              series={series}
              xAxisProps={xAxisProps}
              yAxisProps={{ 
                domain: [0, 'auto'],
                tickFormatter: (value: number) => value.toLocaleString()
              }}
              withLegend={stacked && stackedSeries.length > 0}
              legendProps={stacked && stackedSeries.length > 0 ? { verticalAlign: 'bottom', height: 40 } : undefined}
            />
          </Box>
        </Paper>
      );
    }

    const series = showMoM
      ? [
          { name: dataKey, type: 'line' as const, color },
          { name: 'momChange', type: 'bar' as const, color: 'gray.4', yAxisId: 'right' },
        ]
      : [{ name: dataKey, type: 'line' as const, color }];

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
          <CompositeChart
            h={height}
            data={chartDataWithLabel}
            dataKey="label"
            series={series}
            curveType="linear"
            withLegend
            legendProps={{ verticalAlign: 'bottom', height: 40 }}
            xAxisProps={xAxisProps}
            yAxisProps={{ 
              domain: [0, 'auto'],
              tickFormatter: (value: number) => value.toLocaleString()
            }}
            withRightYAxis={showMoM}
            rightYAxisLabel={showMoM ? 'MoM %' : undefined}
            rightYAxisProps={showMoM ? {
              domain: [-100, 100],
              tickFormatter: (value: number) => {
                // Format with 1 decimal place
                return `${value.toFixed(1)}%`;
              },
              width: 70, // Constrain width to prevent large numbers from taking too much space
            } : undefined}
          />
        </Box>
      </Paper>
    );
  }
);
