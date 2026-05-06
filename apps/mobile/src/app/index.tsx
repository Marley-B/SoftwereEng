import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Link } from "expo-router";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Route Helper</Text>

        <View style={styles.menu}>
          <Link href="/disruptions" asChild>
            <TouchableOpacity style={styles.menuButton}>
              <Text style={styles.menuButtonText}>⚠️ Ver Alertas de Disrupciones</Text>
            </TouchableOpacity>
          </Link>
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
});
