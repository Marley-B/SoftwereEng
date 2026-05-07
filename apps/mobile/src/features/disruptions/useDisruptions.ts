import { useCallback, useEffect, useState } from 'react';

import { fetchDisruptions } from './mockDisruptions';
import type { Disruption } from './types';

export function useDisruptions() {
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDisruptions();
      setDisruptions(data);
    } catch {
      setError('Failed to load disruptions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { disruptions, error, isLoading, refetch: load };
}
