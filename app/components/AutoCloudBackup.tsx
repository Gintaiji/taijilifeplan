"use client";

import { useEffect, useRef, useState } from "react";
import {
  getBackupData,
  isBackupData,
  isBackupDataEmptyOrAlmostEmpty,
} from "../utils/backup";
import { saveCloudBackupSafely } from "../utils/cloudSyncStatus";
import {
  APP_STORAGE_CHANGED_EVENT,
  isAppDataStorageKey,
  type AppStorageChangedDetail,
} from "../utils/storage";
import { addSyncLogEvent } from "../utils/syncLog";
import { getSupabaseSession, onSupabaseAuthChange } from "../utils/supabase";

export const CLOUD_AUTO_BACKUP_EVENT = "taiji-life-plan-cloud-auto-backup";

export type CloudAutoBackupDetail = {
  status: "pending" | "saving" | "success" | "error" | "conflict" | "local-only";
  message: string;
  updatedAt?: string;
};

const AUTO_BACKUP_DELAY = 3000;

function notifyAutoBackup(detail: CloudAutoBackupDetail) {
  window.dispatchEvent(
    new CustomEvent<CloudAutoBackupDetail>(CLOUD_AUTO_BACKUP_EVENT, {
      detail,
    }),
  );
}

export default function AutoCloudBackup() {
  const [userId, setUserId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastSavedSnapshotRef = useRef("");
  const isSavingRef = useRef(false);
  const hasPendingSaveRef = useRef(false);

  useEffect(() => {
    let shouldUpdateState = true;

    async function loadSession() {
      try {
        const currentSession = await getSupabaseSession();

        if (shouldUpdateState) {
          setUserId(currentSession?.user.id ?? null);
        }
      } catch {
        if (shouldUpdateState) {
          setUserId(null);
        }
      }
    }

    void loadSession();

    const unsubscribe = onSupabaseAuthChange((newSession) => {
      setUserId(newSession?.user.id ?? null);
    });

    return () => {
      shouldUpdateState = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function runAutoBackup() {
      if (!userId) {
        notifyAutoBackup({
          status: "local-only",
          message: "Sauvegarde locale uniquement.",
        });
        return;
      }

      const backupData = getBackupData();

      if (
        !isBackupData(backupData) ||
        isBackupDataEmptyOrAlmostEmpty(backupData)
      ) {
        addSyncLogEvent(
          "auto-save-skipped-empty",
          "Sauvegarde automatique ignoree : les donnees locales sont vides.",
        );
        return;
      }

      const snapshot = JSON.stringify(backupData);

      if (snapshot === lastSavedSnapshotRef.current) {
        return;
      }

      if (isSavingRef.current) {
        hasPendingSaveRef.current = true;
        return;
      }

      isSavingRef.current = true;

      try {
        notifyAutoBackup({
          status: "saving",
          message: "Sauvegarde cloud en cours.",
        });

        const result = await saveCloudBackupSafely(userId);

        if (result.status === "conflict") {
          addSyncLogEvent(
            "cloud-newer",
            "Sauvegarde automatique bloquee : une version cloud plus recente existe.",
          );
          notifyAutoBackup({
            status: "conflict",
            message: "Une version cloud plus recente existe.",
            updatedAt: result.cloudUpdatedAt ?? undefined,
          });
          return;
        }

        if (result.status === "empty") {
          addSyncLogEvent(
            "auto-save-skipped-empty",
            "Sauvegarde automatique ignoree : les donnees locales sont vides.",
          );
          return;
        }

        lastSavedSnapshotRef.current = snapshot;
        addSyncLogEvent(
          "auto-save-success",
          "Sauvegarde automatique cloud reussie.",
        );
        notifyAutoBackup({
          status: "success",
          message: "Sauvegarde automatique cloud reussie.",
          updatedAt: result.updatedAt,
        });
      } catch {
        addSyncLogEvent(
          "save-error",
          "Erreur pendant la sauvegarde automatique cloud.",
        );
        notifyAutoBackup({
          status: "error",
          message: "Sauvegarde automatique cloud impossible pour le moment.",
        });
      } finally {
        isSavingRef.current = false;

        if (hasPendingSaveRef.current) {
          hasPendingSaveRef.current = false;
          scheduleAutoBackup();
        }
      }
    }

    function scheduleAutoBackup() {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        void runAutoBackup();
      }, AUTO_BACKUP_DELAY);
    }

    function handleStorageChanged(event: Event) {
      const customEvent = event as CustomEvent<AppStorageChangedDetail>;
      const storageKey = customEvent.detail?.key;

      if (!storageKey || !isAppDataStorageKey(storageKey)) {
        return;
      }

      const backupData = getBackupData();

      if (
        !isBackupData(backupData) ||
        isBackupDataEmptyOrAlmostEmpty(backupData)
      ) {
        addSyncLogEvent(
          "auto-save-skipped-empty",
          "Sauvegarde automatique ignoree : les donnees locales sont vides.",
        );
        return;
      }

      notifyAutoBackup({
        status: userId ? "pending" : "local-only",
        message: userId
          ? "Modifications locales en attente."
          : "Sauvegarde locale uniquement.",
      });

      scheduleAutoBackup();
    }

    window.addEventListener(APP_STORAGE_CHANGED_EVENT, handleStorageChanged);

    return () => {
      window.removeEventListener(APP_STORAGE_CHANGED_EVENT, handleStorageChanged);

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [userId]);

  return null;
}
