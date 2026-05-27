import { formatDateKey, getMonthDays, monthLabel } from "./date";
import { HabitStore } from "./state";

const createMainTemplate = (): string => {
  return `
    <main class="container">
      <section class="panel">
        <h1>Habits Tracker</h1>
        <p class="subtitle">Track routines, mark progress, and review your month.</p>
        <form id="habit-form" class="habit-form">
          <input id="habit-input" name="habit-input" type="text" placeholder="Add a habit..." required maxlength="80" />
          <button type="submit">Add Habit</button>
        </form>
        <div class="actions-row">
          <button id="undo-button" type="button">Undo</button>
          <span id="today-label"></span>
        </div>
        <ul id="habit-list" class="habit-list"></ul>
      </section>
      <section class="panel">
        <h2 id="calendar-title"></h2>
        <div id="calendar-grid" class="calendar-grid"></div>
      </section>
      <div id="toast" class="toast" aria-live="polite"></div>
    </main>
  `;
};

const formatCompliance = (ratio: number): string => {
  return `${Math.round(ratio * 100)}%`;
};

export const renderApp = (root: HTMLElement): void => {
  const store = new HabitStore();
  root.innerHTML = createMainTemplate();

  const form = root.querySelector<HTMLFormElement>("#habit-form");
  const input = root.querySelector<HTMLInputElement>("#habit-input");
  const undoButton = root.querySelector<HTMLButtonElement>("#undo-button");
  const habitList = root.querySelector<HTMLUListElement>("#habit-list");
  const calendarTitle = root.querySelector<HTMLHeadingElement>("#calendar-title");
  const calendarGrid = root.querySelector<HTMLDivElement>("#calendar-grid");
  const toast = root.querySelector<HTMLDivElement>("#toast");
  const todayLabel = root.querySelector<HTMLSpanElement>("#today-label");

  if (!form || !input || !undoButton || !habitList || !calendarTitle || !calendarGrid || !toast || !todayLabel) {
    throw new Error("Main interface failed to initialize.");
  }

  const today = formatDateKey(new Date());
  const showToast = (message: string): void => {
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2200);
  };

  const render = (): void => {
    const state = store.getState();
    todayLabel.textContent = `Today: ${today}`;
    undoButton.disabled = !store.canUndo();

    habitList.innerHTML = "";
    if (state.habits.length === 0) {
      const item = document.createElement("li");
      item.className = "habit-empty";
      item.textContent = "No habits yet. Add your first one.";
      habitList.appendChild(item);
    }

    state.habits.forEach((habit) => {
      const item = document.createElement("li");
      item.className = "habit-item";

      const left = document.createElement("div");
      left.className = "habit-main";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = store.isHabitCompletedOnDate(habit.id, today);
      checkbox.setAttribute("aria-label", `Complete ${habit.name}`);
      checkbox.addEventListener("change", () => {
        const done = store.toggleHabitCompletion(habit.id, today);
        showToast(done ? `Marked "${habit.name}" as completed.` : `Marked "${habit.name}" as not completed.`);
        render();
      });

      const label = document.createElement("span");
      label.textContent = habit.name;

      left.append(checkbox, label);

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "danger";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => {
        store.deleteHabit(habit.id);
        showToast(`Deleted "${habit.name}".`);
        render();
      });

      item.append(left, deleteButton);
      habitList.appendChild(item);
    });

    const monthAnchor = new Date();
    const days = getMonthDays(monthAnchor);
    calendarTitle.textContent = `Compliance Calendar - ${monthLabel(monthAnchor)}`;
    calendarGrid.innerHTML = "";

    days.forEach((day) => {
      const dateKey = formatDateKey(day);
      const ratio = store.getCompletionRatio(dateKey);
      const cell = document.createElement("article");
      cell.className = "calendar-cell";
      cell.innerHTML = `
        <strong>${day.getDate()}</strong>
        <span>${formatCompliance(ratio)}</span>
      `;
      calendarGrid.appendChild(cell);
    });
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = input.value.trim();
    if (!name) {
      return;
    }

    store.addHabit(name);
    input.value = "";
    showToast(`Added "${name}".`);
    render();
  });

  undoButton.addEventListener("click", () => {
    const undo = store.undo();
    if (!undo) {
      return;
    }

    showToast(`Undid: ${undo.description}.`);
    render();
  });

  render();
};
