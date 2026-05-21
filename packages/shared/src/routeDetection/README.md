# Automatic Route Detection Flow

This module contains the pure algorithm for identifying recurring route endpoints from GPS samples. It does not request device permissions, store data, or call Google APIs. Mobile and API code can call it after location samples have already been collected.

## Flow

1. Normalize GPS samples
   - Sort samples by time.
   - Drop invalid coordinates.
   - Drop samples with poor accuracy.

2. Detect stops
   - A stop is a group of samples that stay within a small radius for enough time.
   - Default rule: at least 3 samples within 150 meters for 15 minutes.

3. Cluster recurring endpoints
   - Stops near each other are grouped into one endpoint.
   - Default rule: stops within 200 meters represent the same recurring place.

4. Detect repeated trips
   - Consecutive stops become possible trips.
   - If the same endpoint pair appears repeatedly, it becomes a recurring route candidate.
   - Default rule: the same pair must appear at least 3 times.

5. Return route candidates
   - Each route candidate includes origin, destination, days of week, typical departure time, typical arrival time, trip count, and confidence.

## Privacy Boundary

This module should be used only after the user opts in to location tracking. It intentionally returns suggestions, not saved routes. The user should still confirm a detected route before it is saved into the main `routes` table.

## Intended Integration

```txt
mobile GPS samples
-> API stores samples
-> detectRecurringRoutes(samples)
-> API returns suggestions
-> mobile shows suggestion
-> user confirms and selects transit option
-> existing route creation flow saves the route
```

## Main Function

```ts
detectRecurringRoutes(samples, {
  timeZone: "Europe/Madrid",
});
```

The result is safe to show as a suggestion, but it should not be silently converted into a saved commute because the current app requires the user to choose a transit option snapshot.
