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

export default function ParametresPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [persistentStorage, setPersistentStorage] = useState<boolean | null>(
    null,
  );
  const [lastBackupExport, setLastBackupExport] = useState<string | null>(null);
  const daysSinceBackup = getDaysSinceBackup(lastBackupExport);
  const shouldShowBackupWarning =
    daysSinceBackup !== null && daysSinceBackup > BACKUP_WARNING_DAYS;

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

  function handleReloadApp() {
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
              <h2 className={styles.cardTitle}>Application</h2>
              <p className={styles.cardText}>
                Verifie la version affichee sur cet appareil et recharge la
                page pour recuperer la derniere version disponible.
              </p>
            </div>
          </div>

          <div className={styles.appVersion}>
            <span className={styles.versionLabel}>Version de l'application</span>
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
                Recharger l'application
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
