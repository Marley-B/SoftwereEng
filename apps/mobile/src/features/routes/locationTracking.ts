import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import type { LocationSample, LocationSamplesBody } from "@route-helper/shared";

import { apiRequest } from "../../lib/apiClient";

const ROUTE_DETECTION_LOCATION_TASK = "route-helper-location-samples";
const MAX_IN_MEMORY_SAMPLES = 2_000;
const MAX_UPLOAD_BATCH = 100;
const UPLOAD_DEBOUNCE_MS = 10_000;

type Listener = (samples: LocationSample[]) => void;

const listeners = new Set<Listener>();
let samples: LocationSample[] = [];
let pendingUploadSamples: LocationSample[] = [];
let uploadTimer: ReturnType<typeof setTimeout> | null = null;
let isUploading = false;

function publish() {
  const snapshot = [...samples];
  for (const listener of listeners) {
    listener(snapshot);
  }
}

function appendSample(sample: LocationSample) {
  samples = [...samples, sample].slice(-MAX_IN_MEMORY_SAMPLES);
  queueSampleUpload(sample);
  publish();
}

function queueSampleUpload(sample: LocationSample) {
  pendingUploadSamples = [...pendingUploadSamples, sample].slice(-MAX_UPLOAD_BATCH * 5);
  if (uploadTimer) {
    return;
  }
  uploadTimer = setTimeout(() => {
    uploadTimer = null;
    void flushSampleUploads();
  }, UPLOAD_DEBOUNCE_MS);
}

async function flushSampleUploads(): Promise<void> {
  if (isUploading || pendingUploadSamples.length === 0) {
    return;
  }
  isUploading = true;
  const batch = pendingUploadSamples.slice(0, MAX_UPLOAD_BATCH);
  try {
    const body: LocationSamplesBody = {
      samples: batch.map((sample) => ({
        ...(sample.accuracyMeters !== undefined ? { accuracyMeters: sample.accuracyMeters } : {}),
        lat: sample.lat,
        lng: sample.lng,
        recordedAt:
          sample.recordedAt instanceof Date ? sample.recordedAt.toISOString() : sample.recordedAt,
      })),
    };
    await apiRequest<{ inserted: number }>("/me/location-samples", {
      method: "POST",
      json: body,
    });
    pendingUploadSamples = pendingUploadSamples.slice(batch.length);
  } catch {
    // Keep samples in memory; the user can still run local analysis if upload fails.
  } finally {
    isUploading = false;
    if (pendingUploadSamples.length > 0 && !uploadTimer) {
      uploadTimer = setTimeout(() => {
        uploadTimer = null;
        void flushSampleUploads();
      }, UPLOAD_DEBOUNCE_MS);
    }
  }
}

function sampleFromLocation(location: Location.LocationObject): LocationSample {
  return {
    ...(location.coords.accuracy !== null ? { accuracyMeters: location.coords.accuracy } : {}),
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    recordedAt: new Date(location.timestamp).toISOString(),
  };
}

if (Platform.OS !== "web") {
  try {
    TaskManager.defineTask(
      ROUTE_DETECTION_LOCATION_TASK,
      async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations?: Location.LocationObject[] }>) => {
        if (error) {
          return;
        }
        const locations = data?.locations ?? [];
        for (const location of locations) {
          appendSample(sampleFromLocation(location));
        }
      },
    );
  } catch {
    // The task can already be defined after fast refresh.
  }
}

function subscribeRouteDetectionSamples(listener: Listener): () => void {
  listeners.add(listener);
  listener([...samples]);
  return () => {
    listeners.delete(listener);
  };
}

function clearRouteDetectionSamples(): void {
  samples = [];
  publish();
}

export interface UseRouteDetectionTrackingResult {
  clearSamples: () => void;
  error: string | null;
  isBackgroundTracking: boolean;
  isTracking: boolean;
  lastSampleAt: string | null;
  permissionStatus: string | null;
  samples: LocationSample[];
  startBackgroundTracking: () => Promise<void>;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
}

export function useRouteDetectionTracking(): UseRouteDetectionTrackingResult {
  const [trackedSamples, setTrackedSamples] = useState<LocationSample[]>(samples);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isBackgroundTracking, setIsBackgroundTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const foregroundSubscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => subscribeRouteDetectionSamples(setTrackedSamples), []);

  useEffect(() => {
    let cancelled = false;
    void Location.getForegroundPermissionsAsync()
      .then((permission) => {
        if (!cancelled) {
          setPermissionStatus(permission.status);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPermissionStatus(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startTracking = useCallback(async () => {
    setError(null);
    const permission = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(permission.status);
    if (permission.status !== "granted") {
      setError("Location permission was not granted.");
      return;
    }

    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: 10 * 60 * 1000,
      requiredAccuracy: 150,
    });
    if (lastKnown) {
      appendSample(sampleFromLocation(lastKnown));
    }

    foregroundSubscription.current?.remove();
    foregroundSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 100,
        timeInterval: 60_000,
      },
      (location) => {
        appendSample(sampleFromLocation(location));
      },
    );
    setIsTracking(true);
  }, []);

  const startBackgroundTracking = useCallback(async () => {
    setError(null);
    if (Platform.OS === "web") {
      setError("Background GPS tracking is only available on iOS and Android builds.");
      return;
    }

    const foreground = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(foreground.status);
    if (foreground.status !== "granted") {
      setError("Location permission was not granted.");
      return;
    }

    const background = await Location.requestBackgroundPermissionsAsync();
    if (background.status !== "granted") {
      setError("Background location permission was not granted.");
      return;
    }

    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(ROUTE_DETECTION_LOCATION_TASK);
    if (!alreadyStarted) {
      await Location.startLocationUpdatesAsync(ROUTE_DETECTION_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        activityType: Location.ActivityType.Other,
        deferredUpdatesDistance: 200,
        deferredUpdatesInterval: 5 * 60 * 1000,
        distanceInterval: 200,
        foregroundService: {
          notificationBody: "Detecting recurring route endpoints.",
          notificationTitle: "Route detection is active",
        },
        pausesUpdatesAutomatically: true,
        showsBackgroundLocationIndicator: true,
      });
    }
    setIsBackgroundTracking(true);
    await startTracking();
  }, [startTracking]);

  const stopTracking = useCallback(async () => {
    foregroundSubscription.current?.remove();
    foregroundSubscription.current = null;
    setIsTracking(false);
    await flushSampleUploads();

    if (Platform.OS !== "web") {
      const backgroundStarted = await Location.hasStartedLocationUpdatesAsync(ROUTE_DETECTION_LOCATION_TASK);
      if (backgroundStarted) {
        await Location.stopLocationUpdatesAsync(ROUTE_DETECTION_LOCATION_TASK);
      }
    }
    setIsBackgroundTracking(false);
  }, []);

  const clearSamples = useCallback(() => {
    clearRouteDetectionSamples();
  }, []);

  const lastSampleAt = useMemo(() => {
    const last = trackedSamples.at(-1);
    return last?.recordedAt instanceof Date ? last.recordedAt.toISOString() : last?.recordedAt ?? null;
  }, [trackedSamples]);

  return {
    clearSamples,
    error,
    isBackgroundTracking,
    isTracking,
    lastSampleAt,
    permissionStatus,
    samples: trackedSamples,
    startBackgroundTracking,
    startTracking,
    stopTracking,
  };
}
