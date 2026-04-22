"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const HABITS_STORAGE_KEY = "taiji-life-plan-habits";
const GOALS_STORAGE_KEY = "taiji-life-plan-objectifs";
const PLANNING_STORAGE_KEY = "taiji-life-plan-planning";
const TRAJECTORY_STORAGE_KEY = "taiji-life-plan-trajectory";
const PRIORITIES_STORAGE_KEY = "taiji-life-plan-priorities";

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

type DailyPriority = {
  id: number;
  label: string;
  completed: boolean;
};

type SavedPriorities = {
  date: string;
  priorities: DailyPriority[];
};

type DashboardState = {
  habitsCompleted: number;
  habitsTotal: number;
  goalsCompleted: number;
  goalsTotal: number;
  planningTotal: number;
  nextTasks: PlannedTask[];
  lastTrajectoryDate: string | null;
  hasTodayTrajectoryEntry: boolean;
  globalProgressScore: number;
  globalProgressMessage: string;
};

const pageStyle = {
  padding: "24px",
};

const introStyle = {
  marginTop: "8px",
  color: "var(--dashboard-text-secondary)",
  maxWidth: "720px",
};

const gridStyle = {
  display: "grid",
  gap: "16px",
  marginTop: "24px",
};

const cardStyle = {
  border: "1px solid var(--dashboard-card-border)",
  borderRadius: "8px",
  padding: "16px",
  maxWidth: "720px",
  backgroundColor: "var(--dashboard-card-background)",
};

const cardTitleStyle = {
  margin: 0,
  color: "var(--dashboard-text-primary)",
};

const cardTextStyle = {
  margin: "12px 0 0 0",
  color: "var(--dashboard-text-secondary)",
};

const listStyle = {
  listStyle: "none",
  padding: 0,
  margin: "12px 0 0 0",
  display: "grid",
  gap: "8px",
};

const listItemStyle = {
  border: "1px solid var(--dashboard-card-border)",
  borderRadius: "8px",
  padding: "12px",
  backgroundColor: "var(--dashboard-card-background-soft)",
};

const emptyTextStyle = {
  margin: "12px 0 0 0",
  color: "var(--dashboard-text-muted)",
};

const progressValueStyle = {
  margin: "12px 0 0 0",
  fontSize: "28px",
  fontWeight: 700,
  color: "var(--dashboard-text-accent)",
};

const progressBarStyle = {
  marginTop: "16px",
  width: "100%",
  height: "10px",
  borderRadius: "999px",
  backgroundColor: "var(--dashboard-progress-track)",
  overflow: "hidden",
};

const progressBarFillBaseStyle = {
  height: "100%",
  borderRadius: "999px",
  backgroundColor: "var(--dashboard-progress-fill)",
};

const progressDetailsStyle = {
  margin: "16px 0 0 0",
  paddingLeft: "18px",
  color: "var(--dashboard-text-secondary)",
  display: "grid",
  gap: "8px",
};

const prioritiesFormStyle = {
  display: "grid",
  gap: "12px",
  marginTop: "16px",
};

const inputRowStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const inputStyle = {
  flex: "1 1 260px",
  minWidth: "0",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  font: "inherit",
};

const buttonStyle = {
  borderRadius: "8px",
  padding: "8px 12px",
  cursor: "pointer",
  font: "inherit",
};

const addButtonStyle = {
  ...buttonStyle,
  width: "fit-content",
};

const prioritiesHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap" as const,
};

const counterStyle = {
  color: "var(--dashboard-text-muted)",
  fontSize: "14px",
};

const priorityItemStyle = {
  ...listItemStyle,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap" as const,
};

const priorityCompletedItemStyle = {
  ...priorityItemStyle,
  backgroundColor: "var(--dashboard-card-background-soft)",
};

const priorityTextStyle = {
  fontWeight: 600,
  color: "var(--dashboard-text-primary)",
};

const priorityCompletedTextStyle = {
  ...priorityTextStyle,
  textDecoration: "line-through",
  color: "var(--dashboard-text-muted)",
};

const actionsStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
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
  hasTodayTrajectoryEntry: false,
  globalProgressScore: 0,
  globalProgressMessage: "A renforcer",
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

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getRatio(completed: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return completed / total;
}

