import { useCallback, useEffect, useState } from 'react';

// Small shared fetch-on-mount hook covering the loading/error/refetch
// boilerplate every list/detail page needs. Deliberately not a full
// data-fetching library (React Query etc.) - this app has no cross-page
// cache-sharing or optimistic-update needs that would justify one.
export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data, meta } = await fetcher();
      setState({ data, meta, loading: false, error: null });
    } catch (error) {
      setState({ data: null, meta: null, loading: false, error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
