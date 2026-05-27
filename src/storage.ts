import type { AppState } from "./types";

const STORAGE_KEY = "habits-tracker-state-v1";

const EMPTY_STATE: AppState = {
  habits: [],
  completions: []
};

const isStateShape = (value: unknown): value is AppState => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AppState>;
  return Array.isArray(candidate.habits) && Array.isArray(candidate.completions);
};

export const loadState = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return EMPTY_STATE;
    }

    const parsed: unknown = JSON.parse(raw);
    return isStateShape(parsed) ? parsed : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
};

export const saveState = (state: AppState): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
