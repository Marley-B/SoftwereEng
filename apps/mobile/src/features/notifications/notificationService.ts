import * as Notifications from 'expo-notifications';
import type { Disruption } from '../disruptions/types';
import type { NotificationResponse } from 'expo-notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Sends a disruption notification to the user's phone.
 * @param disruption - The disruption to notify about
 * @returns Promise that resolves with the notification ID
 */
export async function sendDisruptionNotification(disruption: Disruption): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Transit Disruption',
      body: disruption.description,
      data: {
        disruptionId: disruption.id,
        affectedRoutes: disruption.affectedRoutes.join(', '),
        occurredAt: disruption.occurredAt,
      },
    },
    trigger: null, // Send immediately
  });
}

/**
 * Adds a listener for notification tap events.
 * @param callback - Function to call when a notification is tapped
 * @returns Function to remove the listener
 */
export function onNotificationTap(
  callback: (notificationId: string, data: Record<string, any>) => void,
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response: NotificationResponse) => {
    const { notification } = response;
    callback(notification.request.identifier, notification.request.content.data);
  });

  return () => subscription.remove();
}

/**
 * Requests user permission for notifications (iOS required).
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { granted } = await Notifications.requestPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}
