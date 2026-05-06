import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Route } from "@route-helper/shared";
import { RouteItem } from "../components/routes/RouteItem";

function calculateArrivalTime(estimatedMinutes: number): string {
  const now = new Date();
  const arrival = new Date(now.getTime() + estimatedMinutes * 60000);
  return arrival.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function parseArrivalTime(timeString: string): Date | null {
  const [hoursStr, minutesStr] = timeString.trim().split(":");
  if (!hoursStr || !minutesStr) {
    return null;
  }

  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const result = new Date();
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function calculateStartTime(arrivalTime: string, estimatedMinutes: number): string {
  const arrivalDate = parseArrivalTime(arrivalTime);
  if (!arrivalDate) {
    return "";
  }

  const start = new Date(arrivalDate.getTime() - estimatedMinutes * 60000);
  return formatTime(start);
}

interface AppRoute extends Route {
  desiredArrivalTime?: string;
}

type RoutesListScreenProps = {
  onSignOut?: () => void;
};

// Mock data for demo purposes
const MOCK_ROUTES: AppRoute[] = [
  {
    id: "1",
    name: "Home to Office",
    startLocation: {
      address: "123 Main St, New York, NY",
      lat: 40.7128,
      lng: -74.006,
      placeId: "mock-1",
    },
    endLocation: {
      address: "456 Park Ave, New York, NY",
      lat: 40.7614,
      lng: -73.9776,
      placeId: "mock-2",
    },
    estimatedArrivalTime: 25,
    desiredArrivalTime: "09:00",
    createdAt: new Date("2025-01-15"),
  },
  {
    id: "2",
    name: "Office to Gym",
    startLocation: {
      address: "456 Park Ave, New York, NY",
      lat: 40.7614,
      lng: -73.9776,
      placeId: "mock-2",
    },
    endLocation: {
      address: "789 Fitness Blvd, New York, NY",
      lat: 40.758,
      lng: -73.9855,
      placeId: "mock-3",
    },
    estimatedArrivalTime: 15,
    desiredArrivalTime: "18:00",
    createdAt: new Date("2025-01-20"),
  },
  {
    id: "3",
    name: "Gym to Home",
    startLocation: {
      address: "789 Fitness Blvd, New York, NY",
      lat: 40.758,
      lng: -73.9855,
      placeId: "mock-3",
    },
    endLocation: {
      address: "123 Main St, New York, NY",
      lat: 40.7128,
      lng: -74.006,
      placeId: "mock-1",
    },
    estimatedArrivalTime: 32,
    desiredArrivalTime: "20:15",
    createdAt: new Date("2025-01-22"),
  },
];

export function RoutesListScreen({ onSignOut }: RoutesListScreenProps) {
  const [routes, setRoutes] = useState<AppRoute[]>(MOCK_ROUTES);
  const [newRouteName, setNewRouteName] = useState("");
  const [newRouteArrivalTime, setNewRouteArrivalTime] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddRoute = () => {
    if (!newRouteName.trim()) {
      Alert.alert("Error", "Please enter a route name");
      return;
    }

    if (!newRouteArrivalTime.trim()) {
      Alert.alert("Error", "Please enter the desired arrival time");
      return;
    }

    const parsedArrival = parseArrivalTime(newRouteArrivalTime.trim());
    if (!parsedArrival) {
      Alert.alert("Error", "Please enter arrival time in HH:MM format (24-hour)");
      return;
    }

    setIsAdding(true);

    // Simulate API call
    const randomETA = Math.floor(Math.random() * 60) + 5;
    const newRoute: AppRoute = {
      id: Math.random().toString(36).substring(7),
      name: newRouteName.trim(),
      startLocation: {
        address: "123 Start St, New York, NY",
        lat: 40.7128,
        lng: -74.006,
        placeId: "mock-start",
      },
      endLocation: {
        address: "456 End Ave, New York, NY",
        lat: 40.7614,
        lng: -73.9776,
        placeId: "mock-end",
      },
      estimatedArrivalTime: randomETA,
      desiredArrivalTime: newRouteArrivalTime.trim(),
      createdAt: new Date(),
    };

    setTimeout(() => {
      setRoutes([newRoute, ...routes]);
      setNewRouteName("");
      setNewRouteArrivalTime("");
      setIsAdding(false);
      Alert.alert(
        "Route Added",
        `${newRouteName} added! Arrive by ${newRouteArrivalTime.trim()} — start at ${calculateStartTime(
          newRouteArrivalTime.trim(),
          randomETA
        )}`
      );
    }, 500);
  };

  const handleDeleteRoute = (routeId: string) => {
    setRoutes(routes.filter((r) => r.id !== routeId));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Your Routes</Text>
            <Text style={styles.subtitle}>{routes.length} active routes</Text>
          </View>
          <Pressable
            onPress={onSignOut}
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && styles.signOutButtonPressed,
            ]}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>

        {/* Add Route Form */}
        <View style={styles.addRouteSection}>
          <Text style={styles.sectionTitle}>Add New Route</Text>
          <TextInput
            editable={!isAdding}
            onChangeText={setNewRouteName}
            placeholder="Route name (e.g., Home to Office)"
            placeholderTextColor="#8a8f98"
            style={styles.input}
            value={newRouteName}
          />
          <TextInput
            editable={!isAdding}
            onChangeText={setNewRouteArrivalTime}
            placeholder="Arrive by (HH:MM, 24h)"
            placeholderTextColor="#8a8f98"
            style={styles.input}
            value={newRouteArrivalTime}
          />
          <Pressable
            disabled={isAdding || !newRouteName.trim() || !newRouteArrivalTime.trim()}
            onPress={handleAddRoute}
            style={({ pressed }) => [
              styles.addButton,
              isAdding || !newRouteName.trim() || !newRouteArrivalTime.trim()
                ? styles.addButtonDisabled
                : null,
              pressed && !isAdding ? styles.addButtonPressed : null,
            ]}
          >
            {isAdding ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.addButtonText}>+ Add</Text>
            )}
          </Pressable>
        </View>

        {/* Routes List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Routes</Text>
          {routes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No routes yet. Create one to get started!
              </Text>
            </View>
          ) : (
            <FlatList
              bounces={false}
              data={routes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <RouteItem
                  onDelete={handleDeleteRoute}
                  route={item}
                />
              )}
              scrollEnabled={false}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  addButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 80,
    paddingHorizontal: 12,
  },
  addButtonDisabled: {
    opacity: 0.55,
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  addRouteSection: {
    backgroundColor: "#ffffff",
    borderColor: "#cfd5df",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    marginBottom: 20,
    padding: 14,
  },
  container: {
    backgroundColor: "#f7f8fb",
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyState: {
    backgroundColor: "#ffffff",
    borderColor: "#cfd5df",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 24,
  },
  emptyStateText: {
    color: "#6b7280",
    fontSize: 14,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cfd5df",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    flex: 1,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  listSection: {
    flex: 1,
  },
  screen: {
    backgroundColor: "#f7f8fb",
    flex: 1,
  },
  sectionTitle: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  signOutButton: {
    backgroundColor: "#ffffff",
    borderColor: "#cfd5df",
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signOutButtonPressed: {
    opacity: 0.8,
  },
  signOutText: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "600",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 2,
  },
  title: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "800",
  },
});