function getGlobalProgressMessage(score: number) {
  if (score >= 75) {
    return "Tres bon rythme";
  }

  if (score >= 45) {
    return "Bonne dynamique";
  }

  return "A renforcer";
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

function getInitialPriorities(todayKey: string): DailyPriority[] {
  if (typeof window === "undefined") {
    return [];
  }

  const savedPriorities = localStorage.getItem(PRIORITIES_STORAGE_KEY);

  if (!savedPriorities) {
    return [];
  }

  try {
    const parsedPriorities = JSON.parse(savedPriorities);
    const normalizedPriorities = normalizePriorities(parsedPriorities);

    if (!normalizedPriorities || normalizedPriorities.date !== todayKey) {
      return [];
    }

    return normalizedPriorities.priorities.slice(0, 3);
  } catch {
    localStorage.removeItem(PRIORITIES_STORAGE_KEY);
    return [];
  }
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
  const todayKey = getTodayKey();
  const hasTodayTrajectoryEntry = todayKey in trajectoryEntries;

  const habitsRatio = getRatio(habitsCompleted, habitsTotal);
  const goalsRatio = getRatio(goalsCompleted, goalsTotal);
  const planningRatio = tasks.length > 0 ? 1 : 0;
  const trajectoryRatio = hasTodayTrajectoryEntry ? 1 : 0;
  const globalProgressScore = Math.round(
    ((habitsRatio + goalsRatio + planningRatio + trajectoryRatio) / 4) * 100,
  );

  return {
    habitsCompleted,
    habitsTotal,
    goalsCompleted,
    goalsTotal,
    planningTotal: tasks.length,
    nextTasks,
    lastTrajectoryDate: savedTrajectoryDates[0] ?? null,
    hasTodayTrajectoryEntry,
    globalProgressScore,
    globalProgressMessage: getGlobalProgressMessage(globalProgressScore),
  };
}

export default function HomePage() {
  const todayKey = getTodayKey();
  const [dashboard] = useState<DashboardState>(() => {
    if (typeof window === "undefined") {
      return initialDashboardState;
    }

    return getDashboardFromLocalStorage();
  });
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [priorities, setPriorities] = useState<DailyPriority[]>(() =>
    getInitialPriorities(todayKey),
  );
  const [priorityLabel, setPriorityLabel] = useState("");

  useEffect(() => {
    if (!isClient) {
      return;
    }

    const savedPriorities: SavedPriorities = {
      date: todayKey,
      priorities,
    };

    localStorage.setItem(
      PRIORITIES_STORAGE_KEY,
      JSON.stringify(savedPriorities),
    );
  }, [isClient, priorities, todayKey]);

  function handleAddPriority(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanLabel = priorityLabel.trim();

    if (cleanLabel === "" || priorities.length >= 3) {
      return;
    }

    const newPriority: DailyPriority = {
      id: Date.now(),
      label: cleanLabel,
      completed: false,
    };

    setPriorities((currentPriorities) => [...currentPriorities, newPriority]);
    setPriorityLabel("");
  }

  function handleDeletePriority(priorityId: number) {
    setPriorities((currentPriorities) =>
      currentPriorities.filter((priority) => priority.id !== priorityId),
    );
  }

  function handleTogglePriority(priorityId: number) {
    setPriorities((currentPriorities) =>
      currentPriorities.map((priority) =>
        priority.id === priorityId
          ? { ...priority, completed: !priority.completed }
          : priority,
      ),
    );
  }

  return (
    <main style={pageStyle}>
      <h1>Taiji Life Plan</h1>
      <p style={introStyle}>
        Bienvenue dans ton application de pilotage personnel. Voici un resume
        simple de tes principales sections.
      </p>

      <section style={gridStyle}>
        <article style={cardStyle}>
          <div style={prioritiesHeaderStyle}>
            <h2 style={cardTitleStyle}>Priorites du jour</h2>
            <span style={counterStyle}>{priorities.length}/3</span>
          </div>

          <p style={cardTextStyle}>
            Choisis jusqu&apos;a 3 priorites importantes pour aujourd&apos;hui.
          </p>

          <form style={prioritiesFormStyle} onSubmit={handleAddPriority}>
            <div style={inputRowStyle}>
              <input
                type="text"
                value={priorityLabel}
                onChange={(event) => setPriorityLabel(event.target.value)}
                placeholder="Exemple : Finaliser mon objectif principal"
                style={inputStyle}
              />

              <button
                type="submit"
                className="control-button"
                style={addButtonStyle}
                disabled={priorities.length >= 3}
              >
                Ajouter
              </button>
            </div>
          </form>

          {priorities.length === 0 ? (
            <p style={emptyTextStyle}>Aucune priorite pour aujourd&apos;hui.</p>
          ) : (
            <ul style={listStyle}>
              {priorities.map((priority) => (
                <li
                  key={priority.id}
                  style={
                    priority.completed
                      ? priorityCompletedItemStyle
                      : priorityItemStyle
                  }
                >
                  <span
                    style={
                      priority.completed
                        ? priorityCompletedTextStyle
                        : priorityTextStyle
                    }
                  >
                    {priority.label}
                  </span>

                  <div style={actionsStyle}>
                    <button
                      type="button"
                      className="control-button"
                      style={buttonStyle}
                      onClick={() => handleTogglePriority(priority.id)}
                    >
                      {priority.completed ? "Marquer non faite" : "Marquer faite"}
                    </button>

                    <button
                      type="button"
                      className="control-button"
                      style={buttonStyle}
                      onClick={() => handleDeletePriority(priority.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article style={cardStyle}>
          <h2 style={cardTitleStyle}>Progression globale</h2>
          <p style={cardTextStyle}>
            {isClient
              ? "Vue simple de ta progression sur les sections principales."
              : "Chargement de la progression globale..."}
          </p>

          {isClient ? (
            <>
              <p style={progressValueStyle}>{dashboard.globalProgressScore}%</p>

              <div style={progressBarStyle} aria-hidden="true">
                <div
                  style={{
                    ...progressBarFillBaseStyle,
                    width: `${dashboard.globalProgressScore}%`,
                  }}
                />
              </div>

              <p style={cardTextStyle}>{dashboard.globalProgressMessage}</p>

              <ul style={progressDetailsStyle}>
                <li>
                  Habitudes : {dashboard.habitsCompleted}/{dashboard.habitsTotal}
                </li>
                <li>
                  Objectifs : {dashboard.goalsCompleted}/{dashboard.goalsTotal}
                </li>
                <li>
                  Planning :{" "}
                  {dashboard.planningTotal > 0
                    ? "taches planifiees presentes"
                    : "aucune tache planifiee"}
                </li>
                <li>
                  Correcteur de trajectoire :{" "}
                  {dashboard.hasTodayTrajectoryEntry
                    ? "entree du jour presente"
                    : "pas encore d'entree aujourd'hui"}
                </li>
              </ul>
            </>
          ) : (
            <p style={emptyTextStyle}>Chargement de la progression...</p>
          )}
        </article>

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
