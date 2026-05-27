# Habits Tracking App

https://github.com/Marley-B/SoftwereEng in brach lab6/HabitTracker

## Prompts
1. Looking at the current code as a template, we are going to create a new app, can you change the code so it only has the most basic stuff relating to the inicialization of a new project? 
2. We want to create a Habit Tracker app, to do this we first want to implement an object that will be the individual habits, for this make it so we can create multiple habits at the same time. Make it so that they have a name.
3. Make the habits be able to be togled on an off
4. Make it so you can undo the previouse acction and show a confirmation text with what action just took place
5. Create a monthlly calendar with percentages, and depending on how many togled on habits you have on a given day the percentage goes app and down, also make it so that if you toggle a habit on, it adds to complition on the current date, and if the date changes the habit defaults to toggled off.
6. Make it so you can delete any active habits
7. Make it so all the current habits show to the left of the calendar

## Screenshots 
<img width="1600" height="890" alt="WhatsApp Image 2026-05-27 at 15 39 02" src="https://github.com/user-attachments/assets/99fde739-2ce6-4e56-b727-74ad7466a3ab" />
<img width="1660" height="912" alt="image" src="https://github.com/user-attachments/assets/014ca427-6eb6-4dde-878d-d3657548e728" />
<img width="1307" height="910" alt="image" src="https://github.com/user-attachments/assets/34d904f8-10ae-4487-a793-3f7b8487ea70" />
<img width="1379" height="904" alt="image" src="https://github.com/user-attachments/assets/969b3d1b-3a40-46e2-8b00-6e42611abcb8" />

## Lessons learned
AI can be finickey some times but if you properly explain all of you ideas it can easily implement them efficiently

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
