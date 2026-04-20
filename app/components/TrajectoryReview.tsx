"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "taiji-life-plan-trajectory";

const sectionStyle = {
  marginTop: "24px",
  maxWidth: "720px",
};

const dateStyle = {
  margin: "8px 0 0 0",
  color: "#4b5563",
};

const formStyle = {
  display: "grid",
  gap: "16px",
  marginTop: "24px",
};

const fieldStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "16px",
};

const labelStyle = {
  display: "block",
  fontWeight: 600,
  marginBottom: "8px",
};

const textareaStyle = {
  width: "100%",
  minHeight: "140px",
  padding: "12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  font: "inherit",
  resize: "vertical" as const,
};

const historySectionStyle = {
  marginTop: "32px",
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
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "12px 16px",
  backgroundColor: "#ffffff",
  cursor: "pointer",
};

const activeHistoryButtonStyle = {
  ...historyButtonStyle,
  backgroundColor: "#e5e7eb",
  fontWeight: 600,
};

const emptyTextStyle = {
  marginTop: "16px",
  color: "#6b7280",
};

const consultationTitleStyle = {
  margin: "24px 0 0 0",
};

const consultationBoxStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "16px",
  marginTop: "16px",
  display: "grid",
  gap: "16px",
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

function getInitialTrajectoryState(): TrajectoryState {
  return {
    accomplishedToday: "",
    notDoneToday: "",
    decideForTomorrow: "",
  };
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isTrajectoryEmpty(trajectory: TrajectoryState) {
  return (
    trajectory.accomplishedToday.trim() === "" &&
    trajectory.notDoneToday.trim() === "" &&
    trajectory.decideForTomorrow.trim() === ""
  );
}

function formatDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getInitialEntriesState(): TrajectoryEntries {
  const initialState = getInitialTrajectoryState();

  if (typeof window === "undefined") {
    return {};
  }

  const savedTrajectory = localStorage.getItem(STORAGE_KEY);

  if (!savedTrajectory) {
    return {};
  }

  try {
    const parsedTrajectory = JSON.parse(savedTrajectory) as
      | Partial<TrajectoryState>
      | TrajectoryEntries;

    if (
      typeof parsedTrajectory === "object" &&
      parsedTrajectory !== null &&
      "accomplishedToday" in parsedTrajectory
    ) {
      const migratedEntry = {
        ...initialState,
        ...parsedTrajectory,
      };

      if (isTrajectoryEmpty(migratedEntry)) {
        return {};
      }

      return {
        [getTodayKey()]: migratedEntry,
      };
    }

    const entries = parsedTrajectory as TrajectoryEntries;
    const cleanedEntries: TrajectoryEntries = {};

    for (const [dateKey, entry] of Object.entries(entries)) {
      const completeEntry = {
        ...initialState,
        ...entry,
      };

      if (!isTrajectoryEmpty(completeEntry)) {
        cleanedEntries[dateKey] = completeEntry;
      }
    }

    return cleanedEntries;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return {};
  }
}

export default function TrajectoryReview() {
  const todayKey = useMemo(() => getTodayKey(), []);
  const today = useMemo(() => formatDate(todayKey), [todayKey]);

  const [entries, setEntries] = useState<TrajectoryEntries>(getInitialEntriesState);
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const todayEntry = entries[todayKey] ?? getInitialTrajectoryState();

  const savedDates = Object.keys(entries).sort((a, b) => b.localeCompare(a));
  const consultationDate = savedDates.includes(selectedDate)
    ? selectedDate
    : (savedDates[0] ?? todayKey);
  const consultationEntry = entries[consultationDate] ?? getInitialTrajectoryState();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

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

  return (
    <section style={sectionStyle}>
      <p style={dateStyle}>Aujourd&apos;hui : {today}</p>

      <div style={formStyle}>
        <div style={fieldStyle}>
          <label htmlFor="accomplishedToday" style={labelStyle}>
            Ce que j&apos;ai accompli aujourd&apos;hui
          </label>
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
          <label htmlFor="notDoneToday" style={labelStyle}>
            Ce que je n&apos;ai pas fait
          </label>
          <textarea
            id="notDoneToday"
            style={textareaStyle}
            value={todayEntry.notDoneToday}
            onChange={(event) => handleFieldChange("notDoneToday", event.target.value)}
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="decideForTomorrow" style={labelStyle}>
            Ce que je décide pour demain
          </label>
          <textarea
            id="decideForTomorrow"
            style={textareaStyle}
            value={todayEntry.decideForTomorrow}
            onChange={(event) =>
              handleFieldChange("decideForTomorrow", event.target.value)
            }
          />
        </div>
      </div>

      <section style={historySectionStyle}>
        <h2>Derniers jours enregistrés</h2>

        {savedDates.length === 0 ? (
          <p style={emptyTextStyle}>Aucune journée enregistrée pour le moment.</p>
        ) : (
          <ul style={historyListStyle}>
            {savedDates.map((dateKey) => (
              <li key={dateKey}>
                <button
                  type="button"
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

        {savedDates.length > 0 && (
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
                <strong>Ce que je décide pour demain</strong>
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
