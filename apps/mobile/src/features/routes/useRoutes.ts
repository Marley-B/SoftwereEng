import type { RouteResponse } from "@route-helper/shared";
import { useCallback, useEffect, useState } from "react";

import { ApiError, apiRequest } from "../../lib/apiClient";
import { useAuth } from "../auth/context/AuthProvider";
import type { Route } from "./types";
import type { RouteCreateBody, RouteUpdateBody } from "./types";

function mapDto(r: RouteResponse): Route {
  return {
    id: r.id,
    name: r.name,
    startTime: r.startTime,
    expectedArrival: r.expectedArrival,
    departure: r.departure,
    destination: r.destination,
    timeZone: r.timeZone,
    origin: r.origin,
    destinationPlace: r.destinationPlace,
    transitSnapshot: r.transitSnapshot,
  };
}

interface UseRoutesResult {
  createRoute: (body: RouteCreateBody) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  routes: Route[];
  updateRoute: (id: string, body: RouteUpdateBody) => Promise<void>;
}

export function useRoutes(): UseRoutesResult {
  const { user, isReady } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setRoutes([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest<RouteResponse[]>("/routes", { method: "GET" });
      setRoutes(data.map(mapDto));
    } catch (e) {
      const msg = e instanceof ApiError ? (e.body as { error?: string })?.error ?? e.message : "Could not load routes.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    void load();
  }, [isReady, load]);

  const createRoute = useCallback(
    async (body: RouteCreateBody) => {
      await apiRequest("/routes", { method: "POST", json: body });
      await load();
    },
    [load],
  );

  const updateRoute = useCallback(
    async (id: string, body: RouteUpdateBody) => {
      await apiRequest(`/routes/${id}`, { method: "PATCH", json: body });
      await load();
    },
    [load],
  );

  const deleteRoute = useCallback(
    async (id: string) => {
      await apiRequest(`/routes/${id}`, { method: "DELETE" });
      await load();
    },
    [load],
  );

  return {
    routes,
    isLoading,
    error,
    refetch: load,
    createRoute,
    updateRoute,
    deleteRoute,
  };
}
