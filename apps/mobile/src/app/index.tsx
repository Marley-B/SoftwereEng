import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Link } from "expo-router";

// Mock routes data - in a real app this would come from shared state or API
const mockRoutes = [
  { id: "1", name: "Home to Office" },
  { id: "2", name: "Office to Gym" },
  { id: "3", name: "Gym to Home" },
];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Route Helper</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alertas de Disrupciones</Text>

          <Link href={{ pathname: "disruptions" as any }} asChild>
            <TouchableOpacity style={styles.menuButton}>
              <Text style={styles.menuButtonText}>⚠️ Ver Todas las Alertas</Text>
            </TouchableOpacity>
          </Link>

          <Text style={styles.subsectionTitle}>Por Ruta Específica:</Text>
          {mockRoutes.map((route) => (
            <Link key={route.id} href={{ pathname: "disruptions" as any, params: { routeId: route.id } }} asChild>
              <TouchableOpacity style={styles.routeButton}>
                <Text style={styles.routeButtonText}>🛣️ {route.name}</Text>
              </TouchableOpacity>
            </Link>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
    marginTop: 16,
    color: "#666",
  },
  menu: {
    gap: 12,
  },
  menuButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  menuButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  routeButton: {
    backgroundColor: "#F2F2F7",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  routeButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
});
