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

export interface Route {
  id: string;
  name: string;
  startLocation: PlaceRef;
  endLocation: PlaceRef;
  estimatedArrivalTime: number; // in minutes
  createdAt: Date;
}

export const routeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  startLocation: placeRefSchema,
  endLocation: placeRefSchema,
  estimatedArrivalTime: z.number().positive(),
  createdAt: z.date(),
});
