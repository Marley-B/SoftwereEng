export interface PushPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export const sendExpoPushNotification = async (_payload: PushPayload): Promise<void> => {
  // Network call intentionally omitted in environment setup phase.
};
