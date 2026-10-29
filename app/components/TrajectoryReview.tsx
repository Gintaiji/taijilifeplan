"use client";

import { useEffect, useMemo, useState } from "react";
import { getStorage, setStorage, STORAGE_KEYS } from "../utils/storage";

import styles from "./TrajectoryReview.module.css";

const TRAJECTORY_STORAGE_KEY = STORAGE_KEYS.trajectory;
const DAILY_OBJECTIVES_STORAGE_KEY = STORAGE_KEYS.dailyObjectives;

type TrajectoryState = {
  accomplishedToday: string;
  notDoneToday: string;
  decideForTomorrow: string;
};

type TrajectoryEntries = Record<string, TrajectoryState>;

type PrefillFieldName = "accomplishedToday" | "notDoneToday";

type DailyObjective = {
  id: number;
  label: string;
  time: string;
  completed: boolean;
};

type SavedDailyObjectives = {
  date: string;
  priorities: DailyObjective[];
};

type DailyObjectivesByDate = Record<string, DailyObjective[]>;

function getInitialTrajectoryState(): TrajectoryState {
  return {
    accomplishedToday: "",
    notDoneToday: "",
    decideForTomorrow: "",
  };
}

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateKeyWithDayOffset(dateKey: string, dayOffset: number) {
  const date = new Date(`${dateKey}T12:00:00`);

  date.setDate(date.getDate() + dayOffset);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isTrajectoryEmpty(trajectory: TrajectoryState) {
  return (
    trajectory.accomplishedToday.trim() === "" &&
    trajectory.notDoneToday.trim() === "" &&
    trajectory.decideForTomorrow.trim() === ""
  );
}

function formatObjectiveForReview(objective: DailyObjective) {
  const cleanLabel = objective.label.trim();

  if (objective.time.trim() === "") {
    return `- ${cleanLabel}`;
  }

  return `- ${objective.time} - ${cleanLabel}`;
}

function getFilledLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function appendMissingLinesToField(currentText: string, linesToAdd: string[]) {
  const existingLines = new Set(getFilledLines(currentText));
  const missingLines = linesToAdd.filter(
    (line) => !existingLines.has(line.trim()),
  );

  if (missingLines.length === 0) {
    return currentText;
  }

  const missingText = missingLines.join("\n");

  if (currentText.trim() === "") {
    return missingText;
  }

  return `${currentText.trimEnd()}\n\n${missingText}`;
}

function normalizeTrajectoryEntry(savedEntry: unknown): TrajectoryState {
  if (typeof savedEntry !== "object" || savedEntry === null) {
    return getInitialTrajectoryState();
  }

  return {
    accomplishedToday:
      "accomplishedToday" in savedEntry &&
      typeof savedEntry.accomplishedToday === "string"
        ? savedEntry.accomplishedToday
        : "",
    notDoneToday:
      "notDoneToday" in savedEntry && typeof savedEntry.notDoneToday === "string"
        ? savedEntry.notDoneToday
        : "",
    decideForTomorrow:
      "decideForTomorrow" in savedEntry &&
      typeof savedEntry.decideForTomorrow === "string"
        ? savedEntry.decideForTomorrow
        : "",
  };
}

function formatDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getEntriesFromLocalStorage(todayKey: string): TrajectoryEntries {
  const savedTrajectory = getStorage<unknown | null>(
    TRAJECTORY_STORAGE_KEY,
    null,
  );

  if (savedTrajectory === null) {
    return {};
  }

  if (
    typeof savedTrajectory === "object" &&
    "accomplishedToday" in savedTrajectory
  ) {
    const migratedEntry = normalizeTrajectoryEntry(savedTrajectory);

    if (isTrajectoryEmpty(migratedEntry)) {
      return {};
    }

    return {
      [todayKey]: migratedEntry,
    };
  }

  if (typeof savedTrajectory !== "object") {
    return {};
  }

  const cleanedEntries: TrajectoryEntries = {};

  for (const [dateKey, entry] of Object.entries(savedTrajectory)) {
    const completeEntry = normalizeTrajectoryEntry(entry);

    if (!isTrajectoryEmpty(completeEntry)) {
      cleanedEntries[dateKey] = completeEntry;
    }
  }

  return cleanedEntries;
}

function normalizeDailyObjectives(
  savedObjectives: unknown,
): SavedDailyObjectives | null {
  if (typeof savedObjectives !== "object" || savedObjectives === null) {
    return null;
  }

  if (!("date" in savedObjectives) || !("priorities" in savedObjectives)) {
    return null;
  }

  if (
    typeof savedObjectives.date !== "string" ||
    !Array.isArray(savedObjectives.priorities)
  ) {
    return null;
  }

  return {
    date: savedObjectives.date,
    priorities: normalizeDailyObjectivesList(savedObjectives.priorities),
  };
}

function normalizeDailyObjectivesList(savedObjectives: unknown): DailyObjective[] {
  if (!Array.isArray(savedObjectives)) {
    return [];
  }

  return savedObjectives
    .flatMap((objective) => {
      if (
        typeof objective !== "object" ||
        objective === null ||
        !("id" in objective) ||
        !("label" in objective) ||
        !("completed" in objective)
      ) {
        return [];
      }

      if (
        typeof objective.id !== "number" ||
        typeof objective.label !== "string" ||
        typeof objective.completed !== "boolean"
      ) {
        return [];
      }

      return [
        {
          id: objective.id,
          label: objective.label,
          time:
            "time" in objective && typeof objective.time === "string"
              ? objective.time
              : "",
          completed: objective.completed,
        },
      ];
    })
    .slice(0, 3);
}

function normalizeDailyObjectivesByDate(
  savedObjectives: unknown,
): DailyObjectivesByDate {
  const oldSavedObjectives = normalizeDailyObjectives(savedObjectives);

  if (oldSavedObjectives) {
    return {
      [oldSavedObjectives.date]: oldSavedObjectives.priorities,
    };
  }

  if (typeof savedObjectives !== "object" || savedObjectives === null) {
    return {};
  }

  const objectivesByDate: DailyObjectivesByDate = {};

  for (const [dateKey, objectives] of Object.entries(savedObjectives)) {
    const cleanedObjectives = normalizeDailyObjectivesList(objectives);

    if (cleanedObjectives.length > 0) {
      objectivesByDate[dateKey] = cleanedObjectives;
    }
  }

  return objectivesByDate;
}

function getTodayObjectivesFromLocalStorage(todayKey: string): DailyObjective[] {
  const savedObjectives = getStorage<unknown>(
    DAILY_OBJECTIVES_STORAGE_KEY,
    {},
  );
  const objectivesByDate = normalizeDailyObjectivesByDate(savedObjectives);

  return objectivesByDate[todayKey] ?? [];
}

function getObjectivesForDateFromLocalStorage(dateKey: string): DailyObjective[] {
  const objectivesByDate = getDailyObjectivesByDateFromLocalStorage();

  return objectivesByDate[dateKey] ?? [];
}

function getDailyObjectivesByDateFromLocalStorage(): DailyObjectivesByDate {
  const savedObjectives = getStorage<unknown>(
    DAILY_OBJECTIVES_STORAGE_KEY,
    {},
  );

  return normalizeDailyObjectivesByDate(savedObjectives);
}

function getNextDailyObjectiveId(objectives: DailyObjective[]) {
  if (objectives.length === 0) {
    return 1;
  }

  return (
    objectives.reduce(
      (highestId, objective) => Math.max(highestId, objective.id),
      0,
    ) + 1
  );
}

function getTomorrowObjectiveLines(decideForTomorrow: string) {
  return decideForTomorrow
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function hasSameObjectiveLabel(objectives: DailyObjective[], label: string) {
  const cleanLabel = label.trim();

  return objectives.some((objective) => objective.label.trim() === cleanLabel);
}

export default function TrajectoryReview() {
  const todayKey = useMemo(() => getTodayKey(), []);
  const tomorrowKey = useMemo(
    () => getDateKeyWithDayOffset(todayKey, 1),
    [todayKey],
  );
  const today = useMemo(() => formatDate(todayKey), [todayKey]);
  const [entries, setEntries] = useState<TrajectoryEntries>({});
  const [dailyObjectives, setDailyObjectives] = useState<DailyObjective[]>([]);
  const [tomorrowObjectives, setTomorrowObjectives] = useState<
    DailyObjective[]
  >([]);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [tomorrowPreparationMessage, setTomorrowPreparationMessage] =
    useState("");

  const todayEntry = entries[todayKey] ?? getInitialTrajectoryState();
  const completedObjectives = dailyObjectives.filter(
    (objective) => objective.completed,
  );
  const unfinishedObjectives = dailyObjectives.filter(
    (objective) => !objective.completed,
  );
  const completedObjectivesCount = completedObjectives.length;

  const savedDates = Object.keys(entries).sort((a, b) => b.localeCompare(a));
  const consultationDate = savedDates.includes(selectedDate)
    ? selectedDate
    : (savedDates[0] ?? todayKey);
  const consultationEntry = entries[consultationDate] ?? getInitialTrajectoryState();

  useEffect(() => {
    let shouldUpdateState = true;

    queueMicrotask(() => {
      if (!shouldUpdateState) {
        return;
      }

      const savedEntries = getEntriesFromLocalStorage(todayKey);
      const latestSavedDate =
        Object.keys(savedEntries).sort((a, b) => b.localeCompare(a))[0] ??
        todayKey;

      setEntries(savedEntries);
      setSelectedDate(latestSavedDate);
      setDailyObjectives(getTodayObjectivesFromLocalStorage(todayKey));
      setTomorrowObjectives(getObjectivesForDateFromLocalStorage(tomorrowKey));
      setIsStorageLoaded(true);
    });

    return () => {
      shouldUpdateState = false;
    };
  }, [todayKey, tomorrowKey]);

  useEffect(() => {
    if (!isStorageLoaded) {
      return;
    }

    setStorage(TRAJECTORY_STORAGE_KEY, entries);
  }, [entries, isStorageLoaded]);

  function handleFieldChange(fieldName: keyof TrajectoryState, value: string) {
    setEntries((currentEntries) => {
      const updatedEntry = {
        ...(currentEntries[todayKey] ?? getInitialTrajectoryState()),
        [fieldName]: value,
      };

      if (isTrajectoryEmpty(updatedEntry)) {
        const entriesWithoutToday = { ...currentEntries };
        delete entriesWithoutToday[todayKey];
        return entriesWithoutToday;
      }

      return {
        ...currentEntries,
        [todayKey]: updatedEntry,
      };
    });

    setSelectedDate(todayKey);
  }

  function handlePrefillField(
    fieldName: PrefillFieldName,
    objectivesToAdd: DailyObjective[],
  ) {
    const prefilledLines = objectivesToAdd.map(formatObjectiveForReview);

    if (prefilledLines.length === 0) {
      return;
    }

    const nextFieldValue = appendMissingLinesToField(
      todayEntry[fieldName],
      prefilledLines,
    );

    if (nextFieldValue === todayEntry[fieldName]) {
      return;
    }

    handleFieldChange(fieldName, nextFieldValue);
  }

  function saveTomorrowObjectives(nextTomorrowObjectives: DailyObjective[]) {
    const objectivesByDate = getDailyObjectivesByDateFromLocalStorage();
    const limitedObjectives = nextTomorrowObjectives.slice(0, 3);

    if (limitedObjectives.length === 0) {
      delete objectivesByDate[tomorrowKey];
    } else {
      objectivesByDate[tomorrowKey] = limitedObjectives;
    }

    setStorage(DAILY_OBJECTIVES_STORAGE_KEY, objectivesByDate);
    setTomorrowObjectives(limitedObjectives);
  }

  function handlePrepareTomorrowObjectives() {
    const lines = getTomorrowObjectiveLines(todayEntry.decideForTomorrow);
    const linesToPrepare = lines.slice(0, 3);

    if (lines.length === 0) {
      setTomorrowPreparationMessage(
        "Ajoute au moins une ligne pour preparer demain.",
      );
      return;
    }

    const objectivesByDate = getDailyObjectivesByDateFromLocalStorage();
    const savedTomorrowObjectives = objectivesByDate[tomorrowKey] ?? [];
    const updatedTomorrowObjectives = [...savedTomorrowObjectives];

    if (updatedTomorrowObjectives.length >= 3) {
      setTomorrowObjectives(updatedTomorrowObjectives.slice(0, 3));
      setTomorrowPreparationMessage(
        "Demain a deja 3 objectifs.",
      );
      return;
    }

    const newObjectives: DailyObjective[] = [];
    let nextId = getNextDailyObjectiveId(updatedTomorrowObjectives);

    for (const line of linesToPrepare) {
      if (updatedTomorrowObjectives.length >= 3) {
        break;
      }

      if (hasSameObjectiveLabel(updatedTomorrowObjectives, line)) {
        continue;
      }

      const newObjective = {
        id: nextId,
        label: line,
        time: "",
        completed: false,
      };

      newObjectives.push(newObjective);
      updatedTomorrowObjectives.push(newObjective);
      nextId += 1;
    }

    if (newObjectives.length === 0) {
      setTomorrowPreparationMessage(
        "Aucun nouvel objectif ajoute.",
      );
      return;
    }

    objectivesByDate[tomorrowKey] = updatedTomorrowObjectives;
    setStorage(DAILY_OBJECTIVES_STORAGE_KEY, objectivesByDate);
    setTomorrowObjectives(updatedTomorrowObjectives);

    const skippedLinesCount = lines.length - newObjectives.length;
    const limitMessage =
      skippedLinesCount > 0
        ? " Certaines lignes n'ont pas ete ajoutees (doublon ou limite de 3)."
        : "";

    setTomorrowPreparationMessage(
      `${newObjectives.length} objectif(s) pour demain.${limitMessage}`,
    );
  }

  function handleTomorrowObjectiveTimeChange(
    objectiveId: number,
    nextTime: string,
  ) {
    const updatedTomorrowObjectives = tomorrowObjectives.map((objective) =>
      objective.id === objectiveId
        ? {
            ...objective,
            time: nextTime,
          }
        : objective,
    );

    saveTomorrowObjectives(updatedTomorrowObjectives);
  }

  function handleDeleteTomorrowObjective(objectiveId: number) {
    const confirmed = window.confirm("Supprimer cet objectif de demain ?");

    if (!confirmed) {
      return;
    }

    const updatedTomorrowObjectives = tomorrowObjectives.filter(
      (objective) => objective.id !== objectiveId,
    );

    saveTomorrowObjectives(updatedTomorrowObjectives);
  }

  return (
    <section className={styles.review} aria-busy={!isStorageLoaded} aria-label="Bilan quotidien">
      <header className={styles.introduction}>
        <h2>Aujourd&apos;hui, je fais le point.</h2>
        <p className={styles.date}>{isStorageLoaded ? today : "Chargement du bilan…"}</p>
        <p className={styles.helper}>Quelques mots suffisent. Tes textes sont enregistrés automatiquement.</p>
      </header>

      <details className={styles.disclosure}>
        <summary>
          Objectifs du jour
          {isStorageLoaded && <span className={styles.counter}>{completedObjectivesCount}/{dailyObjectives.length} réalisés</span>}
        </summary>
        <div className={styles.disclosureBody}>
          {!isStorageLoaded ? <p className={styles.helper}>Chargement des objectifs…</p>
            : dailyObjectives.length === 0 ? <p className={styles.helper}>Aucun objectif prévu aujourd&apos;hui.</p>
            : (
              <ul className={styles.objectives}>
                {dailyObjectives.map((objective) => (
                  <li key={objective.id} className={styles.objective}>
                    <span className={styles.objectiveTime}>{objective.time || "Sans heure"}</span>
                    <span className={`${styles.objectiveText} ${objective.completed ? styles.completed : ""}`}>{objective.label}</span>
                    <span className={styles.status}>{objective.completed ? "Réalisé" : "À faire"}</span>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </details>

      <div className={styles.reflections}>
        <div className={styles.field}>
          <label htmlFor="accomplishedToday">Ce que j&apos;ai accompli aujourd&apos;hui</label>
          <p id="accomplished-help" className={styles.helper}>Une avancée, un effort, une petite victoire…</p>
          <textarea id="accomplishedToday" rows={6} disabled={!isStorageLoaded}
            aria-describedby="accomplished-help" value={todayEntry.accomplishedToday}
            onChange={(event) => handleFieldChange("accomplishedToday", event.target.value)} />
          <div className={styles.actions}>
            <button type="button" className={`control-button ${styles.secondary}`}
              disabled={!isStorageLoaded || completedObjectives.length === 0}
              onClick={() => handlePrefillField("accomplishedToday", completedObjectives)}>
              Ajouter les objectifs réalisés
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="notDoneToday">Ce qu&apos;il me reste à faire</label>
          <p id="not-done-help" className={styles.helper}>Ce qui attend encore, sans te juger.</p>
          <textarea id="notDoneToday" rows={6} disabled={!isStorageLoaded}
            aria-describedby="not-done-help" value={todayEntry.notDoneToday}
            onChange={(event) => handleFieldChange("notDoneToday", event.target.value)} />
          <div className={styles.actions}>
            <button type="button" className={`control-button ${styles.secondary}`}
              disabled={!isStorageLoaded || unfinishedObjectives.length === 0}
              onClick={() => handlePrefillField("notDoneToday", unfinishedObjectives)}>
              Ajouter les objectifs restants
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="decideForTomorrow">Ce que je décide pour demain</label>
          <p id="tomorrow-help" className={styles.helper}>Qu&apos;est-ce qui compte pour demain ? Une décision par ligne, jusqu&apos;à trois objectifs.</p>
          <textarea id="decideForTomorrow" rows={6} disabled={!isStorageLoaded}
            aria-describedby="tomorrow-help" value={todayEntry.decideForTomorrow}
            onChange={(event) => {
              setTomorrowPreparationMessage("");
              handleFieldChange("decideForTomorrow", event.target.value);
            }} />
          <div className={styles.actions}>
            <button type="button" className="control-button"
              disabled={!isStorageLoaded || todayEntry.decideForTomorrow.trim() === ""}
              onClick={handlePrepareTomorrowObjectives}>Préparer demain</button>
          </div>
          <p className={styles.helper}>Les objectifs déjà préparés et leurs horaires sont conservés.</p>
          {tomorrowPreparationMessage !== "" && <p className={styles.helper} role="status">{tomorrowPreparationMessage}</p>}
        </div>
      </div>

      <section className={styles.tomorrow} aria-labelledby="tomorrow-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="tomorrow-title">Objectifs de demain</h2>
            {isStorageLoaded && <p className={styles.date}>{formatDate(tomorrowKey)}</p>}
          </div>
          {isStorageLoaded && <span className={styles.counter}>{tomorrowObjectives.length}/3 prévus</span>}
        </div>
        {!isStorageLoaded ? <p className={styles.helper}>Chargement de demain…</p>
          : tomorrowObjectives.length === 0 ? <p className={styles.helper}>Tes objectifs apparaîtront ici après « Préparer demain ».</p>
          : (
            <ul className={styles.objectives}>
              {tomorrowObjectives.map((objective) => (
                <li key={objective.id} className={styles.objective}>
                  <span className={`${styles.objectiveText} ${objective.completed ? styles.completed : ""}`}>{objective.label}</span>
                  <label className={styles.timeField} htmlFor={`tomorrow-time-${objective.id}`}>
                    Heure prévue
                    <input id={`tomorrow-time-${objective.id}`} type="time" value={objective.time}
                      aria-label={`Heure prévue pour ${objective.label}`}
                      onChange={(event) => handleTomorrowObjectiveTimeChange(objective.id, event.target.value)} />
                  </label>
                  <span className={styles.status}>{objective.completed ? "Réalisé" : "À faire"}</span>
                  <button type="button" className="control-button control-button-danger"
                    aria-label={`Supprimer l'objectif de demain : ${objective.label}`}
                    onClick={() => handleDeleteTomorrowObjective(objective.id)}>Supprimer</button>
                </li>
              ))}
            </ul>
          )}
      </section>

      <details className={`${styles.disclosure} ${styles.history}`}>
        <summary>Historique des bilans</summary>
        <div className={styles.disclosureBody}>
          {!isStorageLoaded ? <p className={styles.helper}>Chargement des bilans…</p>
            : savedDates.length === 0 ? <p className={styles.helper}>Tes bilans seront conservés ici.</p>
            : (
              <>
                <ul className={styles.historyDates} aria-label="Choisir un bilan">
                  {savedDates.map((dateKey) => (
                    <li key={dateKey}>
                      <button type="button" aria-pressed={consultationDate === dateKey}
                        className={consultationDate === dateKey ? "control-button control-button-active" : "control-button"}
                        onClick={() => setSelectedDate(dateKey)}>{formatDate(dateKey)}</button>
                    </li>
                  ))}
                </ul>
                <article className={styles.consultation} aria-label={`Bilan du ${formatDate(consultationDate)}`}>
                  <h3>Point du {formatDate(consultationDate)}</h3>
                  <div>
                    <h4>Ce que j&apos;ai accompli</h4>
                    <p>{consultationEntry.accomplishedToday || "Rien noté."}</p>
                  </div>
                  <div>
                    <h4>Ce qu&apos;il me reste à faire</h4>
                    <p>{consultationEntry.notDoneToday || "Rien noté."}</p>
                  </div>
                  <div>
                    <h4>Ce que je décide pour demain</h4>
                    <p>{consultationEntry.decideForTomorrow || "Rien noté."}</p>
                  </div>
                </article>
              </>
            )}
        </div>
      </details>
    </section>
  );
}
