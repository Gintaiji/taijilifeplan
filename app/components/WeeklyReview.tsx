"use client";

import { useEffect, useState } from "react";
import { getStorage, STORAGE_KEYS } from "../utils/storage";

const STREAK_MIN_SCORE = 60;
const PERIOD_OPTIONS = [7, 14, 30] as const;

const sectionStyle = {
  display: "grid",
  gap: "20px",
  marginTop: "24px",
  maxWidth: "960px",
};

const cardStyle = {
  border: "1px solid rgba(134, 239, 172, 0.16)",
  borderRadius: "8px",
  padding: "18px",
  backgroundColor: "rgba(15, 23, 42, 0.86)",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
};

const metricCardStyle = {
  ...cardStyle,
  display: "grid",
  gap: "8px",
};

const labelStyle = {
  color: "var(--dashboard-text-muted)",
  fontSize: "14px",
  fontWeight: 700,
};

const valueStyle = {
  color: "var(--dashboard-text-primary)",
  fontSize: "30px",
  lineHeight: 1,
};

const textStyle = {
  margin: 0,
  color: "var(--dashboard-text-secondary)",
  lineHeight: 1.6,
};

const titleStyle = {
  margin: 0,
  color: "var(--dashboard-text-primary)",
  fontSize: "20px",
};

const listStyle = {
  listStyle: "none",
  padding: 0,
  margin: "16px 0 0 0",
  display: "grid",
  gap: "10px",
};

const listItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap" as const,
  border: "1px solid rgba(134, 239, 172, 0.12)",
  borderRadius: "8px",
  padding: "12px",
  backgroundColor: "rgba(19, 39, 29, 0.72)",
};

const scoreStyle = {
  color: "var(--dashboard-text-accent)",
  fontWeight: 800,
};

const controlsStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
  marginTop: "16px",
};

const periodButtonStyle = {
  borderRadius: "8px",
  padding: "9px 12px",
  cursor: "pointer",
  font: "inherit",
};

const activePeriodButtonStyle = {
  ...periodButtonStyle,
  fontWeight: 700,
};

type PeriodOption = (typeof PERIOD_OPTIONS)[number];

type ProgressHistoryEntry = {
  date: string;
  score: number;
  habitsCompleted: number;
  planningCompleted: number;
};

type WeeklyStats = {
  averageScore: number;
  bestScore: number;
  validatedDays: number;
  currentStreak: number;
  totalHabitsCompleted: number;
  totalPlanningCompleted: number;
  entries: ProgressHistoryEntry[];
};

function normalizeProgressHistory(savedHistory: unknown): ProgressHistoryEntry[] {
  if (!Array.isArray(savedHistory)) {
    return [];
  }

  return savedHistory.flatMap((entry) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("date" in entry) ||
      !("score" in entry) ||
      !("habitsCompleted" in entry) ||
      !("planningCompleted" in entry)
    ) {
      return [];
    }

    if (
      typeof entry.date !== "string" ||
      typeof entry.score !== "number" ||
      typeof entry.habitsCompleted !== "number" ||
      typeof entry.planningCompleted !== "number"
    ) {
      return [];
    }

    return [
      {
        date: entry.date,
        score: entry.score,
        habitsCompleted: entry.habitsCompleted,
        planningCompleted: entry.planningCompleted,
      },
    ];
  });
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

function formatDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getPeriodDateKeys(todayKey: string, periodDays: PeriodOption) {
  return Array.from({ length: periodDays }, (_, index) =>
    getDateKeyWithDayOffset(todayKey, index - (periodDays - 1)),
  );
}

function getCurrentStreak(history: ProgressHistoryEntry[], todayKey: string) {
  const scoreByDate = new Map(
    history.map((entry) => [entry.date, entry.score]),
  );
  let currentStreak = 0;
  let checkedDate = todayKey;

  while ((scoreByDate.get(checkedDate) ?? 0) >= STREAK_MIN_SCORE) {
    currentStreak += 1;
    checkedDate = getDateKeyWithDayOffset(checkedDate, -1);
  }

  return currentStreak;
}

function getWeeklyMessage(averageScore: number) {
  if (averageScore >= 75) {
    return "Semaine solide : tu avances avec une bonne regularite.";
  }

  if (averageScore >= 45) {
    return "La base est la. Garde le cap avec quelques actions simples chaque jour.";
  }

  return "Recentrage utile : choisis peu d'actions, mais termine-les vraiment.";
}

