import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { ApiError, apiRequest } from "../../../lib/apiClient";
import { useAuth } from "../../auth/context/AuthProvider";
import type { Disruption } from "../types";

interface DisruptionDto {
  id: string;
  occurredAt: string;
  description: string;
  severity: string;
  routeId: string | null;
  affectedRoutes: string[];
}

interface DisruptionsContextValue {
  disruptions: Disruption[];
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
}

const DisruptionsContext = createContext<DisruptionsContextValue | null>(null);

function mapDto(d: DisruptionDto): Disruption {
  return {
    id: d.id,
    occurredAt: d.occurredAt,
    description: d.description,
    affectedRoutes: d.affectedRoutes,
  };
}

export function DisruptionsProvider({ children }: { children: ReactNode }) {
  const { user, isReady } = useAuth();
  const [all, setAll] = useState<Disruption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setAll([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest<DisruptionDto[]>("/me/disruptions", { method: "GET" });
      setAll(data.map(mapDto));
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? ((e.body as { error?: string } | null)?.error ?? e.message)
          : "Failed to load disruptions. Please try again.";
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

  const dismiss = useCallback(
    async (id: string) => {
      try {
        await apiRequest(`/me/disruptions/${id}/dismiss`, { method: "POST" });
        setAll((prev) => prev.filter((d) => d.id !== id));
      } catch {
        await load();
      }
    },
    [load],
  );

  return (
    <DisruptionsContext.Provider value={{ disruptions: all, error, isLoading, refetch: load, dismiss }}>
      {children}
    </DisruptionsContext.Provider>
  );
}

export function useDisruptionsContext(): DisruptionsContextValue {
  const ctx = useContext(DisruptionsContext);
  if (!ctx) {
    throw new Error("useDisruptionsContext must be used inside DisruptionsProvider");
  }
  return ctx;
}
