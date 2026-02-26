import { useEffect, useRef, useState, type DependencyList } from 'react';
import { useActiveQueriesStore } from '@/stores/activeQueriesStore';

export function useApiData<T>(url: string | null, deps: DependencyList = [url]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState<string | null>(null);
  // Ref for this effect run's query id; only unregister if it's still the current run (avoids double-unregister and wrong-id unregister when deps change)
  const currentQueryIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let isActive = true;
    const queryId = useActiveQueriesStore.getState().registerQuery(url);
    currentQueryIdRef.current = queryId;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          // Try to extract error message from response body
          let errorMessage = `Request failed: ${response.status} ${response.statusText || ''}\nURL: ${url}`;
          try {
            const errorData = await response.json();
            const details =
              typeof errorData?.error === 'string'
                ? errorData.error
                : typeof errorData?.detail === 'string'
                  ? errorData.detail
                  : errorData && typeof errorData === 'object'
                    ? JSON.stringify(errorData, null, 2)
                    : null;
            if (details) {
              errorMessage = `${errorMessage}\n\nError details:\n${details}`;
            }
          } catch {
            // If response is not JSON, status text already included above
          }
          throw new Error(errorMessage);
        }
        const result = (await response.json()) as T;
        if (isActive) {
          setData(result);
        }
      } catch (err) {
        if (!controller.signal.aborted && isActive) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
        if (currentQueryIdRef.current === queryId) {
          currentQueryIdRef.current = null;
          useActiveQueriesStore.getState().unregisterQuery(queryId);
        }
      }
    };

    fetchData();

    return () => {
      isActive = false;
      controller.abort();
      if (currentQueryIdRef.current === queryId) {
        currentQueryIdRef.current = null;
        useActiveQueriesStore.getState().unregisterQuery(queryId);
      }
    };
  }, deps);

  return { data, loading, error };
}

