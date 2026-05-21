import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "route_helper_auth_token";
const USER_KEY = "route_helper_auth_user";

const isWeb = Platform.OS === "web";

type WebStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const webStorage = (): WebStorage | null => {
  const maybeGlobal = globalThis as typeof globalThis & {
    localStorage?: WebStorage;
  };
  return maybeGlobal.localStorage ?? null;
};

export const persistSession = async (token: string, userJson: string): Promise<void> => {
  if (isWeb) {
    const storage = webStorage();
    storage?.setItem(TOKEN_KEY, token);
    storage?.setItem(USER_KEY, userJson);
    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, userJson);
};

export const loadStoredToken = async (): Promise<string | null> => {
  if (isWeb) {
    return webStorage()?.getItem(TOKEN_KEY) ?? null;
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
};

export const loadStoredUserJson = async (): Promise<string | null> => {
  if (isWeb) {
    return webStorage()?.getItem(USER_KEY) ?? null;
  }
  return SecureStore.getItemAsync(USER_KEY);
};

export const clearSession = async (): Promise<void> => {
  if (isWeb) {
    const storage = webStorage();
    storage?.removeItem(TOKEN_KEY);
    storage?.removeItem(USER_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
};
