"use client";

import { useEffect, useRef, useState } from "react";
import {
  getBackupData,
  importBackupData,
  isBackupData,
  isBackupDataEmptyOrAlmostEmpty,
} from "../utils/backup";
import { getCloudBackup, isCloudBackupNewerThanLocal } from "../utils/cloudBackup";
import { saveCloudBackupSafely } from "../utils/cloudSyncStatus";
import {
  APP_STORAGE_CHANGED_EVENT,
  getLocalDataUpdatedAt,
  isAppDataStorageKey,
  saveLocalDataUpdatedAt,
  type AppStorageChangedDetail,
} from "../utils/storage";
import { addSyncLogEvent } from "../utils/syncLog";
import { getSupabaseSession, onSupabaseAuthChange } from "../utils/supabase";

export const CLOUD_AUTO_BACKUP_EVENT = "taiji-life-plan-cloud-auto-backup";

export type CloudAutoBackupDetail = {
  status:
    | "checking"
    | "pending"
    | "saving"
    | "success"
    | "error"
    | "conflict"
    | "restored"
    | "ready"
    | "local-only";
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
  const [initialCloudCheckDone, setInitialCloudCheckDone] = useState(false);
  const timerRef = useRef<number | null>(null);
  const lastSavedSnapshotRef = useRef("");
  const isSavingRef = useRef(false);
  const hasPendingSaveRef = useRef(false);
  const autoSyncPausedRef = useRef(true);
  const isRestoringFromCloudRef = useRef(false);
  const cloudBootstrapIdRef = useRef(0);

  useEffect(() => {
    let shouldUpdateState = true;

    async function runInitialCloudCheck(sessionUserId: string | null) {
      const bootstrapId = cloudBootstrapIdRef.current + 1;

      cloudBootstrapIdRef.current = bootstrapId;
      autoSyncPausedRef.current = true;
      setInitialCloudCheckDone(false);
      notifyAutoBackup({
        status: "checking",
        message: "Verification cloud en cours.",
      });

      try {
        if (!sessionUserId) {
          if (shouldUpdateState && bootstrapId === cloudBootstrapIdRef.current) {
            setUserId(null);
            setInitialCloudCheckDone(true);
            autoSyncPausedRef.current = false;
            notifyAutoBackup({
              status: "local-only",
              message: "Sauvegarde locale uniquement.",
            });
          }

          return;
        }

        const cloudBackup = await getCloudBackup(sessionUserId);
        const localBackupData = getBackupData();
        const localDataIsEmpty = isBackupDataEmptyOrAlmostEmpty(localBackupData);
        const validCloudBackupData =
          cloudBackup && isBackupData(cloudBackup.data)
            ? cloudBackup.data
            : null;
        const cloudHasData =
          validCloudBackupData !== null &&
          !isBackupDataEmptyOrAlmostEmpty(validCloudBackupData);

        if (!shouldUpdateState || bootstrapId !== cloudBootstrapIdRef.current) {
          return;
        }

        if (
          localDataIsEmpty &&
          cloudBackup &&
          validCloudBackupData &&
          cloudHasData
        ) {
          isRestoringFromCloudRef.current = true;
          notifyAutoBackup({
            status: "checking",
            message: "Chargement depuis le cloud en cours.",
          });

          importBackupData(validCloudBackupData);
          saveLocalDataUpdatedAt(cloudBackup.updated_at ?? undefined);
          lastSavedSnapshotRef.current = JSON.stringify(getBackupData());
          addSyncLogEvent(
            "restore-success",
            "Sauvegarde chargee automatiquement depuis le cloud.",
          );
          notifyAutoBackup({
            status: "restored",
            message:
              "Sauvegarde chargee depuis le cloud. Sauvegarde automatique activee.",
            updatedAt: cloudBackup.updated_at ?? undefined,
          });
          isRestoringFromCloudRef.current = false;
        } else if (
          !localDataIsEmpty &&
          cloudBackup &&
          cloudHasData &&
          isCloudBackupNewerThanLocal(
            cloudBackup.updated_at,
            getLocalDataUpdatedAt(),
          )
        ) {
          addSyncLogEvent(
            "cloud-newer",
            "Sauvegarde automatique en attente : une version cloud plus recente existe.",
          );
          notifyAutoBackup({
            status: "conflict",
            message:
              "Une version cloud plus recente existe. Chargement propose avant la sauvegarde automatique.",
            updatedAt: cloudBackup.updated_at ?? undefined,
          });
        } else {
          notifyAutoBackup({
            status: "ready",
            message: "Sauvegarde automatique activee.",
            updatedAt: cloudBackup?.updated_at ?? undefined,
          });
        }

        if (shouldUpdateState && bootstrapId === cloudBootstrapIdRef.current) {
          setUserId(sessionUserId);
          setInitialCloudCheckDone(true);
          autoSyncPausedRef.current = false;
        }
      } catch {
        if (shouldUpdateState && bootstrapId === cloudBootstrapIdRef.current) {
          setUserId(sessionUserId);
          setInitialCloudCheckDone(true);
          autoSyncPausedRef.current = false;
          notifyAutoBackup({
            status: "error",
            message: "Verification cloud impossible pour le moment.",
          });
        }
      }
    }

    async function loadSession() {
      try {
        const currentSession = await getSupabaseSession();

        await runInitialCloudCheck(currentSession?.user.id ?? null);
      } catch {
        await runInitialCloudCheck(null);
      }
    }

    void loadSession();

    const unsubscribe = onSupabaseAuthChange((newSession) => {
      void runInitialCloudCheck(newSession?.user.id ?? null);
    });

    return () => {
      shouldUpdateState = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function runAutoBackup() {
      if (
        !initialCloudCheckDone ||
        autoSyncPausedRef.current ||
        isRestoringFromCloudRef.current
      ) {
        notifyAutoBackup({
          status: "checking",
          message: "Verification cloud en cours.",
        });
        return;
      }

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
      if (
        !initialCloudCheckDone ||
        autoSyncPausedRef.current ||
        isRestoringFromCloudRef.current
      ) {
        return;
      }

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

      if (
        !initialCloudCheckDone ||
        autoSyncPausedRef.current ||
        isRestoringFromCloudRef.current
      ) {
        notifyAutoBackup({
          status: "checking",
          message: "Verification cloud en cours.",
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
  }, [initialCloudCheckDone, userId]);

  return null;
}
