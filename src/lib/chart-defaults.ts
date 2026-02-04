/**
 * Default legend placement for @mantine/charts (Recharts).
 * Use with CompositeChart/BarChart: withLegend legendProps={DEFAULT_CHART_LEGEND_PROPS}
 * wrapperStyle forces left position (align alone can be overridden by custom legend content).
 */
export const DEFAULT_CHART_LEGEND_PROPS = {
  verticalAlign: 'top' as const,
  align: 'left' as const,
  height: 40,
  wrapperStyle: { left: 0, right: 'auto' } as const,
};
