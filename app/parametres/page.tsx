"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import {
  CLOUD_AUTO_BACKUP_EVENT,
  type CloudAutoBackupDetail,
} from "../components/AutoCloudBackup";
import {
  createBackupFile,
  downloadJsonFile,
  getLastBackupExportDate,
  importBackupData,
  isBackupData,
  isBackupFile,
  saveLastBackupExportDate,
} from "../utils/backup";
import {
  clearAppStorage,
  APP_STORAGE_CHANGED_EVENT,
  getLocalDataUpdatedAt,
  isAppDataStorageKey,
  isPersistentStorageGranted,
  requestPersistentStorage,
  saveLocalDataUpdatedAt,
  type AppStorageChangedDetail,
} from "../utils/storage";
import {
  getSupabaseSession,
  onSupabaseAuthChange,
} from "../utils/supabase";
import { getCloudBackup } from "../utils/cloudBackup";
import {
  CLOUD_SYNC_LABELS,
  formatSyncDate,
  getCloudSyncSnapshot,
  hasLocalBackupDataToSync,
  saveCloudBackupSafely,
} from "../utils/cloudSyncStatus";
import {
  addSyncLogEvent,
  clearSyncLogEvents,
  getSyncLogEvents,
  SYNC_LOG_CHANGED_EVENT,
  SYNC_LOG_TYPE_LABELS,
  type SyncLogEvent,
} from "../utils/syncLog";
import styles from "./page.module.css";

const RESET_CONFIRMATION_TEXT = "SUPPRIMER";
const BACKUP_WARNING_DAYS = 3;
const APP_VERSION = "V1.1.0";
const APP_UPDATED_AT = "19 mai 2026";

