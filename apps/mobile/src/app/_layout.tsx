import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: "#000",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Route Helper",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="disruptions"
        options={{
          title: "Alertas de Disrupciones",
        }}
      />
    </Stack>
  );
}
