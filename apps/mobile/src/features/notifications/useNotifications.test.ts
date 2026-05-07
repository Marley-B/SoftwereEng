import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Notifications from 'expo-notifications';
import { sendDisruptionNotification, onNotificationTap, requestNotificationPermissions } from './notificationService';
import type { Disruption } from '../disruptions/types';
import type { NotificationResponse } from 'expo-notifications';

// Mock expo-notifications
vi.mock('expo-notifications', () => ({
  setNotificationHandler: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  addNotificationResponseReceivedListener: vi.fn(),
  requestPermissionsAsync: vi.fn(),
}));

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendDisruptionNotification', () => {
    it('should send a notification with disruption details', async () => {
      const mockDisruption: Disruption = {
        id: 'disruption-1',
        occurredAt: '2026-05-07T10:00:00Z',
        description: 'Signal failure causing delays',
        affectedRoutes: ['Route 1', 'Route 2'],
      };

      vi.mocked(Notifications.scheduleNotificationAsync).mockResolvedValue('notification-id-123');

      const notificationId = await sendDisruptionNotification(mockDisruption);

      expect(notificationId).toBe('notification-id-123');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Transit Disruption',
          body: 'Signal failure causing delays',
          data: {
            disruptionId: 'disruption-1',
            affectedRoutes: 'Route 1, Route 2',
            occurredAt: '2026-05-07T10:00:00Z',
          },
        },
        trigger: null,
      });
    });

    it('should handle single affected route', async () => {
      const mockDisruption: Disruption = {
        id: 'disruption-2',
        occurredAt: '2026-05-07T11:00:00Z',
        description: 'Road closure',
        affectedRoutes: ['Campus Loop'],
      };

      vi.mocked(Notifications.scheduleNotificationAsync).mockResolvedValue('notification-id-456');

      const notificationId = await sendDisruptionNotification(mockDisruption);

      expect(notificationId).toBe('notification-id-456');
      const calls = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls;
      const firstCall = calls[0] as any;
      expect(firstCall?.content?.data?.affectedRoutes).toBe('Campus Loop');
    });
  });

  describe('onNotificationTap', () => {
    it('should register a notification tap listener', () => {
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();

      vi.mocked(Notifications.addNotificationResponseReceivedListener).mockReturnValue({
        remove: mockUnsubscribe,
      } as any);

      const unsubscribe = onNotificationTap(mockCallback);

      expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should call callback with notification data when tapped', () => {
      const mockCallback = vi.fn();
      let capturedListener: any = null;

      vi.mocked(Notifications.addNotificationResponseReceivedListener).mockImplementation((listener: any) => {
        capturedListener = listener;
        return { remove: vi.fn() } as any;
      });

      onNotificationTap(mockCallback);

      expect(capturedListener).not.toBeNull();

      const testNotification = {
        notification: {
          request: {
            identifier: 'notification-123',
            content: {
              data: {
                disruptionId: 'disruption-1',
                affectedRoutes: 'Route 1',
              },
            },
          },
        },
      };

      if (capturedListener) {
        capturedListener(testNotification);
      }

      expect(mockCallback).toHaveBeenCalledWith('notification-123', {
        disruptionId: 'disruption-1',
        affectedRoutes: 'Route 1',
      });
    });
  });

  describe('requestNotificationPermissions', () => {
    it('should request and return permission status', async () => {
      vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ granted: true } as any);

      const granted = await requestNotificationPermissions();

      expect(granted).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false if permission request fails', async () => {
      vi.mocked(Notifications.requestPermissionsAsync).mockRejectedValue(new Error('Permission denied'));

      const granted = await requestNotificationPermissions();

      expect(granted).toBe(false);
    });

    it('should return false if permissions are not granted', async () => {
      vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ granted: false } as any);

      const granted = await requestNotificationPermissions();

      expect(granted).toBe(false);
    });
  });
});
