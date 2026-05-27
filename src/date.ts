export const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getMonthDays = (anchorDate: Date): Date[] => {
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const dates: Date[] = [];

  for (let day = firstDay.getDate(); day <= lastDay.getDate(); day += 1) {
    dates.push(new Date(year, month, day));
  }

  return dates;
};

export const monthLabel = (date: Date): string => {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};
