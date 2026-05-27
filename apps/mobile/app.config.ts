import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { ExpoConfig } from 'expo/config';

loadEnv({ path: path.resolve(__dirname, '.env') });

const config: ExpoConfig = {
  name: "Route Helper",
  slug: "route-helper",
  scheme: "routehelper",
  version: "0.0.1",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  plugins: [
    "@react-native-community/datetimepicker",
    "expo-localization",
    "expo-secure-store",
    "expo-notifications",
    [
      "expo-location",
      {
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
        isIosBackgroundLocationEnabled: true,
        locationAlwaysAndWhenInUsePermission:
          "Allow Route Helper to use your location to detect recurring routes.",
        locationWhenInUsePermission:
          "Allow Route Helper to use your location while the app is open to detect recurring routes."
      }
    ],
  ],
  ios: {
    supportsTablet: true
  },
  android: {
    package: "com.d.kalinskyy.routehelper",
    adaptiveIcon: {
      backgroundColor: "#FFFFFF"
    }
  },
  extra: {
    eas: {
      projectId: "ae6cbe34-830f-421c-92f5-ace1afbe9b0e"
    },
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000",
    easProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? "",
    /** Maps Static API key — map preview only (enable “Maps Static API” in Google Cloud). */
    googleMapsStaticApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_STATIC_API_KEY ?? "",
  }
};

export default config;
