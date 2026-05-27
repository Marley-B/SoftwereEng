import { formatDateKey } from "./date";
import { loadState, saveState } from "./storage";
import type { AppState, DailyCompletion, Habit, UndoEntry } from "./types";

const MAX_UNDO_STEPS = 20;

const cloneState = (state: AppState): AppState => {
  return {
    habits: state.habits.map((habit) => ({ ...habit })),
    completions: state.completions.map((entry) => ({
      date: entry.date,
      habitIds: [...entry.habitIds]
    }))
  };
};

export class HabitStore {
  private state: AppState = loadState();
  private undoStack: UndoEntry[] = [];

  getState(): AppState {
    return cloneState(this.state);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  undo(): UndoEntry | null {
    const entry = this.undoStack.pop();
    if (!entry) {
      return null;
    }

    this.state = cloneState(entry.state);
    saveState(this.state);
    return entry;
  }

  addHabit(name: string): Habit {
    this.pushUndo("Add habit");
    const habit: Habit = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString()
    };

    this.state.habits = [...this.state.habits, habit];
    saveState(this.state);
    return habit;
  }

  deleteHabit(habitId: string): void {
    this.pushUndo("Delete habit");
    this.state.habits = this.state.habits.filter((habit) => habit.id !== habitId);
    this.state.completions = this.state.completions.map((entry) => ({
      ...entry,
      habitIds: entry.habitIds.filter((id) => id !== habitId)
    }));
    saveState(this.state);
  }

  toggleHabitCompletion(habitId: string, date = formatDateKey(new Date())): boolean {
    this.pushUndo("Toggle completion");
    const current = this.state.completions.find((entry) => entry.date === date);

    if (!current) {
      const newEntry: DailyCompletion = { date, habitIds: [habitId] };
      this.state.completions = [...this.state.completions, newEntry];
      saveState(this.state);
      return true;
    }

    const isCompleted = current.habitIds.includes(habitId);
    const habitIds = isCompleted
      ? current.habitIds.filter((id) => id !== habitId)
      : [...current.habitIds, habitId];

    this.state.completions = this.state.completions.map((entry) =>
      entry.date === date ? { ...entry, habitIds } : entry
    );
    saveState(this.state);
    return !isCompleted;
  }

  isHabitCompletedOnDate(habitId: string, date: string): boolean {
    const entry = this.state.completions.find((completion) => completion.date === date);
    return Boolean(entry?.habitIds.includes(habitId));
  }

  getCompletionRatio(date: string): number {
    if (this.state.habits.length === 0) {
      return 0;
    }

    const entry = this.state.completions.find((completion) => completion.date === date);
    const completed = entry?.habitIds.length ?? 0;
    return completed / this.state.habits.length;
  }

  private pushUndo(description: string): void {
    const snapshot: UndoEntry = {
      state: cloneState(this.state),
      description
    };

    this.undoStack.push(snapshot);
    if (this.undoStack.length > MAX_UNDO_STEPS) {
      this.undoStack.shift();
    }
  }
}
