import type { Database } from "@route-helper/db";
import { pushTokens, routes, users } from "@route-helper/db";

export const dueCheckNow = new Date("2026-06-01T05:56:00.000Z");

export interface WorkerRouteFixture {
  routeId: string;
  userId: string;
}

interface CreateWorkerRouteFixtureArgs {
  db: Database;
  unique: string;
  routeName?: string;
  expectedArrival?: string;
  includePushToken?: boolean;
}

export async function createWorkerRouteFixture(
  args: CreateWorkerRouteFixtureArgs,
): Promise<WorkerRouteFixture> {
  const {
    db,
    unique,
    routeName = "Worker integration route",
    expectedArrival = "9:30",
    includePushToken = true,
  } = args;

  const [user] = await db
    .insert(users)
    .values({
      email: `${unique}@example.com`,
      passwordHash: "worker-test-password-hash",
      displayName: "Worker Integration",
    })
    .returning({ id: users.id });
  if (!user) {
    throw new Error("Failed to insert worker integration user");
  }

  const [route] = await db
    .insert(routes)
    .values({
      userId: user.id,
      name: routeName,
      startTime: "8:00",
      expectedArrival,
      timezone: "Europe/Amsterdam",
      departureLabel: "Home",
      destinationLabel: "Work",
      origin: {
        address: "Worker test origin",
        lat: 40.7128,
        lng: -74.006,
        placeId: `${unique}-origin`,
      },
      destination: {
        address: "Worker test destination",
        lat: 40.7328,
        lng: -73.986,
        placeId: `${unique}-destination`,
      },
      transitSnapshot: {
        optionsRequest: {
          departureIso: "2026-06-01T12:00:00.000Z",
          timeZone: "Europe/Amsterdam",
        },
        selectedOptionId: "worker-test-option",
        selectedPayload: { stub: true },
        baselineDurationSeconds: 3600,
      },
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    })
    .returning({ id: routes.id });
  if (!route) {
    throw new Error("Failed to insert worker integration route");
  }

  if (includePushToken) {
    await db.insert(pushTokens).values({
      userId: user.id,
      expoPushToken: `ExponentPushToken[${unique}]`,
      deviceId: `${unique}-device`,
    });
  }

  return {
    routeId: route.id,
    userId: user.id,
  };
}
