"use client";

import { useEffect, useState } from "react";

const HABITS_STORAGE_KEY = "taiji-life-plan-habits";
const GOALS_STORAGE_KEY = "taiji-life-plan-objectifs";
const PLANNING_STORAGE_KEY = "taiji-life-plan-planning";
const TRAJECTORY_STORAGE_KEY = "taiji-life-plan-trajectory";

type HabitsState = Record<string, boolean>;

type GoalPeriod = "Hebdomadaire" | "Mensuel" | "Annuel";

type Goal = {
  id: number;
  title: string;
  period: GoalPeriod;
  completed: boolean;
};

type PlannedTask = {
  id: number;
  day: string;
  time: string;
  label: string;
};

type TrajectoryState = {
  accomplishedToday: string;
  notDoneToday: string;
  decideForTomorrow: string;
};

type TrajectoryEntries = Record<string, TrajectoryState>;

type DashboardState = {
  habitsCompleted: number;
  habitsTotal: number;
  goalsCompleted: number;
  goalsTotal: number;
  planningTotal: number;
  nextTasks: PlannedTask[];
  lastTrajectoryDate: string | null;
};

const pageStyle = {
  padding: "24px",
};

const introStyle = {
  marginTop: "8px",
  color: "#4b5563",
  maxWidth: "720px",
};

const gridStyle = {
  display: "grid",
  gap: "16px",
  marginTop: "24px",
};

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "16px",
  maxWidth: "720px",
};

const cardTitleStyle = {
  margin: 0,
};

const cardTextStyle = {
  margin: "12px 0 0 0",
  color: "#4b5563",
};

const listStyle = {
  listStyle: "none",
  padding: 0,
  margin: "12px 0 0 0",
  display: "grid",
  gap: "8px",
};

const listItemStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "12px",
};

const emptyTextStyle = {
  margin: "12px 0 0 0",
  color: "#6b7280",
};

const weekdayOrder: Record<string, number> = {
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
  dimanche: 7,
};

const initialDashboardState: DashboardState = {
  habitsCompleted: 0,
  habitsTotal: 0,
  goalsCompleted: 0,
  goalsTotal: 0,
  planningTotal: 0,
  nextTasks: [],
  lastTrajectoryDate: null,
};

function normalizeHabits(savedHabits: unknown): HabitsState {
  if (typeof savedHabits !== "object" || savedHabits === null) {
    return {};
  }

  const cleanedHabits: HabitsState = {};

  for (const [habitName, isCompleted] of Object.entries(savedHabits)) {
    if (typeof isCompleted === "boolean") {
      cleanedHabits[habitName] = isCompleted;
    }
  }

  return cleanedHabits;
}

function normalizeGoals(savedGoals: unknown): Goal[] {
  if (!Array.isArray(savedGoals)) {
    return [];
  }

  return savedGoals.flatMap((goal) => {
    if (
      typeof goal !== "object" ||
      goal === null ||
      !("id" in goal) ||
      !("title" in goal) ||
      !("period" in goal)
    ) {
      return [];
    }

    if (
      typeof goal.id !== "number" ||
      typeof goal.title !== "string" ||
      typeof goal.period !== "string"
    ) {
      return [];
    }

    return [
      {
        id: goal.id,
        title: goal.title,
        period: goal.period as GoalPeriod,
        completed:
          "completed" in goal && typeof goal.completed === "boolean"
            ? goal.completed
            : false,
      },
    ];
  });
}

function normalizeTasks(savedTasks: unknown): PlannedTask[] {
  if (!Array.isArray(savedTasks)) {
    return [];
  }

  return savedTasks.flatMap((task) => {
    if (
      typeof task !== "object" ||
      task === null ||
      !("id" in task) ||
      !("day" in task) ||
      !("time" in task) ||
      !("label" in task)
    ) {
      return [];
    }

    if (
      typeof task.id !== "number" ||
      typeof task.day !== "string" ||
      typeof task.time !== "string" ||
      typeof task.label !== "string"
    ) {
      return [];
    }

    return [
      {
        id: task.id,
        day: task.day,
        time: task.time,
        label: task.label,
      },
    ];
  });
}

function normalizeTrajectoryEntries(savedEntries: unknown): TrajectoryEntries {
  if (typeof savedEntries !== "object" || savedEntries === null) {
    return {};
  }

  const cleanedEntries: TrajectoryEntries = {};

  for (const [dateKey, entry] of Object.entries(savedEntries)) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }

    const accomplishedToday =
      "accomplishedToday" in entry && typeof entry.accomplishedToday === "string"
        ? entry.accomplishedToday
        : "";
    const notDoneToday =
      "notDoneToday" in entry && typeof entry.notDoneToday === "string"
        ? entry.notDoneToday
        : "";
    const decideForTomorrow =
      "decideForTomorrow" in entry && typeof entry.decideForTomorrow === "string"
        ? entry.decideForTomorrow
        : "";

    if (
      accomplishedToday.trim() === "" &&
      notDoneToday.trim() === "" &&
      decideForTomorrow.trim() === ""
    ) {
      continue;
    }

    cleanedEntries[dateKey] = {
      accomplishedToday,
      notDoneToday,
      decideForTomorrow,
    };
  }

  return cleanedEntries;
}

