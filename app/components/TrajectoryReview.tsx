"use client";

import { useEffect, useMemo, useState } from "react";
import { getStorage, setStorage, STORAGE_KEYS } from "../utils/storage";

const TRAJECTORY_STORAGE_KEY = STORAGE_KEYS.trajectory;
const DAILY_OBJECTIVES_STORAGE_KEY = STORAGE_KEYS.dailyObjectives;

const sectionStyle = {
  marginTop: "24px",
  maxWidth: "720px",
  width: "100%",
};

const dateStyle = {
  margin: "8px 0 0 0",
  color: "var(--dashboard-text-muted)",
};

const objectivesSectionStyle = {
  marginTop: "24px",
  border: "1px solid rgba(134, 239, 172, 0.16)",
  borderRadius: "8px",
  padding: "16px",
  backgroundColor: "rgba(15, 23, 42, 0.86)",
};

const objectivesHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap" as const,
};

const objectivesTitleStyle = {
  margin: 0,
  color: "var(--dashboard-text-primary)",
  fontSize: "20px",
};

const objectiveCounterStyle = {
  width: "fit-content",
  padding: "4px 9px",
  border: "1px solid rgba(134, 239, 172, 0.18)",
  borderRadius: "999px",
  color: "var(--dashboard-text-accent)",
  fontSize: "12px",
  fontWeight: 700,
};

const objectivesListStyle = {
  listStyle: "none",
  padding: 0,
  margin: "16px 0 0 0",
  display: "grid",
  gap: "12px",
};

const objectiveItemStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "12px",
  alignItems: "center",
  justifyContent: "space-between",
  border: "1px solid rgba(134, 239, 172, 0.12)",
  borderRadius: "8px",
  padding: "12px",
  backgroundColor: "rgba(19, 39, 29, 0.72)",
};

const objectiveCompletedItemStyle = {
  ...objectiveItemStyle,
  backgroundColor: "rgba(18, 34, 25, 0.92)",
};

const tomorrowObjectiveItemStyle = {
  ...objectiveItemStyle,
  display: "flex",
  flexWrap: "wrap" as const,
  justifyContent: "space-between",
};

const tomorrowObjectiveTextStyle = {
  flex: "1 1 180px",
  minWidth: 0,
};

const objectiveTimeStyle = {
  color: "var(--dashboard-text-muted)",
  fontWeight: 700,
  flex: "0 1 90px",
};

const objectiveTextStyle = {
  color: "var(--dashboard-text-primary)",
  fontWeight: 700,
  lineHeight: 1.4,
  flex: "1 1 180px",
  minWidth: 0,
  overflowWrap: "anywhere" as const,
};

const objectiveCompletedTextStyle = {
  ...objectiveTextStyle,
  color: "var(--dashboard-text-muted)",
  textDecoration: "line-through",
};

const objectiveStatusStyle = {
  width: "fit-content",
  padding: "4px 9px",
  border: "1px solid rgba(134, 239, 172, 0.18)",
  borderRadius: "999px",
  color: "var(--dashboard-text-accent)",
  fontSize: "12px",
  fontWeight: 700,
};

const timeInputStyle = {
  width: "min(130px, 100%)",
  padding: "10px 12px",
  border: "1px solid rgba(134, 239, 172, 0.15)",
  borderRadius: "8px",
  font: "inherit",
};

const formStyle = {
  display: "grid",
  gap: "16px",
  marginTop: "24px",
};

const fieldStyle = {
  border: "1px solid rgba(134, 239, 172, 0.16)",
  borderRadius: "8px",
  padding: "16px",
  backgroundColor: "rgba(15, 23, 42, 0.86)",
};

const labelStyle = {
  display: "block",
  fontWeight: 600,
  marginBottom: "8px",
  color: "var(--dashboard-text-primary)",
};

const fieldHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap" as const,
  marginBottom: "8px",
};

const fieldHeaderLabelStyle = {
  ...labelStyle,
  marginBottom: 0,
};

const prefillButtonStyle = {
  fontSize: "14px",
  padding: "8px 12px",
};

const textareaStyle = {
  width: "100%",
  minWidth: 0,
  minHeight: "140px",
  padding: "12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  font: "inherit",
  resize: "vertical" as const,
};

const historySectionStyle = {
  marginTop: "32px",
  color: "var(--dashboard-text-primary)",
};

const historyListStyle = {
  listStyle: "none",
  padding: 0,
  margin: "16px 0 0 0",
  display: "grid",
  gap: "12px",
};

const historyButtonStyle = {
  width: "100%",
  textAlign: "left" as const,
  borderRadius: "8px",
  padding: "12px 16px",
  cursor: "pointer",
  font: "inherit",
};

