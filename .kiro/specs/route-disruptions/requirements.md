# Requirements Document

## Introduction

The Route Disruptions feature adds a dedicated screen to the mobile app where users can view active service disruptions affecting their transit routes. A `MessageSquareWarning` icon button in the HomeScreen header replaces the existing "Sign out" ghost button and opens the Route Disruptions screen. The screen displays a list of disruptions — each with a timestamp, a description, and the affected route(s) — fetched from the API (hardcoded mock data until the backend is ready). The screen follows the existing app design system (`authTheme`) and provides a way to navigate back to the HomeScreen.

## Glossary

- **App**: The React Native / Expo mobile application.
- **HomeScreen**: The main authenticated screen displaying the user's saved routes.
- **DisruptionsScreen**: The new screen that lists route disruptions.
- **Disruption**: A service event that affects one or more transit routes, described by a timestamp, a human-readable description, and a list of affected route names.
- **DisruptionList**: The scrollable list of `Disruption` items rendered on the `DisruptionsScreen`.
- **DisruptionsButton**: The `MessageSquareWarning` icon button placed in the HomeScreen header that opens the `DisruptionsScreen`.
- **MockDisruptionData**: Hardcoded static disruption records used until the real API endpoint is available.
- **authTheme**: The shared design-token object (`colors`, `space`, `typography`, `radii`) used throughout the app.
- **Navigator**: The lightweight state-based screen switcher already used by `AuthNavigator` and `App`; no third-party navigation library is installed.

---

## Requirements

### Requirement 1: Disruptions Entry Point in HomeScreen Header

**User Story:** As an authenticated user, I want a clearly visible icon button in the HomeScreen header, so that I can quickly navigate to the Route Disruptions screen.

#### Acceptance Criteria

1. THE `HomeScreen` SHALL render a `DisruptionsButton` in the top-right area of the header row, replacing the existing "Sign out" `AuthGhostButton`.
2. THE `DisruptionsButton` SHALL display the `MessageSquareWarning` icon from `lucide-react-native` at a size and color consistent with `authTheme`.
3. WHEN the `DisruptionsButton` is pressed, THE `App` SHALL display the `DisruptionsScreen` in place of the `HomeScreen`.
4. THE `DisruptionsButton` SHALL have an `accessibilityLabel` of `"View route disruptions"` and `accessibilityRole` of `"button"`.
5. THE `DisruptionsButton` SHALL apply a pressed-state opacity reduction consistent with other interactive elements in the app.

---

### Requirement 2: Route Disruptions Screen Layout

**User Story:** As an authenticated user, I want a dedicated screen for route disruptions, so that I can read all current service issues in one place.

#### Acceptance Criteria

1. THE `DisruptionsScreen` SHALL render inside a `SafeAreaView` with `backgroundColor` set to `authTheme.colors.background`.
2. THE `DisruptionsScreen` SHALL display a page title of `"Route disruptions"` styled with `authTheme.typography.title` and `authTheme.colors.foreground`.
3. THE `DisruptionsScreen` SHALL display a subtitle or descriptive line below the title styled with `authTheme.typography.body` and `authTheme.colors.muted`.
4. THE `DisruptionsScreen` SHALL render the `DisruptionList` as a vertically scrollable `FlatList`.
5. THE `DisruptionsScreen` SHALL use `authTheme` spacing, typography, radii, and color tokens exclusively — no hardcoded style values outside of `authTheme`.

---

### Requirement 3: Back Navigation from Disruptions Screen

**User Story:** As an authenticated user, I want a way to return to the HomeScreen from the Disruptions screen, so that I am never stuck on the disruptions view.

#### Acceptance Criteria

1. THE `DisruptionsScreen` SHALL render a back-navigation control in the header area.
2. WHEN the back-navigation control is pressed, THE `App` SHALL display the `HomeScreen` again.
3. THE back-navigation control SHALL have an `accessibilityLabel` of `"Go back"` and `accessibilityRole` of `"button"`.
4. THE back-navigation control SHALL be visually consistent with the `DisruptionsButton` style (icon or ghost-text button using `authTheme` tokens).

---

### Requirement 4: Disruption Data Model and Mock Data

**User Story:** As a developer, I want a well-defined disruption data model and realistic mock data, so that the UI can be built and tested before the backend is ready.

#### Acceptance Criteria

1. THE `App` SHALL define a `Disruption` type with the fields: `id` (string), `occurredAt` (string — ISO 8601 or human-readable time), `description` (string), and `affectedRoutes` (string array of route names).
2. THE `MockDisruptionData` SHALL contain at least three `Disruption` records covering a variety of affected-route counts (single route, multiple routes).
3. THE `MockDisruptionData` SHALL be stored in a dedicated file (e.g., `mockDisruptions.ts`) inside the `routes` feature folder, following the same pattern as `mockRoutes.ts`.
4. WHEN the `DisruptionsScreen` mounts, THE `DisruptionsScreen` SHALL load disruptions from `MockDisruptionData` with a simulated async delay consistent with `fetchRoutes`.
5. IF the disruption data load fails, THEN THE `DisruptionsScreen` SHALL display a descriptive error message styled with `authTheme.colors.danger`.

---

### Requirement 5: Disruption List Item Display

**User Story:** As an authenticated user, I want each disruption to show the time it occurred, a description, and the affected routes, so that I can quickly assess the impact on my journey.

#### Acceptance Criteria

1. THE `DisruptionList` SHALL render one card per `Disruption` record.
2. EACH disruption card SHALL display the `occurredAt` value labelled clearly (e.g., prefixed with a clock icon or "At:" label).
3. EACH disruption card SHALL display the `description` field in full, wrapping across multiple lines if necessary.
4. EACH disruption card SHALL display all entries in `affectedRoutes`, visually grouped (e.g., as comma-separated text or individual pill/badge elements).
5. THE disruption card SHALL use `authTheme.colors.surface` as its background, `authTheme.radii.screen` for border radius, and `authTheme.space` tokens for internal padding and gap — matching the visual style of existing list cards in the app.
6. WHEN the `DisruptionList` is empty, THE `DisruptionsScreen` SHALL display the message `"No disruptions reported."` styled with `authTheme.colors.muted`.
7. WHILE disruption data is loading, THE `DisruptionsScreen` SHALL display an `ActivityIndicator` using `authTheme.colors.primary`.

---

### Requirement 6: Screen Navigation Integration

**User Story:** As a developer, I want the new screen to integrate with the existing state-based navigation pattern, so that no new navigation library is required.

#### Acceptance Criteria

1. THE `App` (or a wrapping navigator component) SHALL manage an `activeScreen` state that can be `"home"` or `"disruptions"`.
2. WHEN `activeScreen` is `"home"`, THE `App` SHALL render the `HomeScreen`.
3. WHEN `activeScreen` is `"disruptions"`, THE `App` SHALL render the `DisruptionsScreen`.
4. THE `HomeScreen` SHALL receive an `onOpenDisruptions` callback prop that sets `activeScreen` to `"disruptions"`.
5. THE `DisruptionsScreen` SHALL receive an `onBack` callback prop that sets `activeScreen` to `"home"`.
6. THE `App` SHALL pass the `onOpenDisruptions` and `onBack` callbacks without introducing any third-party navigation dependency.