function getWeeklyStats(
  history: ProgressHistoryEntry[],
  periodDays: PeriodOption,
): WeeklyStats {
  const todayKey = getTodayKey();
  const periodDates = getPeriodDateKeys(todayKey, periodDays);
  const periodDateSet = new Set(periodDates);
  const entries = history
    .filter((entry) => periodDateSet.has(entry.date))
    .sort((entryA, entryB) => entryB.date.localeCompare(entryA.date));
  const validatedDays = entries.length;
  const totalScore = entries.reduce((sum, entry) => sum + entry.score, 0);
  const bestScore =
    entries.length === 0
      ? 0
      : Math.max(...entries.map((entry) => entry.score));
  const totalHabitsCompleted = entries.reduce(
    (sum, entry) => sum + entry.habitsCompleted,
    0,
  );
  const totalPlanningCompleted = entries.reduce(
    (sum, entry) => sum + entry.planningCompleted,
    0,
  );

  return {
    averageScore:
      validatedDays === 0 ? 0 : Math.round(totalScore / validatedDays),
    bestScore,
    validatedDays,
    currentStreak: getCurrentStreak(history, todayKey),
    totalHabitsCompleted,
    totalPlanningCompleted,
    entries,
  };
}

export default function WeeklyReview() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [history, setHistory] = useState<ProgressHistoryEntry[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(7);
  const stats = getWeeklyStats(history, selectedPeriod);

  useEffect(() => {
    let shouldUpdateState = true;

    queueMicrotask(() => {
      if (!shouldUpdateState) {
        return;
      }

      const savedHistory = getStorage<unknown>(
        STORAGE_KEYS.progressHistory,
        [],
      );
      const savedProgressHistory = normalizeProgressHistory(savedHistory);

      setHistory(savedProgressHistory);
      setIsLoaded(true);
    });

    return () => {
      shouldUpdateState = false;
    };
  }, []);

  if (!isLoaded) {
    return (
      <section style={sectionStyle}>
        <article style={cardStyle}>
          <p style={textStyle}>Chargement du bilan hebdomadaire...</p>
        </article>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <article style={cardStyle}>
        <h2 style={titleStyle}>Synthese des {selectedPeriod} derniers jours</h2>
        <p style={{ ...textStyle, marginTop: "8px" }}>
          {getWeeklyMessage(stats.averageScore)}
        </p>
        <div style={controlsStyle} aria-label="Choix de la periode">
          {PERIOD_OPTIONS.map((periodOption) => {
            const isActive = selectedPeriod === periodOption;

            return (
              <button
                key={periodOption}
                type="button"
                className={
                  isActive
                    ? "control-button control-button-active"
                    : "control-button"
                }
                style={
                  isActive ? activePeriodButtonStyle : periodButtonStyle
                }
                onClick={() => setSelectedPeriod(periodOption)}
              >
                {periodOption} jours
              </button>
            );
          })}
        </div>
      </article>

      <div style={gridStyle}>
        <article style={metricCardStyle}>
          <span style={labelStyle}>Score moyen</span>
          <strong style={valueStyle}>{stats.averageScore}%</strong>
        </article>

        <article style={metricCardStyle}>
          <span style={labelStyle}>Meilleur score</span>
          <strong style={valueStyle}>{stats.bestScore}%</strong>
        </article>

        <article style={metricCardStyle}>
          <span style={labelStyle}>Jours valides</span>
          <strong style={valueStyle}>
            {stats.validatedDays}/{selectedPeriod}
          </strong>
        </article>

        <article style={metricCardStyle}>
          <span style={labelStyle}>Streak actuel</span>
          <strong style={valueStyle}>{stats.currentStreak} jours</strong>
        </article>

        <article style={metricCardStyle}>
          <span style={labelStyle}>Habitudes completees</span>
          <strong style={valueStyle}>{stats.totalHabitsCompleted}</strong>
        </article>

        <article style={metricCardStyle}>
          <span style={labelStyle}>Taches planning faites</span>
          <strong style={valueStyle}>{stats.totalPlanningCompleted}</strong>
        </article>
      </div>

      <article style={cardStyle}>
        <h2 style={titleStyle}>Detail de la periode</h2>

        {stats.entries.length === 0 ? (
          <p style={{ ...textStyle, marginTop: "12px" }}>
            Aucun jour enregistre sur les {selectedPeriod} derniers jours.
          </p>
        ) : (
          <ul style={listStyle}>
            {stats.entries.map((entry) => (
              <li key={entry.date} style={listItemStyle}>
                <div>
                  <strong>{formatDate(entry.date)}</strong>
                  <p style={{ ...textStyle, marginTop: "4px" }}>
                    {entry.habitsCompleted} habitudes -{" "}
                    {entry.planningCompleted} taches planning faites
                  </p>
                </div>
                <span style={scoreStyle}>{entry.score}%</span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
