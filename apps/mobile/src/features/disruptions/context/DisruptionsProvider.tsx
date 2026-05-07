import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { fetchDisruptions } from '../mockDisruptions';
import type { Disruption } from '../types';

interface DisruptionsContextValue {
  disruptions: Disruption[];
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  dismiss: (id: string) => void;
}

const DisruptionsContext = createContext<DisruptionsContextValue | null>(null);

export function DisruptionsProvider({ children }: { children: ReactNode }) {
  const [all, setAll] = useState<Disruption[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDisruptions();
      setAll(data);
    } catch {
      setError('Failed to load disruptions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  }, []);

  const disruptions = all.filter((d) => !dismissed.has(d.id));

  return (
    <DisruptionsContext.Provider value={{ disruptions, error, isLoading, refetch: load, dismiss }}>
      {children}
    </DisruptionsContext.Provider>
  );
}

export function useDisruptionsContext(): DisruptionsContextValue {
  const ctx = useContext(DisruptionsContext);
  if (!ctx) throw new Error('useDisruptionsContext must be used inside DisruptionsProvider');
  return ctx;
}