const activeHistoryButtonStyle = {
  ...historyButtonStyle,
  fontWeight: 600,
};

const emptyTextStyle = {
  marginTop: "16px",
  color: "var(--dashboard-text-muted)",
};

const helperTextStyle = {
  margin: "10px 0 0 0",
  color: "var(--dashboard-text-muted)",
  fontSize: "14px",
};

const consultationTitleStyle = {
  margin: "24px 0 0 0",
};

const consultationBoxStyle = {
  border: "1px solid rgba(134, 239, 172, 0.16)",
  borderRadius: "8px",
  padding: "16px",
  marginTop: "16px",
  display: "grid",
  gap: "16px",
  backgroundColor: "rgba(15, 23, 42, 0.86)",
};

const consultationTextStyle = {
  margin: "8px 0 0 0",
  whiteSpace: "pre-wrap" as const,
};

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
        "Ajoute au moins une ligne dans ce champ pour preparer demain.",
      );
      return;
    }

    const objectivesByDate = getDailyObjectivesByDateFromLocalStorage();
    const savedTomorrowObjectives = objectivesByDate[tomorrowKey] ?? [];
    const updatedTomorrowObjectives = [...savedTomorrowObjectives];

    if (updatedTomorrowObjectives.length >= 3) {
      setTomorrowObjectives(updatedTomorrowObjectives.slice(0, 3));
      setTomorrowPreparationMessage(
        "Demain a deja 3 objectifs. Aucun objectif n'a ete ajoute.",
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
        "Aucun nouvel objectif ajoute : doublons ou limite de 3 deja atteinte.",
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
      `${newObjectives.length} objectif(s) prepare(s) pour demain.${limitMessage}`,
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
    <section style={sectionStyle}>
      <p style={dateStyle}>Aujourd&apos;hui : {today}</p>

      <section style={objectivesSectionStyle}>
        <div style={objectivesHeaderStyle}>
          <h2 style={objectivesTitleStyle}>Objectifs du jour</h2>
          {isStorageLoaded ? (
            <span style={objectiveCounterStyle}>
              {completedObjectivesCount}/{dailyObjectives.length} faits
            </span>
          ) : null}
        </div>

        {!isStorageLoaded ? (
          <p style={emptyTextStyle}>Chargement des objectifs du jour...</p>
        ) : dailyObjectives.length === 0 ? (
          <p style={emptyTextStyle}>
            Aucun objectif du jour enregistre pour aujourd&apos;hui.
          </p>
        ) : (
          <ul style={objectivesListStyle}>
            {dailyObjectives.map((objective) => (
              <li
                key={objective.id}
                style={
                  objective.completed
                    ? objectiveCompletedItemStyle
                    : objectiveItemStyle
                }
              >
                <span style={objectiveTimeStyle}>
                  {objective.time || "Sans heure"}
                </span>
                <span
                  style={
                    objective.completed
                      ? objectiveCompletedTextStyle
                      : objectiveTextStyle
                  }
                >
                  {objective.label}
                </span>
                <span style={objectiveStatusStyle}>
                  {objective.completed ? "Fait" : "Non fait"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={objectivesSectionStyle}>
        <div style={objectivesHeaderStyle}>
          <div>
            <h2 style={objectivesTitleStyle}>Objectifs de demain</h2>
            <p style={dateStyle}>{formatDate(tomorrowKey)}</p>
          </div>
          {isStorageLoaded ? (
            <span style={objectiveCounterStyle}>
              {tomorrowObjectives.length}/3 prevus
            </span>
          ) : null}
        </div>

        {!isStorageLoaded ? (
          <p style={emptyTextStyle}>Chargement des objectifs de demain...</p>
        ) : tomorrowObjectives.length === 0 ? (
          <p style={emptyTextStyle}>
            Aucun objectif de demain prepare pour le moment.
          </p>
        ) : (
          <ul style={objectivesListStyle}>
            {tomorrowObjectives.map((objective) => (
              <li key={objective.id} style={tomorrowObjectiveItemStyle}>
                <input
                  type="time"
                  value={objective.time}
                  onChange={(event) =>
                    handleTomorrowObjectiveTimeChange(
                      objective.id,
                      event.target.value,
                    )
                  }
                  aria-label={`Heure prevue pour ${objective.label}`}
                  style={timeInputStyle}
                />
                <span
                  style={
                    objective.completed
                      ? {
                          ...objectiveCompletedTextStyle,
                          ...tomorrowObjectiveTextStyle,
                        }
                      : {
                          ...objectiveTextStyle,
                          ...tomorrowObjectiveTextStyle,
                        }
                  }
                >
                  {objective.label}
                </span>
                <span style={objectiveStatusStyle}>
                  {objective.completed ? "Fait" : "Non fait"}
                </span>
                <button
                  type="button"
                  className="control-button control-button-danger"
                  style={prefillButtonStyle}
                  onClick={() => handleDeleteTomorrowObjective(objective.id)}
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div style={formStyle}>
        <div style={fieldStyle}>
          <div style={fieldHeaderStyle}>
            <label htmlFor="accomplishedToday" style={fieldHeaderLabelStyle}>
              Ce que j&apos;ai accompli aujourd&apos;hui
            </label>
            <button
              type="button"
              className="control-button"
              style={prefillButtonStyle}
              disabled={!isStorageLoaded || completedObjectives.length === 0}
              onClick={() =>
                handlePrefillField("accomplishedToday", completedObjectives)
              }
            >
              Pr&eacute;remplir les accomplissements
            </button>
          </div>
          <textarea
            id="accomplishedToday"
            style={textareaStyle}
            value={todayEntry.accomplishedToday}
            onChange={(event) =>
              handleFieldChange("accomplishedToday", event.target.value)
            }
          />
        </div>

        <div style={fieldStyle}>
          <div style={fieldHeaderStyle}>
            <label htmlFor="notDoneToday" style={fieldHeaderLabelStyle}>
              Ce que je n&apos;ai pas fait
            </label>
            <button
              type="button"
              className="control-button"
              style={prefillButtonStyle}
              disabled={!isStorageLoaded || unfinishedObjectives.length === 0}
              onClick={() =>
                handlePrefillField("notDoneToday", unfinishedObjectives)
              }
            >
              Pr&eacute;remplir les non faits
            </button>
          </div>
          <textarea
            id="notDoneToday"
            style={textareaStyle}
            value={todayEntry.notDoneToday}
            onChange={(event) => handleFieldChange("notDoneToday", event.target.value)}
          />
        </div>

        <div style={fieldStyle}>
          <div style={fieldHeaderStyle}>
            <label htmlFor="decideForTomorrow" style={fieldHeaderLabelStyle}>
              Ce que je decide pour demain
            </label>
            <button
              type="button"
              className="control-button"
              style={prefillButtonStyle}
              disabled={
                !isStorageLoaded || todayEntry.decideForTomorrow.trim() === ""
              }
              onClick={handlePrepareTomorrowObjectives}
            >
              Pr&eacute;parer les objectifs de demain
            </button>
          </div>
          <textarea
            id="decideForTomorrow"
            style={textareaStyle}
            value={todayEntry.decideForTomorrow}
            onChange={(event) => {
              setTomorrowPreparationMessage("");
              handleFieldChange("decideForTomorrow", event.target.value);
            }}
          />
          {tomorrowPreparationMessage !== "" ? (
            <p style={helperTextStyle}>{tomorrowPreparationMessage}</p>
          ) : null}
        </div>
      </div>

      <section style={historySectionStyle}>
        <h2>Derniers jours enregistres</h2>

        {!isStorageLoaded ? (
          <p style={emptyTextStyle}>Chargement des jours enregistres...</p>
        ) : savedDates.length === 0 ? (
          <p style={emptyTextStyle}>Aucune journee enregistree pour le moment.</p>
        ) : (
          <ul style={historyListStyle}>
            {savedDates.map((dateKey) => (
              <li key={dateKey}>
                <button
                  type="button"
                  className={
                    consultationDate === dateKey
                      ? "control-button control-button-active"
                      : "control-button"
                  }
                  style={
                    consultationDate === dateKey
                      ? activeHistoryButtonStyle
                      : historyButtonStyle
                  }
                  onClick={() => setSelectedDate(dateKey)}
                >
                  {formatDate(dateKey)}
                </button>
              </li>
            ))}
          </ul>
        )}

        {isStorageLoaded && savedDates.length > 0 && (
          <>
            <h3 style={consultationTitleStyle}>Consultation du {formatDate(consultationDate)}</h3>

            <div style={consultationBoxStyle}>
              <div>
                <strong>Ce que j&apos;ai accompli aujourd&apos;hui</strong>
                <p style={consultationTextStyle}>
                  {consultationEntry.accomplishedToday || "Aucun contenu."}
                </p>
              </div>

              <div>
                <strong>Ce que je n&apos;ai pas fait</strong>
                <p style={consultationTextStyle}>
                  {consultationEntry.notDoneToday || "Aucun contenu."}
                </p>
              </div>

              <div>
                <strong>Ce que je decide pour demain</strong>
                <p style={consultationTextStyle}>
                  {consultationEntry.decideForTomorrow || "Aucun contenu."}
                </p>
              </div>
            </div>
          </>
        )}
      </section>
    </section>
  );
}
