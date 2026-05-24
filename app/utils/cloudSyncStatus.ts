import type { Session } from "@supabase/supabase-js";
import {
  getBackupData,
  isBackupData,
  isBackupDataEmptyOrAlmostEmpty,
} from "./backup";
import {
  getCloudBackup,
  isCloudBackupNewerThanLocal,
  saveCloudBackup,
} from "./cloudBackup";
import { getLocalDataUpdatedAt } from "./storage";

export type CloudSyncState =
  | "up-to-date"
  | "pending"
  | "saving"
  | "cloud-newer"
  | "signed-out"
  | "error"
  | "local-only";

export type CloudSyncSnapshot = {
  state: CloudSyncState;
  localUpdatedAt: string | null;
  cloudUpdatedAt: string | null;
};

export type ProtectedCloudSaveResult =
  | {
      status: "success";
      updatedAt: string;
    }
  | {
      status: "conflict";
      cloudUpdatedAt: string | null;
    }
  | {
      status: "empty";
    };

export const CLOUD_SYNC_LABELS: Record<CloudSyncState, string> = {
  "up-to-date": "A jour",
  pending: "Modifications locales en attente",
  saving: "Sauvegarde en cours",
  "cloud-newer": "Cloud plus recent disponible",
  "signed-out": "Non connecte",
  error: "Erreur de synchronisation",
  "local-only": "Sauvegarde locale uniquement",
};

export function formatSyncDate(dateValue: string | null) {
  if (!dateValue) {
    return "Aucune date connue";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export function getCloudSyncSnapshot({
  session,
  localUpdatedAt,
  cloudUpdatedAt,
  isSaving,
  hasPendingChanges,
  hasError,
  localOnly,
}: {
  session: Session | null;
  localUpdatedAt: string | null;
  cloudUpdatedAt: string | null;
  isSaving: boolean;
  hasPendingChanges: boolean;
  hasError: boolean;
  localOnly: boolean;
}): CloudSyncSnapshot {
  if (isSaving) {
    return {
      state: "saving",
      localUpdatedAt,
      cloudUpdatedAt,
    };
  }

  if (hasError) {
    return {
      state: "error",
      localUpdatedAt,
      cloudUpdatedAt,
    };
  }

  if (localOnly) {
    return {
      state: "local-only",
      localUpdatedAt,
      cloudUpdatedAt,
    };
  }

  if (!session) {
    return {
      state: "local-only",
      localUpdatedAt,
      cloudUpdatedAt,
    };
  }

  if (hasPendingChanges) {
    return {
      state: "pending",
      localUpdatedAt,
      cloudUpdatedAt,
    };
  }

  if (isCloudBackupNewerThanLocal(cloudUpdatedAt, localUpdatedAt)) {
    return {
      state: "cloud-newer",
      localUpdatedAt,
      cloudUpdatedAt,
    };
  }

  return {
    state: "up-to-date",
    localUpdatedAt,
    cloudUpdatedAt,
  };
}

export function hasLocalBackupDataToSync() {
  const backupData = getBackupData();

  return isBackupData(backupData) && !isBackupDataEmptyOrAlmostEmpty(backupData);
}

export async function saveCloudBackupSafely(
  userId: string,
): Promise<ProtectedCloudSaveResult> {
  const backupData = getBackupData();

  if (!isBackupData(backupData) || isBackupDataEmptyOrAlmostEmpty(backupData)) {
    return { status: "empty" };
  }

  const cloudBackup = await getCloudBackup(userId);
  const localUpdatedAt = getLocalDataUpdatedAt();

  if (
    isCloudBackupNewerThanLocal(cloudBackup?.updated_at ?? null, localUpdatedAt)
  ) {
    return {
      status: "conflict",
      cloudUpdatedAt: cloudBackup?.updated_at ?? null,
    };
  }

  const updatedAt = await saveCloudBackup(userId, backupData);

  return {
    status: "success",
    updatedAt,
  };
}
