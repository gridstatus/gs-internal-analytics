import { useMemo } from 'react';

type ApiParams = Record<string, string | number | boolean | null | undefined>;

export function useApiUrl(path: string, params: ApiParams): string {
  return useMemo(() => {
    const searchParams = new URLSearchParams();
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    
    const queryString = searchParams.toString();
    return queryString ? `${path}?${queryString}` : path;
  }, [path, JSON.stringify(params)]);
}

