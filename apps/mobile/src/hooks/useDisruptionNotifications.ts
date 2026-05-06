import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { Disruption } from "@route-helper/shared";

// Configurar cómo se muestran las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useDisruptionNotifications() {
  const previousDisruptionsRef = useRef<Disruption[]>([]);

  const checkForNewDisruptions = async (newDisruptions: Disruption[]) => {
    const previousIds = new Set(previousDisruptionsRef.current.map((d) => d.id));
    const newIds = new Set(newDisruptions.map((d) => d.id));

    // Encontrar disrupciones nuevas
    const newDisruptionsArray = newDisruptions.filter((d) => !previousIds.has(d.id));

    // Encontrar disrupciones que cambiaron de severidad o descripción
    const updatedDisruptions = newDisruptions.filter((d) => {
      const previous = previousDisruptionsRef.current.find((p) => p.id === d.id);
      return (
        previous &&
        (previous.severity !== d.severity || previous.description !== d.description)
      );
    });

    // Enviar notificación por cada disrupción nueva
    for (const disruption of newDisruptionsArray) {
      await sendDisruptionNotification(disruption, "NEW");
    }

    // Enviar notificación por disrupciones actualizadas con severidad alta
    for (const disruption of updatedDisruptions) {
      if (disruption.severity === "high") {
        await sendDisruptionNotification(disruption, "UPDATED");
      }
    }

    // Actualizar referencia
    previousDisruptionsRef.current = newDisruptions;
  };

  return { checkForNewDisruptions };
}

async function sendDisruptionNotification(
  disruption: Disruption,
  type: "NEW" | "UPDATED"
) {
  const title =
    type === "NEW"
      ? `⚠️ Nueva disrupción: ${disruption.title}`
      : `🔄 Actualización: ${disruption.title}`;

  const message =
    type === "NEW"
      ? `${disruption.description} ${disruption.affectedRoute ? `(${disruption.affectedRoute})` : ""}`
      : `Severidad: ${
          disruption.severity === "high"
            ? "Alta"
            : disruption.severity === "medium"
              ? "Media"
              : "Baja"
        }`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: message,
      data: {
        disruptionId: disruption.id,
      },
      sound: "default",
      badge: 1,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
    },
  });
}
