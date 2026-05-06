import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Route } from "@route-helper/shared";

function calculateArrivalTime(estimatedMinutes: number): string {
  const now = new Date();
  const arrival = new Date(now.getTime() + estimatedMinutes * 60000);
  return arrival.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function calculateStartTime(arrivalTime: string, estimatedMinutes: number): string {
  const [hoursStr, minutesStr] = arrivalTime.split(":");
  if (!hoursStr || !minutesStr) {
    return "";
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
    return "";
  }

  const arrivalDate = new Date();
  arrivalDate.setHours(hours, minutes, 0, 0);
  const start = new Date(arrivalDate.getTime() - estimatedMinutes * 60000);

  return start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type RouteItemProps = {
  route: Route & { desiredArrivalTime?: string };
  onDelete?: (routeId: string) => void;
};

export function RouteItem({ route, onDelete }: RouteItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.infoSection}>
            <Text style={styles.arrivalBy}>
              Arrive by {route.desiredArrivalTime ?? calculateArrivalTime(route.estimatedArrivalTime)}
            </Text>
            <Text style={styles.routeName}>{route.name}</Text>
          </View>
          <Text style={styles.chevron}>
            {isExpanded ? "▼" : "▶"}
          </Text>
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>From:</Text>
              <Text style={styles.locationText}>
                {route.startLocation.address}
              </Text>
            </View>

            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>To:</Text>
              <Text style={styles.locationText}>
                {route.endLocation.address}
              </Text>
            </View>

            <Text style={styles.routeInfo}>⏱️ Estimated duration: {route.estimatedArrivalTime} min</Text>
            {route.desiredArrivalTime ? (
              <Text style={styles.routeInfo}>
                🚦 Start by: {calculateStartTime(route.desiredArrivalTime, route.estimatedArrivalTime)}
              </Text>
            ) : (
              <Text style={styles.routeInfo}>
                Arrives in {route.estimatedArrivalTime} min from now
              </Text>
            )}
            <View style={styles.actionButtons}>
              <Pressable
                onPress={() => onDelete?.(route.id)}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.deleteButtonPressed,
                ]}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#cfd5df",
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  cardPressed: {
    opacity: 0.9,
  },
  chevron: {
    color: "#2563eb",
    fontSize: 12,
  },
  container: {
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: "#dc2626",
    borderRadius: 6,
    flex: 1,
    paddingVertical: 10,
  },
  deleteButtonPressed: {
    opacity: 0.8,
  },
  deleteButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    textAlign: "center",
  },
  arrivalBy: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  eta: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 4,
  },
  routeInfo: {
    color: "#4b5563",
    fontSize: 13,
    marginBottom: 8,
  },
  expandedContent: {
    borderTopColor: "#e5e7eb",
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoSection: {
    flex: 1,
  },
  locationLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "600",
    minWidth: 40,
  },
  locationRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  locationText: {
    color: "#111827",
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
  },
  routeName: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
});
