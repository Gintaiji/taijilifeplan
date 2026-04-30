export const STORAGE_KEYS = {
  habits: "taiji-life-plan-habits",
  habitNames: "taiji-life-plan-habit-list",
  habitOrder: "taiji-life-plan-habits-order",
  goals: "taiji-life-plan-objectifs",
  planning: "taiji-life-plan-planning",
  trajectory: "taiji-life-plan-trajectory",
  priorities: "taiji-life-plan-priorities",
} as const;

export function setStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}

export function getStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  const savedValue = localStorage.getItem(key);

  if (savedValue === null) {
    return defaultValue;
  }

  try {
    return JSON.parse(savedValue) as T;
  } catch {
    setStorage(key, defaultValue);
    return defaultValue;
  }
}
