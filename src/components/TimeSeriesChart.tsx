'use client';

import { forwardRef } from 'react';
import { Paper, Text, Box } from '@mantine/core';
import { CompositeChart, BarChart } from '@mantine/charts';

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
}

export const TimeSeriesChart = forwardRef<HTMLDivElement, TimeSeriesChartProps>(
  function TimeSeriesChart(
    { title, subtitle, data, dataKey, showMoM = true, color = 'blue.6', height = 300, chartType = 'line' },
    ref
  ) {
    // Calculate MoM change for each data point
    const chartData = data.map((point, index) => {
      const currentValue = Number(point[dataKey]) || 0;
      const previousValue = index > 0 ? Number(data[index - 1][dataKey]) || 0 : 0;
      const momChange =
        index > 0 && previousValue !== 0
          ? Math.round(((currentValue - previousValue) / previousValue) * 100)
          : 0;

      return {
        ...point,
        [dataKey]: currentValue,
        momChange,
      };
    });

    const xAxisProps = {
      tickFormatter: (value: string) => {
        // Check if it's an ISO datetime string (hourly)
        if (value.includes('T')) {
          const date = new Date(value);
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthName = monthNames[date.getUTCMonth()];
          const day = date.getUTCDate();
          const hour = date.getUTCHours();
          return `${monthName} ${day}, ${hour}:00`;
        }
        
        const parts = value.split('-');
        if (parts.length === 3) {
          // Daily format: YYYY-MM-DD
          const [year, month, day] = parts;
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthName = monthNames[parseInt(month, 10) - 1];
          return `${monthName} ${parseInt(day, 10)}`;
        } else {
          // Monthly format: YYYY-MM
          const [year, month] = parts;
          return `${month}/${year.slice(2)}`;
        }
      },
    };

    if (chartType === 'bar') {
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
              dataKey="month"
              series={[{ name: dataKey, color }]}
              xAxisProps={xAxisProps}
              yAxisProps={{ domain: [0, 'auto'] }}
            />
          </Box>
        </Paper>
      );
    }

    const series = showMoM
      ? [
          { name: 'momChange', type: 'bar' as const, color: 'gray.4' },
          { name: dataKey, type: 'line' as const, color },
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
            data={chartData}
            dataKey="month"
            series={series}
            curveType="linear"
            withLegend
            legendProps={{ verticalAlign: 'bottom', height: 40 }}
            xAxisProps={xAxisProps}
            yAxisProps={{ domain: [0, 'auto'] }}
          />
        </Box>
      </Paper>
    );
  }
);
