import {
  getLocalDataUpdatedAt,
  getStorage,
  saveLocalDataUpdatedAt,
  setStorage,
  STORAGE_KEYS,
} from "./storage";

export type BackupData = {
  habits: unknown;
  habitNames: unknown;
  habitOrder: unknown;
  goals: unknown;
  planning: unknown;
  trajectory: unknown;
  priorities: unknown;
  progressHistory?: unknown;
  settings?: {
    lastBackupExport?: string | null;
    localDataUpdatedAt?: string | null;
  };
};

export type BackupFile = {
  version: number;
  exportedAt: string;
  data: BackupData;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isBackupFile(value: unknown): value is BackupFile {
  if (!isObject(value) || !isObject(value.data)) {
    return false;
  }

  return (
    typeof value.version === "number" &&
    typeof value.exportedAt === "string" &&
    isBackupData(value.data)
  );
}

export function isBackupData(value: unknown): value is BackupData {
  if (!isObject(value)) {
    return false;
  }

  return (
    isObject(value.habits) &&
    Array.isArray(value.habitNames) &&
    (value.habitOrder === null || Array.isArray(value.habitOrder)) &&
    Array.isArray(value.goals) &&
    Array.isArray(value.planning) &&
    isObject(value.trajectory) &&
    (value.priorities === null || isObject(value.priorities)) &&
    (value.progressHistory === undefined ||
      Array.isArray(value.progressHistory)) &&
    (value.settings === undefined || isObject(value.settings))
  );
}

export function getBackupData(): BackupData {
  return {
    habits: getStorage<unknown>(STORAGE_KEYS.habits, {}),
    habitNames: getStorage<unknown>(STORAGE_KEYS.habitNames, []),
    habitOrder: getStorage<unknown | null>(STORAGE_KEYS.habitOrder, null),
    goals: getStorage<unknown>(STORAGE_KEYS.goals, []),
    planning: getStorage<unknown>(STORAGE_KEYS.planning, []),
    trajectory: getStorage<unknown>(STORAGE_KEYS.trajectory, {}),
    priorities: getStorage<unknown | null>(STORAGE_KEYS.dailyObjectives, null),
    progressHistory: getStorage<unknown>(STORAGE_KEYS.progressHistory, []),
    settings: {
      lastBackupExport: getStorage<string | null>(
        STORAGE_KEYS.lastBackupExport,
        null,
      ),
      localDataUpdatedAt: getLocalDataUpdatedAt(),
    },
  };
}

function getObjectSize(value: unknown) {
  if (!isObject(value)) {
    return 0;
  }

  return Object.keys(value).length;
}

function getArraySize(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

export function getBackupDataSize(data: BackupData) {
  return (
    getObjectSize(data.habits) +
    getArraySize(data.habitNames) +
    getArraySize(data.habitOrder) +
    getArraySize(data.goals) +
    getArraySize(data.planning) +
    getObjectSize(data.trajectory) +
    getObjectSize(data.priorities) +
    getArraySize(data.progressHistory)
  );
}

export function isBackupDataEmptyOrAlmostEmpty(data: BackupData) {
  return getBackupDataSize(data) <= 1;
}

export function createBackupFile(): BackupFile {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: getBackupData(),
  };
}

export function getLastBackupExportDate() {
  return getStorage<string | null>(STORAGE_KEYS.lastBackupExport, null);
}

export function saveLastBackupExportDate(exportedAt: string) {
  setStorage(STORAGE_KEYS.lastBackupExport, exportedAt);
}

export function downloadJsonFile(fileName: string, content: BackupFile) {
  const jsonContent = JSON.stringify(content, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function importBackupData(data: BackupData) {
  setStorage(STORAGE_KEYS.habits, data.habits);
  setStorage(STORAGE_KEYS.habitNames, data.habitNames);
  setStorage(STORAGE_KEYS.goals, data.goals);
  setStorage(STORAGE_KEYS.planning, data.planning);
  setStorage(STORAGE_KEYS.trajectory, data.trajectory);
  setStorage(STORAGE_KEYS.dailyObjectives, data.priorities);
  setStorage(STORAGE_KEYS.habitOrder, data.habitOrder);

  if (data.progressHistory !== undefined) {
    setStorage(STORAGE_KEYS.progressHistory, data.progressHistory);
  }

  if (typeof data.settings?.lastBackupExport === "string") {
    setStorage(STORAGE_KEYS.lastBackupExport, data.settings.lastBackupExport);
  }

  if (typeof data.settings?.localDataUpdatedAt === "string") {
    saveLocalDataUpdatedAt(data.settings.localDataUpdatedAt);
  }
}
