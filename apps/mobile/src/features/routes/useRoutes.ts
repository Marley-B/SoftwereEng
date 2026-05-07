import { useCallback, useEffect, useState } from "react";

import { fetchRoutes } from "./mockRoutes";
import type { Route } from "./types";

interface UseRoutesResult {
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  routes: Route[];
}

/** Mirrors future remote loading: swap `fetchRoutes` implementation only. */
export function useRoutes(): UseRoutesResult {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRoutes();
      setRoutes(data);
    } catch {
      setError("Could not load routes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { routes, isLoading, error, refetch: load };
}
