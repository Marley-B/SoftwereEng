import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useState, useEffect } from "react";
import { Disruption } from "@route-helper/shared";
import { DisruptionCard } from "../components/DisruptionCard";
import { useDisruptionNotifications } from "../hooks/useDisruptionNotifications";

const mockDisruptions: Disruption[] = [
  {
    id: "1",
    title: "Retraso en L3 (Metro)",
    description: "Problema técnico en la línea L3. Se espera normalización en 15 minutos.",
    severity: "high",
    type: "delay",
    location: "Estació de Sants",
    affectedRoute: "Estació de Sants → Plaça Catalunya",
    startTime: "2026-05-06T10:30:00Z",
    endTime: "2026-05-06T11:00:00Z",
    createdAt: "2026-05-06T10:25:00Z",
  },
  {
    id: "2",
    title: "Cierre de carril en Av. Diagonal",
    description: "Se cierra un carril por obras de mantenimiento.",
    severity: "medium",
    type: "closure",
    location: "Av. Diagonal, entre Paseo Sant Joan y Paseo de Gracia",
    startTime: "2026-05-06T08:00:00Z",
    endTime: "2026-05-06T19:00:00Z",
    createdAt: "2026-05-05T16:00:00Z",
  },
  {
    id: "3",
    title: "Evento especial",
    description: "Marcha por el centro de la ciudad. Posibles congestiones.",
    severity: "low",
    type: "event",
    location: "Centro de Barcelona",
    startTime: "2026-05-06T11:00:00Z",
    endTime: "2026-05-06T14:00:00Z",
    createdAt: "2026-05-06T09:00:00Z",
  },
];

export default function DisruptionsScreen() {
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Simular carga de datos
    const timer = setTimeout(() => {
      setDisruptions(mockDisruptions);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // Simular actualización
    const timer = setTimeout(() => {
      setDisruptions(mockDisruptions);
      setRefreshing(false);
    }, 1000);

    return () => clearTimeout(timer);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {disruptions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No hay disrupciones activas</Text>
          <Text style={styles.emptyText}>
            Tus rutas se ven bien por ahora. ¡Buen viaje!
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
            />
          }
        >
          {disruptions.map((disruption) => (
            <DisruptionCard key={disruption.id} disruption={disruption} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: 12,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
