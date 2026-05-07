import { ExpoConfig } from "expo/config";

const googleMapsAndroidKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ?? "";

const config: ExpoConfig = {
  name: "Route Helper",
  slug: "route-helper",
  scheme: "routehelper",
  version: "0.0.1",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  plugins: ["@react-native-community/datetimepicker"],
  ios: {
    supportsTablet: true
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#FFFFFF"
    },
    ...(googleMapsAndroidKey
      ? {
          config: {
            googleMaps: {
              apiKey: googleMapsAndroidKey,
            },
          },
        }
      : {}),
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000"
  }
};

export default config;
