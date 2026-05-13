"use client";

import { useEffect, useRef, useState } from "react";
import {
  createBackupFile,
  downloadJsonFile,
  importBackupData,
  isBackupFile,
} from "../utils/backup";
import { clearAppStorage } from "../utils/storage";
import styles from "./page.module.css";

const RESET_CONFIRMATION_TEXT = "SUPPRIMER";

export default function ParametresPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setIsClient(true);
  }, []);

  function handleExport() {
    downloadJsonFile("taiji-life-plan-donnees.json", createBackupFile());
    setError("");
    setMessage("Export cree avec succes.");
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
