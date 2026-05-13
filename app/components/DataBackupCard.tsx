"use client";

import { useRef, useState } from "react";
import styles from "../page.module.css";
import {
  createBackupFile,
  downloadJsonFile,
  importBackupData,
  isBackupFile,
} from "../utils/backup";

export default function DataBackupCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  return (
    <article className={`${styles.card} ${styles.backupCard}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.cardTitle}>Sauvegarde des donnees</h2>
          <p className={styles.cardText}>
            Exporte ou importe toutes les donnees enregistrees sur cet appareil.
          </p>
        </div>
      </div>

      <div className={styles.backupActions}>
        <button
          type="button"
          className={`control-button ${styles.button} ${styles.addButton}`}
          onClick={handleExport}
        >
          Exporter mes donnees
        </button>

        <button
          type="button"
          className={`control-button ${styles.button} ${styles.addButton}`}
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

      {message ? <p className={styles.successText}>{message}</p> : null}
      {error ? <p className={styles.errorText}>{error}</p> : null}
    </article>
  );
}
