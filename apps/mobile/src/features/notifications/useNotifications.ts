import { useCallback, useEffect, useRef } from 'react';
import type { Disruption } from '../disruptions/types';
import { onNotificationTap, requestNotificationPermissions, sendDisruptionNotification } from './notificationService';

interface NotificationHandler {
  onDisruptionNotificationTap?: (disruptionId: string) => void;
}

/**
 * Hook to manage disruption notifications.
 * Handles sending notifications and listening for taps.
 */
export function useNotifications(handlers?: NotificationHandler) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Request permissions on mount
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  // Set up notification tap listener
  useEffect(() => {
    unsubscribeRef.current = onNotificationTap((_, data) => {
      if (data?.disruptionId && handlers?.onDisruptionNotificationTap) {
        handlers.onDisruptionNotificationTap(data.disruptionId);
      }
    });

    return () => {
      unsubscribeRef.current?.();
    };
  }, [handlers]);

  const sendTestDisruptionNotification = useCallback(async () => {
    const testDisruption: Disruption = {
      id: `test-disruption-${Date.now()}`,
      occurredAt: new Date().toISOString(),
      description: 'Signal failure causing significant delays on all inbound services. Engineers are on site and working to restore normal operations.',
      affectedRoutes: ['Downtown express', 'Evening return'],
    };

    return sendDisruptionNotification(testDisruption);
  }, []);

  const sendNotification = useCallback(async (disruption: Disruption) => {
    return sendDisruptionNotification(disruption);
  }, []);

  return {
    sendNotification,
    sendTestDisruptionNotification,
  };
}
