"use client";

import { useEffect } from "react";
import styles from "../page.module.css";
import { getStorage, setStorage, STORAGE_KEYS } from "../utils/storage";

const HISTORY_LIMIT = 14;
const DISPLAY_LIMIT = 7;
const STREAK_MIN_SCORE = 60;

type ProgressSummary = {
  date: string;
  score: number;
  habitsCompleted: number;
  planningCompleted: number;
};

type ProgressHistoryEntry = ProgressSummary;

type StreakStats = {
  currentStreak: number;
  bestStreak: number;
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

function sortNewestFirst(history: ProgressHistoryEntry[]) {
  return [...history].sort((entryA, entryB) =>
    entryB.date.localeCompare(entryA.date),
  );
}

function formatHistoryDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function getBarHeight(score: number) {
  const cleanScore = Math.min(Math.max(score, 0), 100);

  return `${cleanScore}%`;
}

function getPreviousDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);

  date.setDate(date.getDate() - 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStreakMessage(currentStreak: number) {
  if (currentStreak >= 7) {
    return "Belle regularite. Continue comme ca.";
  }

  if (currentStreak >= 3) {
    return "La dynamique est lancee.";
  }

  if (currentStreak > 0) {
    return "Jour valide. La serie commence.";
  }

  return "Atteins 60% pour relancer la serie.";
}

function getStreakStats(
  history: ProgressHistoryEntry[],
  todayKey: string,
): StreakStats {
  const scoreByDate = new Map(
    history.map((entry) => [entry.date, entry.score]),
  );
  let currentStreak = 0;
  let checkedDate = todayKey;

  while ((scoreByDate.get(checkedDate) ?? 0) >= STREAK_MIN_SCORE) {
    currentStreak += 1;
    checkedDate = getPreviousDateKey(checkedDate);
  }

  let bestStreak = 0;
  let runningStreak = 0;
  const oldestFirstHistory = [...history].sort((entryA, entryB) =>
    entryA.date.localeCompare(entryB.date),
  );

  for (let index = 0; index < oldestFirstHistory.length; index += 1) {
    const entry = oldestFirstHistory[index];
    const previousEntry = oldestFirstHistory[index - 1];
    const followsPreviousDay =
      !previousEntry || getPreviousDateKey(entry.date) === previousEntry.date;

    if (entry.score >= STREAK_MIN_SCORE && followsPreviousDay) {
      runningStreak += 1;
    } else if (entry.score >= STREAK_MIN_SCORE) {
      runningStreak = 1;
    } else {
      runningStreak = 0;
    }

    bestStreak = Math.max(bestStreak, runningStreak);
  }

  return {
    currentStreak,
    bestStreak,
  };
}

function getProgressHistoryWithToday(todaySummary: ProgressSummary) {
  const savedHistory = getStorage<unknown>(STORAGE_KEYS.progressHistory, []);
  const historyWithoutToday = normalizeProgressHistory(savedHistory).filter(
    (entry) => entry.date !== todaySummary.date,
  );

  return sortNewestFirst([todaySummary, ...historyWithoutToday]).slice(
    0,
    HISTORY_LIMIT,
  );
}

export default function ProgressHistoryCard({
  todaySummary,
}: {
  todaySummary: ProgressSummary;
}) {
  const { date, score, habitsCompleted, planningCompleted } = todaySummary;
  const history = getProgressHistoryWithToday(todaySummary);
  const visibleHistory = history.slice(0, DISPLAY_LIMIT);
  const chartHistory = [...visibleHistory].reverse();
  const streakStats = getStreakStats(history, date);

  useEffect(() => {
    const currentSummary: ProgressSummary = {
      date,
      score,
      habitsCompleted,
      planningCompleted,
    };

    setStorage(
      STORAGE_KEYS.progressHistory,
      getProgressHistoryWithToday(currentSummary),
    );
  }, [date, score, habitsCompleted, planningCompleted]);

  return (
    <article className={`${styles.card} ${styles.historyCard}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.cardTitle}>Historique</h2>
          <p className={styles.cardText}>
            Tes derniers scores.
          </p>
        </div>
        <span className={styles.counterBadge}>{visibleHistory.length}/7</span>
      </div>

      {visibleHistory.length === 0 ? (
        <p className={styles.emptyText}>Chargement de l&apos;historique...</p>
      ) : (
        <>
          <div className={styles.streakPanel}>
            <div className={styles.streakMetric}>
              <span className={styles.metricLabel}>Streak actuel</span>
              <strong className={styles.metricValue}>
                {streakStats.currentStreak} jours
              </strong>
            </div>

            <div className={styles.streakMetric}>
              <span className={styles.metricLabel}>Meilleure serie</span>
              <strong className={styles.metricValue}>
                {streakStats.bestStreak} jours
              </strong>
            </div>

            <p className={styles.streakMessage}>
              {getStreakMessage(streakStats.currentStreak)}
            </p>
          </div>

          <div className={styles.historyChart}>
            {chartHistory.map((entry) => (
              <div key={entry.date} className={styles.historyBarGroup}>
                <div className={styles.historyBarTrack} aria-hidden="true">
                  <div
                    className={styles.historyBarFill}
                    style={{ height: getBarHeight(entry.score) }}
                  />
                </div>
                <span className={styles.historyBarScore}>{entry.score}%</span>
                <span className={styles.historyBarDate}>
                  {formatHistoryDate(entry.date)}
                </span>
              </div>
            ))}
          </div>

          <ul className={styles.list}>
            {visibleHistory.map((entry) => (
              <li key={entry.date} className={styles.historyItem}>
                <div>
                  <strong className={styles.itemTitle}>
                    {formatHistoryDate(entry.date)}
                  </strong>
                  <p className={styles.itemMeta}>
                    {entry.habitsCompleted} habitudes -{" "}
                    {entry.planningCompleted} taches faites
                  </p>
                </div>
                <span className={styles.historyScore}>{entry.score}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
