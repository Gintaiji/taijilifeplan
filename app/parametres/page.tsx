"use client";

import { useEffect, useRef, useState } from "react";
import {
  createBackupFile,
  downloadJsonFile,
  getLastBackupExportDate,
  importBackupData,
  isBackupFile,
  saveLastBackupExportDate,
} from "../utils/backup";
import {
  clearAppStorage,
  isPersistentStorageGranted,
  requestPersistentStorage,
} from "../utils/storage";
import styles from "./page.module.css";

const RESET_CONFIRMATION_TEXT = "SUPPRIMER";
const RECENT_BACKUP_DAYS = 30;

function formatBackupDate(dateValue: string | null) {
  if (!dateValue) {
    return "Aucun export enregistre";
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

function hasRecentBackup(dateValue: string | null) {
  if (!dateValue) {
    return false;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const recentLimit = RECENT_BACKUP_DAYS * 24 * 60 * 60 * 1000;

  return Date.now() - date.getTime() <= recentLimit;
}

export default function ParametresPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [persistentStorage, setPersistentStorage] = useState<boolean | null>(
    null,
  );
  const [lastBackupExport, setLastBackupExport] = useState<string | null>(null);

  useEffect(() => {
    let shouldUpdateState = true;

    async function loadClientSettings() {
      if (shouldUpdateState) {
        setIsClient(true);
        setLastBackupExport(getLastBackupExportDate());
        setPersistentStorage(await isPersistentStorageGranted());
      }
    }

    void loadClientSettings();

    return () => {
      shouldUpdateState = false;
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
              <h2 className={styles.cardTitle}>Donnees</h2>
              <p className={styles.cardText}>
                Exporte ou importe toutes les donnees enregistrees sur cet
                appareil.
              </p>
            </div>
          </div>

          {isClient ? (
            <>
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
              <h2 className={styles.cardTitle}>Securite des donnees</h2>
              <p className={styles.cardText}>
                Demande au navigateur de mieux proteger les donnees locales et
                garde une sauvegarde JSON recente hors de l'application.
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
                  <strong className={styles.statusValue}>
                    {formatBackupDate(lastBackupExport)}
                  </strong>
                </div>
              </div>

              {!hasRecentBackup(lastBackupExport) ? (
                <p className={styles.warningText}>
                  Aucun export recent n'a ete fait. Fais une sauvegarde au
                  moins tous les {RECENT_BACKUP_DAYS} jours, surtout sur mobile
                  ou PWA.
                </p>
              ) : null}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={`control-button ${styles.button}`}
                  onClick={handleProtectStorage}
                >
                  Proteger le stockage
                </button>

                <button
                  type="button"
                  className={`control-button ${styles.button}`}
                  onClick={handleExport}
                >
                  Exporter une sauvegarde maintenant
                </button>
              </div>
            </>
          ) : (
            <p className={styles.cardText}>Chargement de la securite...</p>
          )}
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

        <p className={styles.version}>Taiji Life Plan - V1</p>
      </section>
    </main>
  );
}
