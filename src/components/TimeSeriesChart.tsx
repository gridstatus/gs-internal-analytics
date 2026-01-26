'use client';

import { forwardRef } from 'react';
import { Paper, Text, Box } from '@mantine/core';
import { CompositeChart, BarChart } from '@mantine/charts';
import { useFilter } from '@/contexts/FilterContext';
import { DateTime } from 'luxon';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartDataPoint = { month: string } & Record<string, any>;

// Helper function to convert camelCase to human-readable Title Case
function toHumanReadableLabel(key: string): string {
  // Handle special cases
  const specialCases: Record<string, string> = {
    'totalUsers': 'Total Users',
    'newUsers': 'New Users',
    'totalApiRequests': 'Total API Requests',
    'totalApiRowsReturned': 'Total API Rows Returned',
    'uniqueApiUsers': 'Unique API Users',
    'activeUsers': 'Active Users',
    'totalCorpUsers': 'Total Corporate Users',
    'corpDomains': 'Corporate Domains',
    'uniqueVisitors': 'Unique Visitors',
    'uniqueVisitorsLoggedIn': 'Logged-in Visitors',
    'uniqueHomefeedVisitors': 'Homefeed Visitors',
    'uniqueHomefeedVisitorsLoggedIn': 'Logged-in Homefeed Visitors',
    'uniqueHomefeedVisitorsAnon': 'Anonymous Homefeed Visitors',
    'engagements': 'Engagements',
    'impressions': 'Impressions',
    'reactions': 'Reactions',
    'posts': 'Posts',
    'hits': 'Hits',
    'teams': 'Teams',
  };
  
  if (specialCases[key]) {
    return specialCases[key];
  }
  
  // Convert camelCase to Title Case
  return key
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
}

interface TimeSeriesChartProps {
  title: string;
  subtitle?: string;
  data: ChartDataPoint[];
  dataKey: string;
  color?: string;
  height?: number;
  chartType?: 'line' | 'bar';
  stacked?: boolean;
  stackedSeries?: Array<{ name: string; color: string; label: string }>;
  showTrendline?: boolean;
}

export const TimeSeriesChart = forwardRef<HTMLDivElement, TimeSeriesChartProps>(
  function TimeSeriesChart(
    { title, subtitle, data, dataKey, color = 'blue.6', height = 300, chartType = 'line', stacked = false, stackedSeries = [], showTrendline = false },
    ref
  ) {
    const { timezone } = useFilter();
    // Map data points
    const chartData = data.map((point) => {
      const currentValue = Number(point[dataKey]) || 0;
      return {
        ...point,
        [dataKey]: currentValue,
      };
    });

    // Calculate OLS trendline with floating intercept
    // Uses standard OLS: y = mx + b where m is slope and b is intercept
    // slope = Σ((x - mean_x) * (y - mean_y)) / Σ((x - mean_x)²)
    // intercept = mean_y - slope * mean_x
    let trendlineSlope = 0;
    let trendlineIntercept = 0;
    if (showTrendline && chartData.length > 0) {
      const n = chartData.length;
      let sumX = 0;
      let sumY = 0;
      const values: Array<{ x: number; y: number }> = [];
      
      chartData.forEach((point, index) => {
        const x = index;
        const y = Number(point[dataKey]) || 0;
        sumX += x;
        sumY += y;
        values.push({ x, y });
      });
      
      const meanX = sumX / n;
      const meanY = sumY / n;
      
      let sumXYDiff = 0;
      let sumXDiffSquared = 0;
      values.forEach(({ x, y }) => {
        const xDiff = x - meanX;
        const yDiff = y - meanY;
        sumXYDiff += xDiff * yDiff;
        sumXDiffSquared += xDiff * xDiff;
      });
      
      if (sumXDiffSquared > 0) {
        trendlineSlope = sumXYDiff / sumXDiffSquared;
        trendlineIntercept = meanY - trendlineSlope * meanX;
      }
    }

    // Add trendline values to chart data using the specified dataKey
    const chartDataWithTrendline = chartData.map((point, index) => ({
      ...point,
      trendline: showTrendline ? trendlineSlope * index + trendlineIntercept : undefined,
    }));

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

    const chartDataWithLabel = chartDataWithTrendline.map((point) => ({
      ...point,
      label: formatXAxisLabel(String(point.month)),
    }));

    const xAxisProps = {
      tickFormatter: (value: string) => value,
    };

    if (chartType === 'bar') {
      // Calculate max value from data only (not trendline) to ensure y-axis starts at 0
      const maxDataValue = Math.max(
        ...chartData.map(point => Number(point[dataKey]) || 0),
        ...(stacked && stackedSeries.length > 0
          ? stackedSeries.flatMap(s => chartData.map(point => Number(point[s.name]) || 0))
          : []
        ),
        0
      );
      const yAxisMax = maxDataValue > 0 ? maxDataValue * 1.1 : 'auto'; // Add 10% padding, fallback to auto if no data
      
      // Use CompositeChart if trendline is enabled, otherwise use BarChart
      if (showTrendline) {
        const series = stacked && stackedSeries.length > 0
          ? [
              ...stackedSeries.map(s => ({ name: s.name, type: 'bar' as const, color: s.color, label: s.label || s.name, stackId: 'stack' })),
              { name: 'trendline', type: 'line' as const, color: 'gray.6', strokeDasharray: '5 5', dot: false, activeDot: false, label: 'Trend' },
            ]
          : [
              { name: dataKey, type: 'bar' as const, color, label: toHumanReadableLabel(dataKey) },
              { name: 'trendline', type: 'line' as const, color: 'gray.6', strokeDasharray: '5 5', dot: false, activeDot: false, label: 'Trend' },
            ];
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
                  domain: [0, yAxisMax],
                  tickFormatter: (value: number) => value.toLocaleString()
                }}
              />
            </Box>
          </Paper>
        );
      }
      
      // BarChart without trendline
      const barSeries = stacked && stackedSeries.length > 0
        ? stackedSeries.map(s => ({ name: s.name, color: s.color, label: s.label || s.name, stackId: 'stack' }))
        : [{ name: dataKey, color, label: toHumanReadableLabel(dataKey) }];
      
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
              series={barSeries}
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

    const series = showTrendline
      ? [
          { name: dataKey, type: 'line' as const, color, label: toHumanReadableLabel(dataKey) },
          { name: 'trendline', type: 'line' as const, color: 'gray.6', strokeDasharray: '5 5', dot: false, activeDot: false, label: 'Trend' },
        ]
      : [{ name: dataKey, type: 'line' as const, color, label: toHumanReadableLabel(dataKey) }];

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
          />
        </Box>
      </Paper>
    );
  }
);
