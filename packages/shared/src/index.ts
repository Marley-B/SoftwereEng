import { z } from "zod";

export interface PlaceRef {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

export const placeRefSchema = z.object({
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  placeId: z.string().min(1)
});

export const commuteModeSchema = z.enum(["driving", "transit", "walking", "bicycling"]);

export const checkStatusSchema = z.enum(["ok", "warn", "fail"]);

// Disruption types and schemas
export type DisruptionSeverity = "low" | "medium" | "high";
export type DisruptionType = "delay" | "closure" | "event" | "incident";

export interface Disruption {
  id: string;
  title: string;
  description: string;
  severity: DisruptionSeverity;
  type: DisruptionType;
  location: string;
  affectedRoute?: string;
  startTime: string;
  endTime?: string;
  createdAt: string;
}

export const disruptionSeveritySchema = z.enum(["low", "medium", "high"]);
export const disruptionTypeSchema = z.enum(["delay", "closure", "event", "incident"]);

export const disruptionSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: disruptionSeveritySchema,
  type: disruptionTypeSchema,
  location: z.string().min(1),
  affectedRoute: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});
