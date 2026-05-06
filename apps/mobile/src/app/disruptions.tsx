import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { Disruption, Route } from "@route-helper/shared";
import { DisruptionCard } from "../components/DisruptionCard";
import { useDisruptionNotifications } from "../hooks/useDisruptionNotifications";

const mockRoutes = [
  { id: "1", name: "Home to Office" },
  { id: "2", name: "Office to Gym" },
  { id: "3", name: "Gym to Home" },
];

const mockDisruptions: Disruption[] = [
  {
    id: "1",
    title: "Retraso en L3 (Metro)",
    description: "Problema técnico en la línea L3. Se espera normalización en 15 minutos.",
    severity: "high",
    type: "delay",
    location: "Estació de Sants",
    affectedRouteIds: ["1"], // Affects "Home to Office" route
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
    affectedRouteIds: ["1", "2"], // Affects both "Home to Office" and "Office to Gym" routes
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
    affectedRouteIds: ["2", "3"], // Affects "Office to Gym" and "Gym to Home" routes
    startTime: "2026-05-06T11:00:00Z",
    endTime: "2026-05-06T14:00:00Z",
    createdAt: "2026-05-06T09:00:00Z",
  },
  {
    id: "4",
    title: "Accidente en Broadway",
    description: "Accidente de tráfico bloqueando Broadway. Desvío recomendado.",
    severity: "high",
    type: "incident",
    location: "Broadway & 42nd St",
    affectedRouteIds: ["3"], // Affects "Gym to Home" route
    startTime: "2026-05-06T19:15:00Z",
    endTime: "2026-05-06T20:30:00Z",
    createdAt: "2026-05-06T19:10:00Z",
  },
];

interface DisruptionsScreenProps {
  routes?: Route[];
  selectedRouteId?: string;
}

export default function DisruptionsScreen({ routes = [], selectedRouteId }: DisruptionsScreenProps) {
  const params = useLocalSearchParams<{ routeId?: string }>();
  const routeId = selectedRouteId || params.routeId;
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

  // Filter disruptions based on selected route or show all
  const filteredDisruptions = routeId
    ? disruptions.filter(disruption =>
        disruption.affectedRouteIds?.includes(routeId)
      )
    : disruptions;

  // Get route names for display
  const getAffectedRouteNames = (disruption: Disruption): string => {
    if (!disruption.affectedRouteIds || disruption.affectedRouteIds.length === 0) {
      return "Todas las rutas";
    }

    const affectedRoutes = mockRoutes.filter(route =>
      disruption.affectedRouteIds?.includes(route.id)
    );

    if (affectedRoutes.length === 0) {
      return "Rutas específicas";
    }

    return affectedRoutes.map(route => route.name).join(", ");
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
      {routeId && (
        <View style={styles.routeHeader}>
          <Text style={styles.routeHeaderText}>
            Disrupciones para: {mockRoutes.find(r => r.id === routeId)?.name || "Ruta seleccionada"}
          </Text>
        </View>
      )}

      {filteredDisruptions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            {routeId ? "No hay disrupciones en esta ruta" : "No hay disrupciones activas"}
          </Text>
          <Text style={styles.emptyText}>
            {routeId
              ? "Esta ruta se ve bien por ahora. ¡Buen viaje!"
              : "Tus rutas se ven bien por ahora. ¡Buen viaje!"
            }
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
          {filteredDisruptions.map((disruption) => (
            <DisruptionCard
              key={disruption.id}
              disruption={disruption}
              affectedRoutes={getAffectedRouteNames(disruption)}
            />
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
  routeHeader: {
    backgroundColor: "#007AFF",
    padding: 16,
    marginBottom: 16,
  },
  routeHeaderText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
