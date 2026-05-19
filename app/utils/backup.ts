import { getStorage, setStorage, STORAGE_KEYS } from "./storage";

export type BackupData = {
  habits: unknown;
  habitNames: unknown;
  habitOrder: unknown;
  goals: unknown;
  planning: unknown;
  trajectory: unknown;
  priorities: unknown;
  progressHistory?: unknown;
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

  const data = value.data;

  return (
    typeof value.version === "number" &&
    typeof value.exportedAt === "string" &&
    isObject(data.habits) &&
    Array.isArray(data.habitNames) &&
    (data.habitOrder === null || Array.isArray(data.habitOrder)) &&
    Array.isArray(data.goals) &&
    Array.isArray(data.planning) &&
    isObject(data.trajectory) &&
    (data.priorities === null || isObject(data.priorities)) &&
    (data.progressHistory === undefined || Array.isArray(data.progressHistory))
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
  };
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
}
