"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import {
  CLOUD_AUTO_BACKUP_EVENT,
  type CloudAutoBackupDetail,
} from "./AutoCloudBackup";
import { getCloudBackup } from "../utils/cloudBackup";
import {
  CLOUD_SYNC_LABELS,
  formatSyncDate,
  getCloudSyncSnapshot,
  hasLocalBackupDataToSync,
  type CloudSyncSnapshot,
} from "../utils/cloudSyncStatus";
import {
  APP_STORAGE_CHANGED_EVENT,
  getLocalDataUpdatedAt,
  isAppDataStorageKey,
  type AppStorageChangedDetail,
} from "../utils/storage";
import {
  getSupabaseSession,
  onSupabaseAuthChange,
} from "../utils/supabase";
import styles from "../page.module.css";

const initialSnapshot: CloudSyncSnapshot = {
  state: "local-only",
  localUpdatedAt: null,
  cloudUpdatedAt: null,
};

export default function CloudSyncDashboardSummary() {
  const [session, setSession] = useState<Session | null>(null);
  const [snapshot, setSnapshot] = useState<CloudSyncSnapshot>(initialSnapshot);
  const [localOnly, setLocalOnly] = useState(false);

  useEffect(() => {
    let shouldUpdateState = true;

    async function refreshSyncStatus(nextSession: Session | null) {
      const localUpdatedAt = getLocalDataUpdatedAt();

      if (!nextSession) {
        if (shouldUpdateState) {
          setSnapshot(
            getCloudSyncSnapshot({
              session: null,
              localUpdatedAt,
              cloudUpdatedAt: null,
              isSaving: false,
              hasPendingChanges: false,
              hasError: false,
              localOnly: true,
            }),
          );
        }

        return;
      }

      try {
        const cloudBackup = await getCloudBackup(nextSession.user.id);

        if (!shouldUpdateState) {
          return;
        }

        setLocalOnly(false);
        setSnapshot(
          getCloudSyncSnapshot({
            session: nextSession,
            localUpdatedAt,
            cloudUpdatedAt:
              typeof cloudBackup?.updated_at === "string"
                ? cloudBackup.updated_at
                : null,
            isSaving: false,
            hasPendingChanges: false,
            hasError: false,
            localOnly: false,
          }),
        );
      } catch {
        if (!shouldUpdateState) {
          return;
        }

        setLocalOnly(true);
        setSnapshot(
          getCloudSyncSnapshot({
            session: nextSession,
            localUpdatedAt,
            cloudUpdatedAt: null,
            isSaving: false,
            hasPendingChanges: false,
            hasError: false,
            localOnly: true,
          }),
        );
      }
    }

    async function loadSession() {
      try {
        const currentSession = await getSupabaseSession();

        if (!shouldUpdateState) {
          return;
        }

        setSession(currentSession);
        await refreshSyncStatus(currentSession);
      } catch {
        if (!shouldUpdateState) {
          return;
        }

        setLocalOnly(true);
        setSnapshot(
          getCloudSyncSnapshot({
            session: null,
            localUpdatedAt: getLocalDataUpdatedAt(),
            cloudUpdatedAt: null,
            isSaving: false,
            hasPendingChanges: false,
            hasError: false,
            localOnly: true,
          }),
        );
      }
    }

    void loadSession();

    const unsubscribe = onSupabaseAuthChange((newSession) => {
      setSession(newSession);
      void refreshSyncStatus(newSession);
    });

    function handleStorageChanged(event: Event) {
      const customEvent = event as CustomEvent<AppStorageChangedDetail>;
      const storageKey = customEvent.detail?.key;

      if (!storageKey || !isAppDataStorageKey(storageKey)) {
        return;
      }

      if (!hasLocalBackupDataToSync()) {
        return;
      }

      setSnapshot((currentSnapshot) =>
        getCloudSyncSnapshot({
          session,
          localUpdatedAt: getLocalDataUpdatedAt(),
          cloudUpdatedAt: currentSnapshot.cloudUpdatedAt,
          isSaving: false,
          hasPendingChanges: Boolean(session),
          hasError: false,
          localOnly: !session,
        }),
      );
    }

    window.addEventListener(APP_STORAGE_CHANGED_EVENT, handleStorageChanged);

    return () => {
      shouldUpdateState = false;
      unsubscribe();
      window.removeEventListener(APP_STORAGE_CHANGED_EVENT, handleStorageChanged);
    };
  }, [session]);

  useEffect(() => {
    function handleAutoBackup(event: Event) {
      const customEvent = event as CustomEvent<CloudAutoBackupDetail>;
      const detail = customEvent.detail;

      if (detail.status === "checking") {
        setSnapshot((currentSnapshot) => ({
          ...currentSnapshot,
          state: "checking",
          localUpdatedAt: getLocalDataUpdatedAt(),
        }));
        return;
      }

      if (detail.status === "saving") {
        setSnapshot((currentSnapshot) => ({
          ...currentSnapshot,
          state: "saving",
          localUpdatedAt: getLocalDataUpdatedAt(),
        }));
        return;
      }

      if (detail.status === "pending") {
        setSnapshot((currentSnapshot) =>
          getCloudSyncSnapshot({
            session,
            localUpdatedAt: getLocalDataUpdatedAt(),
            cloudUpdatedAt: currentSnapshot.cloudUpdatedAt,
            isSaving: false,
            hasPendingChanges: true,
            hasError: false,
            localOnly: false,
          }),
        );
        return;
      }

      if (detail.status === "local-only") {
        setLocalOnly(true);
        setSnapshot((currentSnapshot) =>
          getCloudSyncSnapshot({
            session,
            localUpdatedAt: getLocalDataUpdatedAt(),
            cloudUpdatedAt: currentSnapshot.cloudUpdatedAt,
            isSaving: false,
            hasPendingChanges: false,
            hasError: false,
            localOnly: true,
          }),
        );
        return;
      }

      if (detail.status === "success") {
        setLocalOnly(false);
        setSnapshot(
          getCloudSyncSnapshot({
            session,
            localUpdatedAt: getLocalDataUpdatedAt(),
            cloudUpdatedAt: detail.updatedAt ?? null,
            isSaving: false,
            hasPendingChanges: false,
            hasError: false,
            localOnly: false,
          }),
        );
        return;
      }

      if (detail.status === "restored" || detail.status === "ready") {
        setLocalOnly(false);
        setSnapshot(
          getCloudSyncSnapshot({
            session,
            localUpdatedAt: getLocalDataUpdatedAt(),
            cloudUpdatedAt: detail.updatedAt ?? snapshot.cloudUpdatedAt,
            isSaving: false,
            hasPendingChanges: false,
            hasError: false,
            localOnly: false,
          }),
        );
        return;
      }

      if (detail.status === "conflict") {
        setSnapshot(
          getCloudSyncSnapshot({
            session,
            localUpdatedAt: getLocalDataUpdatedAt(),
            cloudUpdatedAt: detail.updatedAt ?? null,
            isSaving: false,
            hasPendingChanges: false,
            hasError: false,
            localOnly,
          }),
        );
        return;
      }

      setSnapshot(
        getCloudSyncSnapshot({
          session,
          localUpdatedAt: getLocalDataUpdatedAt(),
          cloudUpdatedAt: snapshot.cloudUpdatedAt,
          isSaving: false,
          hasPendingChanges: false,
          hasError: true,
          localOnly,
        }),
      );
    }

    window.addEventListener(CLOUD_AUTO_BACKUP_EVENT, handleAutoBackup);

    return () => {
      window.removeEventListener(CLOUD_AUTO_BACKUP_EVENT, handleAutoBackup);
    };
  }, [localOnly, session, snapshot.cloudUpdatedAt]);

  return (
    <article className={`${styles.card} ${styles.syncSummaryCard}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.cardTitle}>Sauvegarde cloud</h2>
          <p className={styles.cardText}>{CLOUD_SYNC_LABELS[snapshot.state]}</p>
        </div>
        <span className={styles.syncStatusBadge}>
          {CLOUD_SYNC_LABELS[snapshot.state]}
        </span>
      </div>

      <div className={styles.syncSummaryGrid}>
        <span>Local : {formatSyncDate(snapshot.localUpdatedAt)}</span>
        <span>Cloud : {formatSyncDate(snapshot.cloudUpdatedAt)}</span>
      </div>
    </article>
  );
}