function getSavedData<T>(
  storageKey: string,
  normalize: (data: unknown) => T,
  fallback: T,
): T {
  const savedData = localStorage.getItem(storageKey);

  if (!savedData) {
    return fallback;
  }

  try {
    const parsedData = JSON.parse(savedData);
    return normalize(parsedData);
  } catch {
    localStorage.removeItem(storageKey);
    return fallback;
  }
}

function getDayOrder(day: string) {
  return weekdayOrder[day.trim().toLowerCase()] ?? 99;
}

function getTimeValue(time: string) {
  const [hoursText, minutesText] = time.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return hours * 60 + minutes;
}

function formatTrajectoryDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getDashboardFromLocalStorage(): DashboardState {
  const habits = getSavedData(HABITS_STORAGE_KEY, normalizeHabits, {});
  const goals = getSavedData(GOALS_STORAGE_KEY, normalizeGoals, []);
  const tasks = getSavedData(PLANNING_STORAGE_KEY, normalizeTasks, []);
  const trajectoryEntries = getSavedData(
    TRAJECTORY_STORAGE_KEY,
    normalizeTrajectoryEntries,
    {},
  );

  const habitsValues = Object.values(habits);
  const habitsCompleted = habitsValues.filter(Boolean).length;
  const habitsTotal = habitsValues.length;

  const goalsCompleted = goals.filter((goal) => goal.completed).length;
  const goalsTotal = goals.length;

  const nextTasks = [...tasks]
    .sort((taskA, taskB) => {
      const dayDifference = getDayOrder(taskA.day) - getDayOrder(taskB.day);

      if (dayDifference !== 0) {
        return dayDifference;
      }

      return getTimeValue(taskA.time) - getTimeValue(taskB.time);
    })
    .slice(0, 3);

  const savedTrajectoryDates = Object.keys(trajectoryEntries).sort((a, b) =>
    b.localeCompare(a),
  );

  return {
    habitsCompleted,
    habitsTotal,
    goalsCompleted,
    goalsTotal,
    planningTotal: tasks.length,
    nextTasks,
    lastTrajectoryDate: savedTrajectoryDates[0] ?? null,
  };
}

export default function HomePage() {
  const [dashboard, setDashboard] = useState<DashboardState>(
    initialDashboardState,
  );
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setDashboard(getDashboardFromLocalStorage());
    setIsClient(true);
  }, []);

  return (
    <main style={pageStyle}>
      <h1>Taiji Life Plan</h1>
      <p style={introStyle}>
        Bienvenue dans ton application de pilotage personnel. Voici un resume
        simple de tes principales sections.
      </p>

      <section style={gridStyle}>
        <article style={cardStyle}>
          <h2 style={cardTitleStyle}>Habitudes</h2>
          <p style={cardTextStyle}>
            {isClient
              ? `${dashboard.habitsCompleted} habitudes completees sur ${dashboard.habitsTotal}.`
              : "Chargement des habitudes..."}
          </p>
        </article>

        <article style={cardStyle}>
          <h2 style={cardTitleStyle}>Objectifs</h2>
          <p style={cardTextStyle}>
            {isClient
              ? `${dashboard.goalsCompleted} objectifs termines sur ${dashboard.goalsTotal}.`
              : "Chargement des objectifs..."}
          </p>
        </article>

        <article style={cardStyle}>
          <h2 style={cardTitleStyle}>Planning</h2>
          <p style={cardTextStyle}>
            {isClient
              ? `${dashboard.planningTotal} taches planifiees.`
              : "Chargement du planning..."}
          </p>

          {!isClient ? (
            <p style={emptyTextStyle}>Chargement des prochaines taches...</p>
          ) : dashboard.nextTasks.length === 0 ? (
            <p style={emptyTextStyle}>Aucune tache enregistree pour le moment.</p>
          ) : (
            <ul style={listStyle}>
              {dashboard.nextTasks.map((task) => (
                <li key={task.id} style={listItemStyle}>
                  <strong>{task.label}</strong>
                  <p style={cardTextStyle}>
                    {task.day} a {task.time}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article style={cardStyle}>
          <h2 style={cardTitleStyle}>Correcteur de trajectoire</h2>

          {!isClient ? (
            <p style={emptyTextStyle}>Chargement de la derniere entree...</p>
          ) : dashboard.lastTrajectoryDate ? (
            <p style={cardTextStyle}>
              Derniere entree enregistree :{" "}
              {formatTrajectoryDate(dashboard.lastTrajectoryDate)}
            </p>
          ) : (
            <p style={emptyTextStyle}>Aucune entree enregistree pour le moment.</p>
          )}
        </article>
      </section>
    </main>
  );
}
