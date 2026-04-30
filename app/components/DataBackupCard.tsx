"use client";

import { useRef, useState } from "react";
import styles from "../page.module.css";
import { getStorage, setStorage, STORAGE_KEYS } from "../utils/storage";

type BackupData = {
  habits: unknown;
  habitNames: unknown;
  habitOrder: unknown;
  goals: unknown;
  planning: unknown;
  trajectory: unknown;
  priorities: unknown;
};

type BackupFile = {
  version: number;
  exportedAt: string;
  data: BackupData;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBackupFile(value: unknown): value is BackupFile {
  if (!isObject(value) || !isObject(value.data)) {
    return false;
  }

  const data = value.data;

  return (
    typeof value.version === "number" &&
    typeof value.exportedAt === "string" &&
    isObject(data.habits) &&
    Array.isArray(data.habitNames) &&
    (data.habitOrder === null || Array.isArray(data.habitOrder)) &&
    Array.isArray(data.goals) &&
    Array.isArray(data.planning) &&
    isObject(data.trajectory) &&
    (data.priorities === null || isObject(data.priorities))
  );
}

function getBackupData(): BackupData {
  return {
    habits: getStorage<unknown>(STORAGE_KEYS.habits, {}),
    habitNames: getStorage<unknown>(STORAGE_KEYS.habitNames, []),
    habitOrder: getStorage<unknown | null>(STORAGE_KEYS.habitOrder, null),
    goals: getStorage<unknown>(STORAGE_KEYS.goals, []),
    planning: getStorage<unknown>(STORAGE_KEYS.planning, []),
    trajectory: getStorage<unknown>(STORAGE_KEYS.trajectory, {}),
    priorities: getStorage<unknown | null>(STORAGE_KEYS.priorities, null),
  };
}

function downloadJsonFile(fileName: string, content: BackupFile) {
  const jsonContent = JSON.stringify(content, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function importBackupData(data: BackupData) {
  setStorage(STORAGE_KEYS.habits, data.habits);
  setStorage(STORAGE_KEYS.habitNames, data.habitNames);
  setStorage(STORAGE_KEYS.goals, data.goals);
  setStorage(STORAGE_KEYS.planning, data.planning);
  setStorage(STORAGE_KEYS.trajectory, data.trajectory);
  setStorage(STORAGE_KEYS.priorities, data.priorities);
  setStorage(STORAGE_KEYS.habitOrder, data.habitOrder);
}

export default function DataBackupCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleExport() {
    const backupFile: BackupFile = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: getBackupData(),
    };

    downloadJsonFile("taiji-life-plan-donnees.json", backupFile);
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
