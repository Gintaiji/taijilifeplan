"use client";

import { useEffect, useState } from "react";
import { getStorage, STORAGE_KEYS } from "../utils/storage";

import styles from "./WeeklyReview.module.css";

const STREAK_MIN_SCORE = 60;
const PERIOD_OPTIONS = [7, 14, 30] as const;

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
    return "De belles avancées dans les journées enregistrées. Continue à ton rythme.";
  }

  if (averageScore >= 45) {
    return "Chaque avancée compte. Garde les petites actions qui te font du bien.";
  }

  return "Tu peux reprendre doucement, avec une petite action à ta portée.";
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
      <section className={styles.review} aria-busy="true" aria-label="Bilan de progression">
        <p className={styles.muted} role="status">Chargement du bilan…</p>
      </section>
    );
  }

  return (
    <section className={styles.review} aria-label="Bilan de progression">
      <div className={styles.controls} role="group" aria-label="Choix de la période">
        {PERIOD_OPTIONS.map((periodOption) => (
          <button key={periodOption} type="button" aria-pressed={selectedPeriod === periodOption}
            className={selectedPeriod === periodOption ? "control-button control-button-active" : "control-button"}
            onClick={() => setSelectedPeriod(periodOption)}>{periodOption} jours</button>
        ))}
      </div>

      <article className={styles.scoreCard} aria-labelledby="average-score-title">
        <h2 id="average-score-title">Score moyen</h2>
        <p className={styles.period}>Sur les {selectedPeriod} derniers jours</p>
        <p className={styles.average}>
          {stats.validatedDays > 0 ? <>{stats.averageScore}<span className={styles.percent}> %</span></> : "—"}
        </p>
        <p className={styles.basis}>
          {stats.validatedDays > 0
            ? `Moyenne calculée sur ${stats.validatedDays} journée${stats.validatedDays > 1 ? "s" : ""} réellement enregistrée${stats.validatedDays > 1 ? "s" : ""}.`
            : "Aucune journée enregistrée sur cette période."}
        </p>
        <dl className={styles.primaryStats}>
          <div>
            <dt>Jours enregistrés</dt>
            <dd>{stats.validatedDays}<span className={styles.denominator}> / {selectedPeriod}</span></dd>
          </div>
          <div>
            <dt>Meilleur score</dt>
            <dd>{stats.validatedDays > 0 ? `${stats.bestScore} %` : "—"}</dd>
          </div>
        </dl>
        <p className={styles.encouragement}>
          {stats.validatedDays === 0
            ? "Ton prochain bilan sera un premier repère. Avance à ton rythme."
            : getWeeklyMessage(stats.averageScore)}
        </p>
      </article>

      <div className={styles.context}>
        <p>Les journées sans données ne sont pas comptées dans la moyenne.</p>
        {selectedPeriod === 30 && (
          <p>La vue 30 jours utilise uniquement l&apos;historique disponible : l&apos;application conserve actuellement les 14 dernières journées enregistrées, qui peuvent être espacées. Elle ne couvre donc pas nécessairement les 30 jours.</p>
        )}
      </div>

      <details className={styles.disclosure}>
        <summary>Autres repères</summary>
        <div className={styles.disclosureBody}>
          <dl className={styles.secondaryStats}>
            <div><dt>Série actuelle</dt><dd>{stats.currentStreak} jours</dd></div>
            <div><dt>Habitudes réalisées</dt><dd>{stats.totalHabitsCompleted}</dd></div>
            <div><dt>Tâches terminées</dt><dd>{stats.totalPlanningCompleted}</dd></div>
          </dl>
          <p className={styles.muted}>Habitudes et tâches sur la période choisie. La série actuelle compte les jours consécutifs à au moins 60 %, en partant d&apos;aujourd&apos;hui, sur l&apos;historique disponible.</p>
        </div>
      </details>

      <details className={styles.disclosure}>
        <summary>Détail des journées enregistrées <span className={styles.detailCount}>({stats.validatedDays})</span></summary>
        <div className={styles.disclosureBody}>
          {stats.entries.length === 0 ? (
            <p className={styles.muted}>Aucune journée enregistrée sur les {selectedPeriod} derniers jours.</p>
          ) : (
            <ul className={styles.days}>
              {stats.entries.map((entry) => (
                <li key={entry.date} className={styles.day}>
                  <div>
                    <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                    <p>{entry.habitsCompleted} habitudes · {entry.planningCompleted} tâches terminées</p>
                  </div>
                  <span className={styles.dayScore}>{entry.score} %</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </section>
  );
}
