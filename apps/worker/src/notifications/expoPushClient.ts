export interface PushPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Send via Expo Push API (https://docs.expo.dev/push-notifications/sending-notifications/). */
export const sendExpoPushNotification = async (payload: PushPayload): Promise<void> => {
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      {
        to: payload.to,
        sound: "default",
        title: payload.title,
        body: payload.body,
        data: payload.data,
      },
    ]),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Expo push failed ${res.status}: ${text}`);
  }
};
