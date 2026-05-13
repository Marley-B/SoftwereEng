import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { apiRequest } from "./apiClient";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Request notification permission, obtain Expo push token, register with API. */
export const registerExpoPushAndUpload = async (): Promise<void> => {
  if (!Device.isDevice) {
    return;
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    return;
  }
  const projectId =
    (Constants.expoConfig?.extra as { easProjectId?: string } | undefined)?.easProjectId ??
    Constants.easConfig?.projectId;
  const tokenRes = await Notifications.getExpoPushTokenAsync(
    projectId !== undefined && projectId !== "" ? { projectId: String(projectId) } : undefined,
  );
  const expoPushToken = tokenRes.data;
  await apiRequest("/me/push-tokens", {
    method: "POST",
    json: { expoPushToken, deviceId: Device.modelName ?? undefined },
  });
};
