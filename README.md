# Habits Tracking App

## Plan

1. Build a single main interface where all habits actions are available.
2. Add state management with strict TypeScript interfaces.
3. Persist all state in browser `localStorage`.
4. Add undo support using state snapshots.
5. Show confirmation messages after every user action.
6. Render a compliance calendar for the current month.

## User Stories Coverage

- **US-01 Define personal habits**
  - Main interface form to create habits.
  - Action can be undone using `Undo`.
  - Confirmation toast shown after creation.
  - Saved in `localStorage`.

- **US-02 Mark habits as completed**
  - Checkbox in main habits list for today.
  - Action can be undone using `Undo`.
  - Confirmation toast shown after toggle.
  - Saved in `localStorage`.

- **US-03 Compliance calendar**
  - Main interface includes current month calendar.
  - Calendar updates from saved completion data.
  - If data changes, `Undo` reverts those changes.
  - Confirmation toast shown after user-triggered actions affecting compliance.

- **US-04 Delete old habits**
  - Delete button in main list.
  - Action can be undone using `Undo`.
  - Confirmation toast shown after deletion.
  - Saved in `localStorage`.

## Run

```bash
npm install
npm run dev
```
