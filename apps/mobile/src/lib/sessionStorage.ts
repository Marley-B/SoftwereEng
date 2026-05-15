import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "route_helper_auth_token";
const USER_KEY = "route_helper_auth_user";

export const persistSession = async (token: string, userJson: string): Promise<void> => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, userJson);
};

export const loadStoredToken = (): Promise<string | null> => SecureStore.getItemAsync(TOKEN_KEY);

export const loadStoredUserJson = (): Promise<string | null> => SecureStore.getItemAsync(USER_KEY);

export const clearSession = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
};