function formatBackupDate(dateValue: string | null) {
  if (!dateValue) {
    return "Aucune sauvegarde exportee pour le moment";
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

function getDaysSinceBackup(dateValue: string | null) {
  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const oneDay = 24 * 60 * 60 * 1000;

  return Math.floor((Date.now() - date.getTime()) / oneDay);
}

function formatDaysSinceBackup(daysSinceBackup: number | null) {
  if (daysSinceBackup === null) {
    return "Aucune sauvegarde";
  }

  if (daysSinceBackup <= 0) {
    return "Aujourd'hui";
  }

  if (daysSinceBackup === 1) {
    return "1 jour";
  }

  return `${daysSinceBackup} jours`;
}

function formatSyncLogDate(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function ParametresPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef<Session | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isCloudBusy, setIsCloudBusy] = useState(false);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [hasPendingCloudChanges, setHasPendingCloudChanges] = useState(false);
  const [lastCloudBackup, setLastCloudBackup] = useState<string | null>(null);
  const [localDataUpdatedAt, setLocalDataUpdatedAt] = useState<string | null>(
    null,
  );
  const [hasCloudSyncError, setHasCloudSyncError] = useState(false);
  const [isLocalOnly, setIsLocalOnly] = useState(false);
  const [autoBackupMessage, setAutoBackupMessage] = useState("");
  const [autoBackupError, setAutoBackupError] = useState("");
  const [persistentStorage, setPersistentStorage] = useState<boolean | null>(
    null,
  );
  const [lastBackupExport, setLastBackupExport] = useState<string | null>(null);
  const [syncLogEvents, setSyncLogEvents] = useState<SyncLogEvent[]>([]);
  const daysSinceBackup = getDaysSinceBackup(lastBackupExport);
  const shouldShowBackupWarning =
    daysSinceBackup !== null && daysSinceBackup > BACKUP_WARNING_DAYS;
  const userEmail = session?.user.email;
  const cloudSyncSnapshot = getCloudSyncSnapshot({
    session,
    localUpdatedAt: localDataUpdatedAt,
    cloudUpdatedAt: lastCloudBackup,
    isSaving: isCloudSaving,
    hasPendingChanges: hasPendingCloudChanges,
    hasError: hasCloudSyncError,
    localOnly: isLocalOnly,
  });

  async function loadLastCloudBackup(userId: string) {
    try {
      const data = await getCloudBackup(userId);

      setLastCloudBackup(
        typeof data?.updated_at === "string" ? data.updated_at : null,
      );
      setHasCloudSyncError(false);
      setIsLocalOnly(false);
      setHasPendingCloudChanges(false);
    } catch {
      setHasCloudSyncError(true);
    }
  }

  useEffect(() => {
    let shouldUpdateState = true;

    async function loadClientSettings() {
      try {
        const currentSession = await getSupabaseSession();

        if (!shouldUpdateState) {
          return;
        }

        setIsClient(true);
        sessionRef.current = currentSession;
        setSession(currentSession);
        setLastBackupExport(getLastBackupExportDate());
        setSyncLogEvents(getSyncLogEvents());
        setLocalDataUpdatedAt(getLocalDataUpdatedAt());
        setPersistentStorage(await isPersistentStorageGranted());

        if (currentSession) {
          await loadLastCloudBackup(currentSession.user.id);
        }
      } catch {
        if (shouldUpdateState) {
          setIsLocalOnly(true);
          setError("Mode local actif : Supabase n'est pas disponible.");
        }
      } finally {
        if (shouldUpdateState) {
          setIsLoadingSession(false);
        }
      }
    }

    void loadClientSettings();

    const unsubscribe = onSupabaseAuthChange((newSession) => {
      sessionRef.current = newSession;
      setSession(newSession);
      setLastCloudBackup(null);
      setHasCloudSyncError(false);
      setIsLocalOnly(!newSession);
      setHasPendingCloudChanges(false);

      if (newSession) {
        void loadLastCloudBackup(newSession.user.id);
      }
    });

    function handleStorageChanged(event: Event) {
      const customEvent = event as CustomEvent<AppStorageChangedDetail>;
      const storageKey = customEvent.detail?.key;

      setLocalDataUpdatedAt(getLocalDataUpdatedAt());

      if (!storageKey || !isAppDataStorageKey(storageKey)) {
        return;
      }

      if (!hasLocalBackupDataToSync()) {
        return;
      }

      if (!sessionRef.current) {
        setIsLocalOnly(true);
        setHasPendingCloudChanges(false);
        return;
      }

      setHasCloudSyncError(false);
      setIsLocalOnly(false);
      setHasPendingCloudChanges(true);
    }

    window.addEventListener(APP_STORAGE_CHANGED_EVENT, handleStorageChanged);

    function handleSyncLogChanged() {
      setSyncLogEvents(getSyncLogEvents());
    }

    window.addEventListener(SYNC_LOG_CHANGED_EVENT, handleSyncLogChanged);

    return () => {
      shouldUpdateState = false;
      unsubscribe();
      window.removeEventListener(APP_STORAGE_CHANGED_EVENT, handleStorageChanged);
      window.removeEventListener(SYNC_LOG_CHANGED_EVENT, handleSyncLogChanged);
    };
  }, []);

  useEffect(() => {
    function handleAutoBackup(event: Event) {
      const customEvent = event as CustomEvent<CloudAutoBackupDetail>;
      const detail = customEvent.detail;

      if (detail.status === "checking") {
        setIsCloudSaving(false);
        setHasPendingCloudChanges(false);
        setAutoBackupError("");
        setAutoBackupMessage(detail.message);
        setLocalDataUpdatedAt(getLocalDataUpdatedAt());
        return;
      }

      if (detail.status === "pending") {
        setIsCloudSaving(false);
        setHasCloudSyncError(false);
        setIsLocalOnly(false);
        setHasPendingCloudChanges(true);
        setAutoBackupError("");
        setAutoBackupMessage(detail.message);
        setLocalDataUpdatedAt(getLocalDataUpdatedAt());
        return;
      }

      if (detail.status === "local-only") {
        setIsCloudSaving(false);
        setHasPendingCloudChanges(false);
        setIsLocalOnly(true);
        setAutoBackupError("");
        setAutoBackupMessage(detail.message);
        setLocalDataUpdatedAt(getLocalDataUpdatedAt());
        return;
      }

      if (detail.status === "saving") {
        setIsCloudSaving(true);
        setHasPendingCloudChanges(false);
        setAutoBackupError("");
        setAutoBackupMessage(detail.message);
        setLocalDataUpdatedAt(getLocalDataUpdatedAt());
        return;
      }

      setIsCloudSaving(false);

      if (detail.status === "success") {
        setSyncLogEvents(getSyncLogEvents());
        setHasCloudSyncError(false);
        setIsLocalOnly(false);
        setHasPendingCloudChanges(false);
        setAutoBackupError("");
        setAutoBackupMessage(detail.message);
        setLocalDataUpdatedAt(getLocalDataUpdatedAt());

        if (detail.updatedAt) {
          setLastCloudBackup(detail.updatedAt);
        }

        return;
      }

      if (detail.status === "restored" || detail.status === "ready") {
        setSyncLogEvents(getSyncLogEvents());
        setIsCloudSaving(false);
        setHasCloudSyncError(false);
        setIsLocalOnly(false);
        setHasPendingCloudChanges(false);
        setAutoBackupError("");
        setAutoBackupMessage(detail.message);
        setLocalDataUpdatedAt(getLocalDataUpdatedAt());

        if (detail.updatedAt) {
          setLastCloudBackup(detail.updatedAt);
        }

        return;
      }

      setAutoBackupMessage("");
      setAutoBackupError(detail.message);

      if (detail.status === "error") {
        setSyncLogEvents(getSyncLogEvents());
        setHasCloudSyncError(true);
        setHasPendingCloudChanges(false);
      }

      if (detail.status === "conflict" && detail.updatedAt) {
        setSyncLogEvents(getSyncLogEvents());
        setLastCloudBackup(detail.updatedAt);
        setHasPendingCloudChanges(false);
      }
    }

    window.addEventListener(CLOUD_AUTO_BACKUP_EVENT, handleAutoBackup);

    return () => {
      window.removeEventListener(CLOUD_AUTO_BACKUP_EVENT, handleAutoBackup);
    };
  }, []);

  function handleExport() {
    const backupFile = createBackupFile();

    downloadJsonFile("taiji-life-plan-donnees.json", backupFile);
    saveLastBackupExportDate(backupFile.exportedAt);
    setLastBackupExport(backupFile.exportedAt);
    setError("");
    setMessage("Export cree avec succes.");
  }

  async function handleProtectStorage() {
    const isGranted = await requestPersistentStorage();

    setPersistentStorage(isGranted);
    setError("");
    setMessage(
      isGranted
        ? "Stockage persistant active sur cet appareil."
        : "Le navigateur n'a pas accorde le stockage persistant.",
    );
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const fileContent = await file.text();
      const parsedFile = JSON.parse(fileContent);

      if (!isBackupFile(parsedFile)) {
        setMessage("");
        setError("Le fichier choisi n'est pas un export valide.");
        return;
      }

      importBackupData(parsedFile.data);
      setError("");
      setMessage("Import termine. La page va se recharger.");
      window.location.reload();
    } catch {
      setMessage("");
      setError("Impossible de lire ce fichier JSON.");
    }
  }

  async function handleCloudSave() {
    setMessage("");
    setError("");

    if (!session) {
      setError("Tu dois etre connecte pour sauvegarder dans le cloud.");
      return;
    }

    addSyncLogEvent(
      "manual-save-started",
      "Synchronisation manuelle lancee.",
    );
    setSyncLogEvents(getSyncLogEvents());
    setIsCloudBusy(true);
    setIsCloudSaving(true);
    setHasPendingCloudChanges(false);

    try {
      const result = await saveCloudBackupSafely(session.user.id);

      if (result.status === "conflict") {
        addSyncLogEvent(
          "cloud-newer",
          "Synchronisation manuelle bloquee : une version cloud plus recente existe.",
        );
        setSyncLogEvents(getSyncLogEvents());
        setLastCloudBackup(result.cloudUpdatedAt);
        setError(
          "Synchronisation bloquee : une version cloud plus recente existe.",
        );
        return;
      }

      if (result.status === "empty") {
        setError("Aucune donnee locale suffisante a synchroniser.");
        return;
      }

      addSyncLogEvent("manual-save-success", "Sauvegarde cloud manuelle reussie.");
      setSyncLogEvents(getSyncLogEvents());
      setLastCloudBackup(result.updatedAt);
      setLocalDataUpdatedAt(getLocalDataUpdatedAt());
      setHasCloudSyncError(false);
      setIsLocalOnly(false);
      setHasPendingCloudChanges(false);
      setMessage("Synchronisation cloud reussie.");
    } catch {
      addSyncLogEvent("save-error", "Erreur pendant la sauvegarde cloud.");
      setSyncLogEvents(getSyncLogEvents());
      setHasCloudSyncError(true);
      setError("Impossible de sauvegarder dans le cloud pour le moment.");
    } finally {
      setIsCloudBusy(false);
      setIsCloudSaving(false);
    }
  }

  async function handleCloudRestore() {
    setMessage("");
    setError("");

    if (!session) {
      setError("Tu dois etre connecte pour restaurer depuis le cloud.");
      return;
    }

    const shouldRestore = window.confirm(
      "Restaurer depuis le cloud va remplacer les donnees locales de cet appareil. Continuer ?",
    );

    if (!shouldRestore) {
      setError("Restauration annulee.");
      return;
    }

    setIsCloudBusy(true);

    try {
      const data = await getCloudBackup(session.user.id);

      if (!data) {
        setError("Aucune sauvegarde cloud trouvee.");
        return;
      }

      if (!isBackupData(data.data)) {
        setError("La sauvegarde cloud trouvee n'est pas valide.");
        return;
      }

      importBackupData(data.data);
      saveLocalDataUpdatedAt(data.updated_at ?? undefined);
      addSyncLogEvent("restore-success", "Restauration cloud reussie.");
      setSyncLogEvents(getSyncLogEvents());
      setLastCloudBackup(
        typeof data.updated_at === "string" ? data.updated_at : null,
      );
      setLocalDataUpdatedAt(getLocalDataUpdatedAt());
      setHasCloudSyncError(false);
      setIsLocalOnly(false);
      setError("");
      setMessage("Restauration cloud reussie. La page va se recharger.");
      window.location.reload();
    } catch {
      addSyncLogEvent("restore-error", "Erreur pendant la restauration cloud.");
      setSyncLogEvents(getSyncLogEvents());
      setHasCloudSyncError(true);
      setError("Impossible de restaurer depuis le cloud pour le moment.");
    } finally {
      setIsCloudBusy(false);
    }
  }

  function handleResetData() {
    const confirmedText = window.prompt(
      `Cette action supprime toutes les donnees de l'application sur cet appareil. Tape ${RESET_CONFIRMATION_TEXT} pour confirmer.`,
    );

    if (confirmedText !== RESET_CONFIRMATION_TEXT) {
      setMessage("");
      setError("Reinitialisation annulee.");
      return;
    }

    clearAppStorage();
    setError("");
    setMessage("Toutes les donnees ont ete supprimees. La page va se recharger.");
    window.location.reload();
  }

  function handleReloadApp() {
    window.location.reload();
  }

  function handleClearSyncLog() {
    const shouldClearLog = window.confirm(
      "Vider le journal de synchronisation ?",
    );

    if (!shouldClearLog) {
      return;
    }

    clearSyncLogEvents();
    setSyncLogEvents([]);
    setError("");
    setMessage("Journal de synchronisation vide.");
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Parametres</p>
        <h1 className={styles.pageTitle}>Reglages et donnees</h1>
        <p className={styles.intro}>
          Gere les sauvegardes de ton application et les actions sensibles.
        </p>
      </section>

      <section className={styles.content}>
        <article className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.cardTitle}>Sauvegarde et securite</h2>
              <p className={styles.cardText}>
                Exporte tes donnees, importe une sauvegarde et demande au
                navigateur de mieux proteger le stockage local.
              </p>
            </div>
          </div>

          {isClient ? (
            <>
              <div className={styles.statusGrid}>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>
                    Stockage persistant
                  </span>
                  <strong
                    className={
                      persistentStorage
                        ? styles.statusOk
                        : styles.statusWarning
                    }
                  >
                    {persistentStorage
                      ? "Active"
                      : "Non active ou non disponible"}
                  </strong>
                </div>

                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>Dernier export</span>
                  <strong
                    className={
                      lastBackupExport
                        ? styles.statusValue
                        : styles.statusWarning
                    }
                  >
                    {formatBackupDate(lastBackupExport)}
                  </strong>
                </div>

                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>
                    Depuis la sauvegarde
                  </span>
                  <strong
                    className={
                      shouldShowBackupWarning
                        ? styles.statusWarning
                        : styles.statusValue
                    }
                  >
                    {formatDaysSinceBackup(daysSinceBackup)}
                  </strong>
                </div>
              </div>

              {shouldShowBackupWarning ? (
                <p className={styles.warningText}>
                  Pense a exporter une sauvegarde recente.
                </p>
              ) : null}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={`control-button ${styles.button}`}
                  onClick={handleExport}
                >
                  Exporter mes donnees
                </button>

                <button
                  type="button"
                  className={`control-button ${styles.button}`}
                  onClick={handleImportClick}
                >
                  Importer mes donnees
                </button>

                <button
                  type="button"
                  className={`control-button ${styles.button}`}
                  onClick={handleProtectStorage}
                >
                  Proteger le stockage
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className={styles.hiddenFileInput}
                onChange={handleImport}
              />
            </>
          ) : (
            <p className={styles.cardText}>Chargement des parametres...</p>
          )}

          {message ? <p className={styles.successText}>{message}</p> : null}
          {error ? <p className={styles.errorText}>{error}</p> : null}
        </article>

        <article className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.cardTitle}>Journal de synchronisation</h2>
              <p className={styles.cardText}>
                Les 10 derniers evenements importants de synchronisation.
              </p>
            </div>

            {isClient && syncLogEvents.length > 0 ? (
              <button
                type="button"
                className={`control-button ${styles.secondaryButton}`}
                onClick={handleClearSyncLog}
              >
                Vider le journal
              </button>
            ) : null}
          </div>

          {isClient ? (
            syncLogEvents.length > 0 ? (
              <ul className={styles.syncLogList}>
                {syncLogEvents.map((event) => (
                  <li key={event.id} className={styles.syncLogItem}>
                    <div>
                      <strong className={styles.syncLogType}>
                        {SYNC_LOG_TYPE_LABELS[event.type]}
                      </strong>
                      <p className={styles.syncLogMessage}>{event.message}</p>
                    </div>
                    <time
                      className={styles.syncLogDate}
                      dateTime={event.createdAt}
                    >
                      {formatSyncLogDate(event.createdAt)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.cardText}>
                Aucun evenement de synchronisation pour le moment.
              </p>
            )
          ) : (
            <p className={styles.cardText}>
              Chargement du journal de synchronisation...
            </p>
          )}
        </article>

        <article className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.cardTitle}>Sauvegarde cloud</h2>
              <p className={styles.cardText}>
                Garde localStorage comme stockage principal et utilise Supabase
                comme copie de secours liee a ton compte.
              </p>
            </div>
          </div>

          {isClient ? (
            <>
              <div className={styles.statusGrid}>
                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>Connexion</span>
                  {isLoadingSession ? (
                    <strong className={styles.statusValue}>Chargement...</strong>
                  ) : userEmail ? (
                    <strong className={styles.statusOk}>Connecte</strong>
                  ) : (
                    <strong className={styles.statusWarning}>Non connecte</strong>
                  )}
                </div>

                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>Email</span>
                  <strong
                    className={
                      userEmail ? styles.statusValue : styles.statusWarning
                    }
                  >
                    {userEmail ?? "Aucun utilisateur connecte"}
                  </strong>
                </div>

                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>Etat de synchronisation</span>
                  <strong
                    className={
                      cloudSyncSnapshot.state === "up-to-date"
                        ? styles.statusOk
                        : cloudSyncSnapshot.state === "error"
                          ? styles.statusDanger
                          : styles.statusWarning
                    }
                  >
                    {CLOUD_SYNC_LABELS[cloudSyncSnapshot.state]}
                  </strong>
                </div>

                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>
                    Derniere modification locale
                  </span>
                  <strong
                    className={
                      cloudSyncSnapshot.localUpdatedAt
                        ? styles.statusValue
                        : styles.statusWarning
                    }
                  >
                    {formatSyncDate(cloudSyncSnapshot.localUpdatedAt)}
                  </strong>
                </div>

                <div className={styles.statusItem}>
                  <span className={styles.statusLabel}>
                    Derniere sauvegarde cloud
                  </span>
                  <strong
                    className={
                      lastCloudBackup ? styles.statusValue : styles.statusWarning
                    }
                  >
                    {lastCloudBackup
                      ? formatBackupDate(lastCloudBackup)
                      : "Aucune sauvegarde cloud trouvee"}
                  </strong>
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={`control-button ${styles.button}`}
                  onClick={handleCloudSave}
                  disabled={isCloudBusy || isLoadingSession}
                >
                  Synchroniser maintenant
                </button>

                <button
                  type="button"
                  className={`control-button ${styles.button}`}
                  onClick={handleCloudRestore}
                  disabled={isCloudBusy || isLoadingSession}
                >
                  Restaurer depuis le cloud
                </button>
              </div>

              {autoBackupMessage ? (
                <p className={styles.autoBackupStatus}>{autoBackupMessage}</p>
              ) : null}
              {autoBackupError ? (
                <p className={styles.autoBackupError}>{autoBackupError}</p>
              ) : null}
            </>
          ) : (
            <p className={styles.cardText}>Chargement de la sauvegarde cloud...</p>
          )}
        </article>

        <article className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.cardTitle}>Application</h2>
              <p className={styles.cardText}>
                Verifie la version affichee sur cet appareil et recharge la
                page pour recuperer la derniere version disponible.
              </p>
            </div>
          </div>

          <div className={styles.appVersion}>
            <span className={styles.versionLabel}>Version de l&apos;application</span>
            <strong className={styles.versionNumber}>
              Taiji Life Plan {APP_VERSION}
            </strong>
            <span className={styles.versionDate}>
              Derniere mise a jour : {APP_UPDATED_AT}
            </span>
          </div>

          {isClient ? (
            <div className={styles.actions}>
              <button
                type="button"
                className={`control-button ${styles.reloadButton}`}
                onClick={handleReloadApp}
              >
                Recharger l&apos;application
              </button>
            </div>
          ) : null}
        </article>

        <article className={styles.dangerCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.dangerTitle}>Danger</h2>
              <p className={styles.cardText}>
                La reinitialisation supprime habitudes, objectifs, planning,
                trajectoire, priorites et historique local.
              </p>
            </div>
          </div>

          {isClient ? (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleResetData}
              >
                Reinitialiser toutes les donnees
              </button>
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}
