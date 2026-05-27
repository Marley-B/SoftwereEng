export interface Habit {
  id: string;
  name: string;
  createdAt: string;
}

export interface DailyCompletion {
  date: string;
  habitIds: string[];
}

export interface AppState {
  habits: Habit[];
  completions: DailyCompletion[];
}

export interface UndoEntry {
  state: AppState;
  description: string;
}
