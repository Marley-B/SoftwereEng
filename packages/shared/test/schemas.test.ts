import { describe, expect, test } from "bun:test";
import { disruptionResponseSchema, loginBodySchema, registerBodySchema, routeCreateBodySchema } from "../src/index.js";

describe("shared zod schemas", () => {
  test("registerBodySchema validates email and password length", () => {
    expect(registerBodySchema.safeParse({ email: "bad", password: "short", displayName: "A" }).success).toBe(
      false,
    );
    expect(
      registerBodySchema.safeParse({
        email: "ok@example.com",
        password: "longenough",
        displayName: "Name",
      }).success,
    ).toBe(true);
  });

  test("loginBodySchema requires email", () => {
    expect(loginBodySchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(loginBodySchema.safeParse({ email: "a@b.co", password: "secret" }).success).toBe(true);
  });

  test("routeCreateBodySchema accepts minimal valid route body", () => {
    const body = {
      name: "Commute",
      startTime: "8:00",
      expectedArrival: "9:00",
      timeZone: "Europe/Berlin",
      departureLabel: "A",
      destinationLabel: "B",
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      origin: {
        address: "Addr 1",
        lat: 1,
        lng: 2,
        placeId: "ChIJxxxxxxxxxxxxxxxxxxxxxx",
      },
      destination: {
        address: "Addr 2",
        lat: 1.1,
        lng: 2.1,
        placeId: "ChIJyyyyyyyyyyyyyyyyyyyyyy",
      },
      transitSnapshot: {
        optionsRequest: { departureIso: "2026-01-01T08:00:00.000Z", timeZone: "Europe/Berlin" },
        selectedOptionId: "opt1",
        selectedPayload: {},
        baselineDurationSeconds: 1800,
      },
    };
    expect(routeCreateBodySchema.safeParse(body).success).toBe(true);
  });

  test("routeCreateBodySchema rejects empty daysOfWeek", () => {
    const body = {
      name: "Commute",
      startTime: "8:00",
      expectedArrival: "9:00",
      timeZone: "Europe/Berlin",
      departureLabel: "A",
      destinationLabel: "B",
      daysOfWeek: [],
      origin: {
        address: "Addr 1",
        lat: 1,
        lng: 2,
        placeId: "ChIJxxxxxxxxxxxxxxxxxxxxxx",
      },
      destination: {
        address: "Addr 2",
        lat: 1.1,
        lng: 2.1,
        placeId: "ChIJyyyyyyyyyyyyyyyyyyyyyy",
      },
      transitSnapshot: {
        optionsRequest: { departureIso: "2026-01-01T08:00:00.000Z", timeZone: "Europe/Berlin" },
        selectedOptionId: "opt1",
        selectedPayload: {},
        baselineDurationSeconds: 1800,
      },
    };
    expect(routeCreateBodySchema.safeParse(body).success).toBe(false);
  });

  test("routeCreateBodySchema rejects invalid weekday names", () => {
    const body = {
      name: "Commute",
      startTime: "8:00",
      expectedArrival: "9:00",
      timeZone: "Europe/Berlin",
      departureLabel: "A",
      destinationLabel: "B",
      daysOfWeek: ["funday"],
      origin: {
        address: "Addr 1",
        lat: 1,
        lng: 2,
        placeId: "ChIJxxxxxxxxxxxxxxxxxxxxxx",
      },
      destination: {
        address: "Addr 2",
        lat: 1.1,
        lng: 2.1,
        placeId: "ChIJyyyyyyyyyyyyyyyyyyyyyy",
      },
      transitSnapshot: {
        optionsRequest: { departureIso: "2026-01-01T08:00:00.000Z", timeZone: "Europe/Berlin" },
        selectedOptionId: "opt1",
        selectedPayload: {},
        baselineDurationSeconds: 1800,
      },
    };
    expect(routeCreateBodySchema.safeParse(body).success).toBe(false);
  });

  test("disruptionResponseSchema accepts suggested alternatives", () => {
    expect(
      disruptionResponseSchema.safeParse({
        id: "11111111-1111-4111-8111-111111111111",
        occurredAt: "2026-01-01T08:00:00.000Z",
        description: "Route delayed",
        severity: "warn",
        routeId: "22222222-2222-4222-8222-222222222222",
        affectedRoutes: ["Morning route"],
        suggestedAlternative: {
          id: "alt-1",
          label: "32 min",
          durationSeconds: 1920,
          savingsSeconds: 480,
          segments: [{ kind: "transit", modeLabel: "Subway", line: "M1" }],
          payload: {},
          summary: "Saves about 8 min with 32 min",
        },
      }).success,
    ).toBe(true);
  });
});
