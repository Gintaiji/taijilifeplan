export const STORAGE_KEYS = {
  habits: "taiji-life-plan-habits",
  habitNames: "taiji-life-plan-habit-list",
  habitOrder: "taiji-life-plan-habits-order",
  goals: "taiji-life-plan-objectifs",
  planning: "taiji-life-plan-planning",
  trajectory: "taiji-life-plan-trajectory",
  dailyObjectives: "taiji-life-plan-priorities",
  priorities: "taiji-life-plan-priorities",
  progressHistory: "taiji-life-plan-progress-history",
  lastBackupExport: "taiji-life-plan-last-backup-export",
} as const;

export function clearAppStorage() {
  if (typeof window === "undefined") {
    return;
  }

  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

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

function hasStorageManager() {
  return typeof navigator !== "undefined" && "storage" in navigator;
}

export async function isPersistentStorageGranted() {
  if (!hasStorageManager() || !navigator.storage.persisted) {
    return false;
  }

  return navigator.storage.persisted();
}

export async function requestPersistentStorage() {
  if (!hasStorageManager() || !navigator.storage.persist) {
    return false;
  }

  return navigator.storage.persist();
}
