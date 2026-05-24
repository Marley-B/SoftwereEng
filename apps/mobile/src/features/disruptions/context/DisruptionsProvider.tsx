import * as Notifications from "expo-notifications";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import { ApiError, apiRequest } from "../../../lib/apiClient";
import { useAuth } from "../../auth/context/AuthProvider";
import type { Disruption } from "../types";
import type { RouteSuggestion } from "@route-helper/shared";

interface DisruptionDto {
  id: string;
  occurredAt: string;
  description: string;
  severity: string;
  routeId: string | null;
  suggestedAlternative?: RouteSuggestion | null;
  affectedRoutes: string[];
}

interface DisruptionsContextValue {
  disruptions: Disruption[];
  error: string | null;
  isLoading: boolean;
  /** When `background` is true, keeps existing list visible (no full-screen loading). */
  refetch: (opts?: { background?: boolean }) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
}

const DisruptionsContext = createContext<DisruptionsContextValue | null>(null);

/** Background refresh while logged in so the home badge stays current. */
const POLL_INTERVAL_MS = 45_000;

function mapDto(d: DisruptionDto): Disruption {
  return {
    id: d.id,
    occurredAt: d.occurredAt,
    description: d.description,
    routeId: d.routeId,
    suggestedAlternative: d.suggestedAlternative ?? null,
    affectedRoutes: d.affectedRoutes,
  };
}

export function DisruptionsProvider({ children }: { children: ReactNode }) {
  const { user, isReady } = useAuth();
  const [all, setAll] = useState<Disruption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { background?: boolean }) => {
    if (!user) {
      setAll([]);
      return;
    }
    const background = opts?.background === true;
    if (!background) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await apiRequest<DisruptionDto[]>("/me/disruptions", { method: "GET" });
      setAll(data.map(mapDto));
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? ((e.body as { error?: string } | null)?.error ?? e.message)
          : "Failed to load disruptions. Please try again.";
      if (!background) {
        setError(msg);
      }
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, [user]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!isReady) {
      return;
    }
    void load();
  }, [isReady, load]);

  // Refetch when the app returns to the foreground.
  useEffect(() => {
    if (!user) {
      return;
    }
    const onAppStateChange = (next: AppStateStatus) => {
      if (next === "active") {
        void loadRef.current({ background: true });
      }
    };
    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => sub.remove();
  }, [user]);

  // Refetch when a push notification arrives or the user opens one.
  useEffect(() => {
    if (!user) {
      return;
    }
    const received = Notifications.addNotificationReceivedListener(() => {
      void loadRef.current({ background: true });
    });
    const response = Notifications.addNotificationResponseReceivedListener(() => {
      void loadRef.current({ background: true });
    });
    return () => {
      received.remove();
      response.remove();
    };
  }, [user]);

  // Periodic refresh while the user is signed in (covers worker writes without opening the list).
  useEffect(() => {
    if (!user) {
      return;
    }
    const id = setInterval(() => {
      void loadRef.current({ background: true });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [user]);

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
