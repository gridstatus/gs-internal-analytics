import { useEffect, useState, type DependencyList } from 'react';

export function useApiData<T>(url: string | null, deps: DependencyList = [url]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let isActive = true;

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
            if (errorData?.error) {
              errorMessage = `${errorMessage}\n\nError details:\n${errorData.error}`;
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
      }
    };

    fetchData();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, deps);

  return { data, loading, error };
}

