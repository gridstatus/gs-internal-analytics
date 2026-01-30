import { useMemo } from 'react';
import { useFilterStore } from '@/stores/filterStore';

type ApiParams = Record<string, string | number | boolean | null | undefined>;

export function useApiUrl(path: string, params: ApiParams): string {
  const filterInternal = useFilterStore((s) => s.filterInternal);
  const filterFree = useFilterStore((s) => s.filterFree);
  const timezone = useFilterStore((s) => s.timezone);

  return useMemo(() => {
    const merged: ApiParams = {
      filterInternal,
      filterFree,
      timezone,
      ...params,
    };
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value !== null && value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    return queryString ? `${path}?${queryString}` : path;
  }, [path, filterInternal, filterFree, timezone, JSON.stringify(params)]);
}
