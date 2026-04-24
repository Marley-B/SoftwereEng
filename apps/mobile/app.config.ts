import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Route Helper",
  slug: "route-helper",
  scheme: "routehelper",
  version: "0.0.1",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  experiments: {
    typedRoutes: true
  },
  ios: {
    supportsTablet: true
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#FFFFFF"
    }
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000"
  }
};

export default config;
