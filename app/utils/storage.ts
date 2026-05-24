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
  localDataUpdatedAt: "taiji-life-plan-local-data-updated-at",
  syncLog: "taiji-life-plan-sync-log",
} as const;

export const APP_STORAGE_CHANGED_EVENT = "taiji-life-plan-storage-changed";

const APP_DATA_STORAGE_KEYS = new Set<string>([
  STORAGE_KEYS.habits,
  STORAGE_KEYS.habitNames,
  STORAGE_KEYS.habitOrder,
  STORAGE_KEYS.goals,
  STORAGE_KEYS.planning,
  STORAGE_KEYS.trajectory,
  STORAGE_KEYS.dailyObjectives,
  STORAGE_KEYS.progressHistory,
  STORAGE_KEYS.lastBackupExport,
]);

export type AppStorageChangedDetail = {
  key: string;
};

export function isAppDataStorageKey(key: string) {
  return APP_DATA_STORAGE_KEYS.has(key);
}

export function getLocalDataUpdatedAt() {
  return getStorage<string | null>(STORAGE_KEYS.localDataUpdatedAt, null);
}

export function saveLocalDataUpdatedAt(updatedAt = new Date().toISOString()) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEYS.localDataUpdatedAt, JSON.stringify(updatedAt));
}

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

  if (isAppDataStorageKey(key)) {
    saveLocalDataUpdatedAt();
  }

  window.dispatchEvent(
    new CustomEvent<AppStorageChangedDetail>(APP_STORAGE_CHANGED_EVENT, {
      detail: { key },
    }),
  );
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
