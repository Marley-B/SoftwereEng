import { useCallback, useEffect, useState } from "react";

import { fetchRoutes } from "./mockRoutes";
import type { Route, RouteDraft } from "./types";

interface UseRoutesResult {
  addRoute: (route: Route) => void;
  deleteRoute: (id: string) => void;
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  routes: Route[];
  updateRoute: (id: string, draft: RouteDraft) => void;
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

  const addRoute = useCallback((route: Route) => {
    setRoutes((prev) => [...prev, route]);
  }, []);

  const updateRoute = useCallback((id: string, draft: RouteDraft) => {
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              ...draft,
            }
          : r,
      ),
    );
  }, []);

  const deleteRoute = useCallback((id: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return {
    routes,
    isLoading,
    error,
    refetch: load,
    addRoute,
    updateRoute,
    deleteRoute,
  };
}
