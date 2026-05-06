import { View, Text, StyleSheet } from "react-native";
import { Disruption } from "@route-helper/shared";

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case "high":
      return "#FF3B30";
    case "medium":
      return "#FF9500";
    case "low":
      return "#FFC200";
    default:
      return "#34C759";
  }
};

const getTypeIcon = (type: string): string => {
  switch (type) {
    case "delay":
      return "⏱️";
    case "closure":
      return "🚫";
    case "event":
      return "📢";
    case "incident":
      return "⚠️";
    default:
      return "ℹ️";
  }
};

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

interface DisruptionCardProps {
  disruption: Disruption;
}

export function DisruptionCard({ disruption }: DisruptionCardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          borderLeftColor: getSeverityColor(disruption.severity),
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.typeIcon}>{getTypeIcon(disruption.type)}</Text>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{disruption.title}</Text>
          <Text style={styles.time}>
            Desde {formatTime(disruption.startTime)}
            {disruption.endTime && ` · Hasta ${formatTime(disruption.endTime)}`}
          </Text>
        </View>
        <View
          style={[
            styles.severityBadge,
            { backgroundColor: getSeverityColor(disruption.severity) },
          ]}
        >
          <Text style={styles.severityText}>
            {disruption.severity === "high"
              ? "Alto"
              : disruption.severity === "medium"
                ? "Medio"
                : "Bajo"}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{disruption.description}</Text>

      <View style={styles.footer}>
        <Text style={styles.location}>📍 {disruption.location}</Text>
        {disruption.affectedRoute && (
          <Text style={styles.affectedRoute}>🛣️ {disruption.affectedRoute}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  typeIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: "#666",
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: "#333",
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    gap: 6,
  },
  location: {
    fontSize: 13,
    color: "#666",
  },
  affectedRoute: {
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "500",
  },
});
