import { getStorage, setStorage, STORAGE_KEYS } from "./storage";

export const SYNC_LOG_CHANGED_EVENT = "taiji-life-plan-sync-log-changed";

export type SyncLogEventType =
  | "manual-save-started"
  | "manual-save-success"
  | "auto-save-success"
  | "restore-success"
  | "save-error"
  | "restore-error"
  | "cloud-newer"
  | "auto-save-skipped-empty";

export type SyncLogEvent = {
  id: string;
  createdAt: string;
  type: SyncLogEventType;
  message: string;
};

const MAX_SYNC_LOG_EVENTS = 10;

export const SYNC_LOG_TYPE_LABELS: Record<SyncLogEventType, string> = {
  "manual-save-started": "Synchronisation manuelle",
  "manual-save-success": "Sauvegarde manuelle",
  "auto-save-success": "Sauvegarde automatique",
  "restore-success": "Restauration cloud",
  "save-error": "Erreur de sauvegarde",
  "restore-error": "Erreur de restauration",
  "cloud-newer": "Cloud plus recent",
  "auto-save-skipped-empty": "Auto-sync ignoree",
};

function isSyncLogEventType(value: unknown): value is SyncLogEventType {
  return (
    value === "manual-save-started" ||
    value === "manual-save-success" ||
    value === "auto-save-success" ||
    value === "restore-success" ||
    value === "save-error" ||
    value === "restore-error" ||
    value === "cloud-newer" ||
    value === "auto-save-skipped-empty"
  );
}

function normalizeSyncLogEvents(savedEvents: unknown): SyncLogEvent[] {
  if (!Array.isArray(savedEvents)) {
    return [];
  }

  return savedEvents.flatMap((event) => {
    if (typeof event !== "object" || event === null) {
      return [];
    }

    if (
      !("id" in event) ||
      !("createdAt" in event) ||
      !("type" in event) ||
      !("message" in event)
    ) {
      return [];
    }

    if (
      typeof event.id !== "string" ||
      typeof event.createdAt !== "string" ||
      !isSyncLogEventType(event.type) ||
      typeof event.message !== "string"
    ) {
      return [];
    }

    return [
      {
        id: event.id,
        createdAt: event.createdAt,
        type: event.type,
        message: event.message,
      },
    ];
  });
}

function notifySyncLogChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(SYNC_LOG_CHANGED_EVENT));
}

export function getSyncLogEvents() {
  return normalizeSyncLogEvents(
    getStorage<unknown>(STORAGE_KEYS.syncLog, []),
  ).slice(0, MAX_SYNC_LOG_EVENTS);
}

export function addSyncLogEvent(type: SyncLogEventType, message: string) {
  if (typeof window === "undefined") {
    return;
  }

  const createdAt = new Date().toISOString();
  const nextEvents: SyncLogEvent[] = [
    {
      id: `${createdAt}-${Math.random().toString(36).slice(2)}`,
      createdAt,
      type,
      message,
    },
    ...getSyncLogEvents(),
  ].slice(0, MAX_SYNC_LOG_EVENTS);

  setStorage(STORAGE_KEYS.syncLog, nextEvents);
  notifySyncLogChanged();
}

export function clearSyncLogEvents() {
  setStorage(STORAGE_KEYS.syncLog, []);
  notifySyncLogChanged();
}
