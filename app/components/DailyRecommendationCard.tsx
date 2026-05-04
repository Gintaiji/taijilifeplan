"use client";

import styles from "../page.module.css";
import { getStorage, STORAGE_KEYS } from "../utils/storage";

const STREAK_MIN_SCORE = 60;

type ProgressHistoryEntry = {
  date: string;
  score: number;
  habitsCompleted: number;
  planningCompleted: number;
};

type DailyPriority = {
  id: number;
  label: string;
  completed: boolean;
};

type SavedPriorities = {
  date: string;
  priorities: DailyPriority[];
};

type Recommendation = {
  title: string;
  text: string;
  detail: string;
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

function normalizePriorities(savedPriorities: unknown): SavedPriorities | null {
  if (typeof savedPriorities !== "object" || savedPriorities === null) {
    return null;
  }

  if (!("date" in savedPriorities) || !("priorities" in savedPriorities)) {
    return null;
  }

  if (
    typeof savedPriorities.date !== "string" ||
    !Array.isArray(savedPriorities.priorities)
  ) {
    return null;
  }

  const priorities = savedPriorities.priorities.flatMap((priority) => {
    if (
      typeof priority !== "object" ||
      priority === null ||
      !("id" in priority) ||
      !("label" in priority) ||
      !("completed" in priority)
    ) {
      return [];
    }

    if (
      typeof priority.id !== "number" ||
      typeof priority.label !== "string" ||
      typeof priority.completed !== "boolean"
    ) {
      return [];
    }

    return [
      {
        id: priority.id,
        label: priority.label,
        completed: priority.completed,
      },
    ];
  });

  return {
    date: savedPriorities.date,
    priorities,
  };
}

function sortNewestFirst(history: ProgressHistoryEntry[]) {
  return [...history].sort((entryA, entryB) =>
    entryB.date.localeCompare(entryA.date),
  );
}

function getPreviousDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);

  date.setDate(date.getDate() - 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getHistoryWithToday(
  todayKey: string,
  globalScore: number,
  habitsCompleted: number,
  planningCompleted: number,
) {
  const savedHistory = getStorage<unknown>(STORAGE_KEYS.progressHistory, []);
  const historyWithoutToday = normalizeProgressHistory(savedHistory).filter(
    (entry) => entry.date !== todayKey,
  );

  return sortNewestFirst([
    {
      date: todayKey,
      score: globalScore,
      habitsCompleted,
      planningCompleted,
    },
    ...historyWithoutToday,
  ]);
}

function getCurrentStreak(history: ProgressHistoryEntry[], todayKey: string) {
  const scoreByDate = new Map(
    history.map((entry) => [entry.date, entry.score]),
  );
  let currentStreak = 0;
  let checkedDate = todayKey;

  while ((scoreByDate.get(checkedDate) ?? 0) >= STREAK_MIN_SCORE) {
    currentStreak += 1;
    checkedDate = getPreviousDateKey(checkedDate);
  }

  return currentStreak;
}

function getUnfinishedPrioritiesCount(todayKey: string) {
  const savedPriorities = getStorage<unknown>(STORAGE_KEYS.priorities, null);
  const priorities = normalizePriorities(savedPriorities);

  if (!priorities || priorities.date !== todayKey) {
    return 0;
  }

  return priorities.priorities.filter((priority) => !priority.completed).length;
}

function getRecommendation({
  globalScore,
  habitsRemaining,
  planningRemaining,
  unfinishedPriorities,
  currentStreak,
}: {
  globalScore: number;
  habitsRemaining: number;
  planningRemaining: number;
  unfinishedPriorities: number;
  currentStreak: number;
}): Recommendation {
  if (globalScore < STREAK_MIN_SCORE && currentStreak === 0) {
    return {
      title: "Valider une petite action",
      text: "Ton score est encore sous 60%. Choisis une action facile pour relancer la journee.",
      detail: "Une habitude courte ou une tache simple suffit pour remettre le mouvement.",
    };
  }

  if (unfinishedPriorities > 0) {
    return {
      title: "Revenir a une priorite",
      text: "Il reste au moins une priorite non faite aujourd'hui.",
      detail: "Consacre un bloc court a cette priorite avant d'ouvrir autre chose.",
    };
  }

  if (habitsRemaining > 0) {
    return {
      title: "Coche une habitude maintenant",
      text: "Une habitude reste disponible pour faire monter ton score.",
      detail: "Prends la plus simple et termine-la tout de suite.",
    };
  }

  if (planningRemaining > 0) {
    return {
      title: "Terminer une tache planning",
      text: "Il reste une tache planifiee non faite.",
      detail: "Choisis la plus courte pour renforcer ta progression du jour.",
    };
  }

  if (globalScore < STREAK_MIN_SCORE) {
    return {
      title: "Proteger la serie",
      text: "Ton streak demande encore un petit effort aujourd'hui.",
      detail: "Valide une action minimum pour atteindre 60%.",
    };
  }

  return {
    title: "Preparer demain",
    text: "Le jour est bien avance, tu peux passer en mode anticipation.",
    detail: "Note une priorite simple pour demain pendant que l'elan est la.",
  };
}

export default function DailyRecommendationCard({
  todayKey,
  globalScore,
  habitsCompleted,
  habitsTotal,
  planningCompleted,
  planningTotal,
}: {
  todayKey: string;
  globalScore: number;
  habitsCompleted: number;
  habitsTotal: number;
  planningCompleted: number;
  planningTotal: number;
}) {
  const habitsRemaining = Math.max(habitsTotal - habitsCompleted, 0);
  const planningRemaining = Math.max(planningTotal - planningCompleted, 0);
  const unfinishedPriorities = getUnfinishedPrioritiesCount(todayKey);
  const history = getHistoryWithToday(
    todayKey,
    globalScore,
    habitsCompleted,
    planningCompleted,
  );
  const currentStreak = getCurrentStreak(history, todayKey);
  const recommendation = getRecommendation({
    globalScore,
    habitsRemaining,
    planningRemaining,
    unfinishedPriorities,
    currentStreak,
  });

  return (
    <article className={`${styles.card} ${styles.recommendationCard}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.cardTitle}>Recommandation du jour</h2>
          <p className={styles.cardText}>{recommendation.text}</p>
        </div>
        <span className={styles.counterBadge}>{globalScore}%</span>
      </div>

      <div className={styles.recommendationBody}>
        <strong className={styles.recommendationTitle}>
          {recommendation.title}
        </strong>
        <p className={styles.recommendationText}>{recommendation.detail}</p>
      </div>

      <div className={styles.recommendationStats}>
        <span>Habitudes restantes : {habitsRemaining}</span>
        <span>Priorites non faites : {unfinishedPriorities}</span>
        <span>Planning restant : {planningRemaining}</span>
        <span>Streak actuel : {currentStreak} jours</span>
      </div>
    </article>
  );
}
