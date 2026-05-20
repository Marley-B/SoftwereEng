import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { DetectedRecurringRoute } from "@route-helper/shared";

const notifiedRouteKeys = new Set<string>();

export function routeNotificationKey(route: DetectedRecurringRoute): string {
  return [
    route.origin.id,
    route.destination.id,
    route.typicalDepartureTime,
    route.typicalArrivalTime,
    route.daysOfWeek.join("-"),
  ].join("|");
}

export function resetDetectedRouteNotificationMemory(): void {
  notifiedRouteKeys.clear();
}

async function ensureLocalNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

export async function notifyPotentialRouteDetected(route: DetectedRecurringRoute): Promise<boolean> {
  const key = routeNotificationKey(route);
  if (notifiedRouteKeys.has(key)) {
    return false;
  }

  const allowed = await ensureLocalNotificationPermission();
  if (!allowed) {
    return false;
  }

  notifiedRouteKeys.add(key);
  const timeWindow = `${route.typicalDepartureTime} -> ${route.typicalArrivalTime}`;
  const days = route.daysOfWeek.map((day) => day.slice(0, 3).toUpperCase()).join(", ");

  await Notifications.scheduleNotificationAsync({
    content: {
      body: `${timeWindow} on ${days}. Review it in Detected frequent routes.`,
      ...(Platform.OS === "web" ? {} : { sound: "default" }),
      title: "Potential frequent route found",
    },
    trigger: null,
  });

  return true;
}
