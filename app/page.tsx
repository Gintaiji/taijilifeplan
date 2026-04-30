"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import DataBackupCard from "./components/DataBackupCard";
import { getStorage, setStorage, STORAGE_KEYS } from "./utils/storage";
import styles from "./page.module.css";

const HABITS_STORAGE_KEY = STORAGE_KEYS.habits;
const HABIT_LIST_STORAGE_KEY = STORAGE_KEYS.habitNames;
const GOALS_STORAGE_KEY = STORAGE_KEYS.goals;
const PLANNING_STORAGE_KEY = STORAGE_KEYS.planning;
const TRAJECTORY_STORAGE_KEY = STORAGE_KEYS.trajectory;
const PRIORITIES_STORAGE_KEY = STORAGE_KEYS.priorities;

type HabitsState = Record<string, boolean>;

type SavedDailyHabits = {
  date: string;
  habitsState: HabitsState;
};

type HabitsByDate = Record<string, HabitsState>;

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

type TodayAction = {
  id: string;
  category: string;
  title: string;
  detail: string;
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

function normalizeHabitNames(savedHabitNames: unknown): string[] {
  if (!Array.isArray(savedHabitNames)) {
    return [];
  }

  const usedNames = new Set<string>();
  const habitNames: string[] = [];

  for (const habitName of savedHabitNames) {
    if (typeof habitName !== "string") {
      continue;
    }

    const cleanHabitName = habitName.trim();
    const normalizedHabitName = cleanHabitName.toLowerCase();

    if (cleanHabitName === "" || usedNames.has(normalizedHabitName)) {
      continue;
    }

    usedNames.add(normalizedHabitName);
    habitNames.push(cleanHabitName);
  }

  return habitNames;
}

function normalizeDailyHabits(savedDailyHabits: unknown): SavedDailyHabits | null {
  if (typeof savedDailyHabits !== "object" || savedDailyHabits === null) {
    return null;
  }

  if (!("date" in savedDailyHabits) || !("habitsState" in savedDailyHabits)) {
    return null;
  }

  if (
    typeof savedDailyHabits.date !== "string" ||
    typeof savedDailyHabits.habitsState !== "object"
  ) {
    return null;
  }

  return {
    date: savedDailyHabits.date,
    habitsState: normalizeHabits(savedDailyHabits.habitsState),
  };
}

function normalizeHabitsByDate(savedHabitsByDate: unknown): HabitsByDate {
  if (typeof savedHabitsByDate !== "object" || savedHabitsByDate === null) {
    return {};
  }

  const cleanedHabitsByDate: HabitsByDate = {};

  for (const [dateKey, habitsState] of Object.entries(savedHabitsByDate)) {
    if (typeof habitsState !== "object" || habitsState === null) {
      continue;
    }

    const cleanedHabitsState = normalizeHabits(habitsState);

    if (Object.keys(cleanedHabitsState).length > 0) {
      cleanedHabitsByDate[dateKey] = cleanedHabitsState;
    }
  }

  return cleanedHabitsByDate;
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
  const savedData = getStorage<unknown>(storageKey, fallback);
  return normalize(savedData);
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
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayDayOrder() {
  const todayName = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
  });

  return getDayOrder(todayName);
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

function getInitialGoals(): Goal[] {
  if (typeof window === "undefined") {
    return [];
  }

  return getSavedData(GOALS_STORAGE_KEY, normalizeGoals, []);
}

function getNextPriorityId(currentPriorities: DailyPriority[]) {
  if (currentPriorities.length === 0) {
    return 1;
  }

  return (
    currentPriorities.reduce(
      (highestId, priority) => Math.max(highestId, priority.id),
      0,
    ) + 1
  );
}

function getInitialPriorities(todayKey: string): DailyPriority[] {
  if (typeof window === "undefined") {
    return [];
  }

  const savedPriorities = getStorage<unknown>(PRIORITIES_STORAGE_KEY, null);
  const normalizedPriorities = normalizePriorities(savedPriorities);

  if (!normalizedPriorities || normalizedPriorities.date !== todayKey) {
    return [];
  }

  return normalizedPriorities.priorities.slice(0, 3);
}

function getHabitsByDateFromLocalStorage(): HabitsByDate {
  return getSavedData(
    HABITS_STORAGE_KEY,
    (savedData) => {
      const dailyHabits = normalizeDailyHabits(savedData);

      if (dailyHabits) {
        return {
          [dailyHabits.date]: dailyHabits.habitsState,
        };
      }

      const oldHabitsState = normalizeHabits(savedData);

      if (Object.keys(oldHabitsState).length > 0) {
        return {
          [getTodayKey()]: oldHabitsState,
        };
      }

      return normalizeHabitsByDate(savedData);
    },
    {},
  );
}

function getRelevantPlanningTask(tasks: PlannedTask[]): PlannedTask | null {
  if (tasks.length === 0) {
    return null;
  }

  const todayOrder = getTodayDayOrder();
  const sortedTasks = [...tasks].sort((taskA, taskB) => {
    const dayDifference = getDayOrder(taskA.day) - getDayOrder(taskB.day);

    if (dayDifference !== 0) {
      return dayDifference;
    }

    return getTimeValue(taskA.time) - getTimeValue(taskB.time);
  });
  const todayTask = sortedTasks.find(
    (task) => getDayOrder(task.day) === todayOrder,
  );

  if (todayTask) {
    return todayTask;
  }

  return (
    sortedTasks.find((task) => getDayOrder(task.day) > todayOrder) ??
    sortedTasks[0] ??
    null
  );
}

function getTodayActionsFromLocalStorage(todayKey: string): TodayAction[] {
  const actions: TodayAction[] = [];
  const priorities = getInitialPriorities(todayKey);
  const firstUnfinishedPriority = priorities.find(
    (priority) => !priority.completed,
  );

  if (firstUnfinishedPriority) {
    actions.push({
      id: "priority",
      category: "Priorite",
      title: firstUnfinishedPriority.label,
      detail: "Premiere priorite du jour non terminee.",
    });
  }

  const tasks = getSavedData(PLANNING_STORAGE_KEY, normalizeTasks, []);
  const relevantTask = getRelevantPlanningTask(tasks);

  if (relevantTask) {
    actions.push({
      id: "planning",
      category: "Planning",
      title: relevantTask.label,
      detail: `${relevantTask.day} a ${relevantTask.time}`,
    });
  }

  const habitNames = getSavedData(
    HABIT_LIST_STORAGE_KEY,
    normalizeHabitNames,
    [],
  );
  const habitsByDate = getHabitsByDateFromLocalStorage();
  const todayHabitsState = habitsByDate[todayKey] ?? {};
  const dashboardHabitNames =
    habitNames.length > 0 ? habitNames : Object.keys(todayHabitsState);
  const firstUnfinishedHabit = dashboardHabitNames.find(
    (habitName) => !todayHabitsState[habitName],
  );

  if (firstUnfinishedHabit) {
    actions.push({
      id: "habit",
      category: "Habitude",
      title: firstUnfinishedHabit,
      detail: "Habitude non cochee aujourd'hui.",
    });
  }

  return actions.slice(0, 3);
}

function getDashboardFromLocalStorage(): DashboardState {
  const habitNames = getSavedData(
    HABIT_LIST_STORAGE_KEY,
    normalizeHabitNames,
    [],
  );
  const habitsByDate = getHabitsByDateFromLocalStorage();
  const goals = getSavedData(GOALS_STORAGE_KEY, normalizeGoals, []);
  const tasks = getSavedData(PLANNING_STORAGE_KEY, normalizeTasks, []);
  const trajectoryEntries = getSavedData(
    TRAJECTORY_STORAGE_KEY,
    normalizeTrajectoryEntries,
    {},
  );

  const dashboardHabitNames =
    habitNames.length > 0 ? habitNames : Object.keys(habitsByDate[getTodayKey()] ?? {});
  const todayHabitsState = habitsByDate[getTodayKey()] ?? {};
  const habitsValues = dashboardHabitNames.map(
    (habitName) => todayHabitsState[habitName] ?? false,
  );
  const habitsCompleted = habitsValues.filter(Boolean).length;
  const habitsTotal = dashboardHabitNames.length;

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

function PrioritiesCard({ todayKey }: { todayKey: string }) {
  const [priorities, setPriorities] = useState<DailyPriority[]>(() =>
    getInitialPriorities(todayKey),
  );
  const [goals] = useState<Goal[]>(getInitialGoals);
  const [priorityLabel, setPriorityLabel] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState(() => {
    const initialGoals = getInitialGoals();

    if (initialGoals.length === 0) {
      return "";
    }

    return String(initialGoals[0].id);
  });

  const selectedGoal =
    goals.find((goal) => String(goal.id) === selectedGoalId) ?? null;

  useEffect(() => {
    const savedPriorities: SavedPriorities = {
      date: todayKey,
      priorities,
    };

    setStorage(PRIORITIES_STORAGE_KEY, savedPriorities);
  }, [priorities, todayKey]);

  function hasSamePriorityLabel(label: string) {
    const cleanLabel = label.trim().toLowerCase();

    return priorities.some(
      (priority) => priority.label.trim().toLowerCase() === cleanLabel,
    );
  }

  function handleAddPriority(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanLabel = priorityLabel.trim();

    if (
      cleanLabel === "" ||
      priorities.length >= 3 ||
      hasSamePriorityLabel(cleanLabel)
    ) {
      return;
    }

    setPriorities((currentPriorities) => [
      ...currentPriorities,
      {
        id: getNextPriorityId(currentPriorities),
        label: cleanLabel,
        completed: false,
      },
    ]);
    setPriorityLabel("");
  }

  function handleAddGoalAsPriority() {
    if (!selectedGoal || priorities.length >= 3) {
      return;
    }

    const cleanLabel = selectedGoal.title.trim();

    if (cleanLabel === "" || hasSamePriorityLabel(cleanLabel)) {
      return;
    }

    setPriorities((currentPriorities) => [
      ...currentPriorities,
      {
        id: getNextPriorityId(currentPriorities),
        label: cleanLabel,
        completed: false,
      },
    ]);
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
    <article className={`${styles.card} ${styles.primaryCard}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.cardTitle}>Priorites du jour</h2>
          <p className={styles.cardText}>
            Choisis jusqu&apos;a 3 priorites importantes pour aujourd&apos;hui.
          </p>
        </div>
        <span className={styles.counterBadge}>{priorities.length}/3</span>
      </div>

      <form className={styles.prioritiesForm} onSubmit={handleAddPriority}>
        <div className={styles.inputRow}>
          <input
            type="text"
            value={priorityLabel}
            onChange={(event) => setPriorityLabel(event.target.value)}
            placeholder="Exemple : Finaliser mon objectif principal"
            className={styles.textField}
          />

          <button
            type="submit"
            className={`control-button ${styles.button} ${styles.addButton}`}
            disabled={priorities.length >= 3}
          >
            Ajouter
          </button>
        </div>

        <p className={styles.helperText}>
          Ou choisis un objectif existant pour l&apos;ajouter directement.
        </p>

        <div className={styles.inputRow}>
          <select
            value={selectedGoalId}
            onChange={(event) => setSelectedGoalId(event.target.value)}
            className={styles.textField}
            disabled={goals.length === 0}
          >
            {goals.length === 0 ? (
              <option value="">Aucun objectif disponible</option>
            ) : (
              goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title} ({goal.period})
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            className={`control-button ${styles.button} ${styles.addButton}`}
            onClick={handleAddGoalAsPriority}
            disabled={
              priorities.length >= 3 ||
              selectedGoal === null ||
              hasSamePriorityLabel(selectedGoal.title)
            }
          >
            Transformer en priorite
          </button>
        </div>
      </form>

      {priorities.length === 0 ? (
        <p className={styles.emptyText}>Aucune priorite pour aujourd&apos;hui.</p>
      ) : (
        <ul className={styles.list}>
          {priorities.map((priority) => (
            <li
              key={priority.id}
              className={`${styles.priorityItem} ${
                priority.completed ? styles.priorityCompletedItem : ""
              }`}
            >
              <span
                className={
                  priority.completed
                    ? styles.priorityCompletedText
                    : styles.priorityText
                }
              >
                {priority.label}
              </span>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={`control-button ${styles.button}`}
                  onClick={() => handleTogglePriority(priority.id)}
                >
                  {priority.completed ? "Marquer non faite" : "Marquer faite"}
                </button>

                <button
                  type="button"
                  className={`control-button ${styles.button}`}
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
  );
}

function PrioritiesLoadingCard() {
  return (
    <article className={`${styles.card} ${styles.primaryCard}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.cardTitle}>Priorites du jour</h2>
          <p className={styles.cardText}>
            Choisis jusqu&apos;a 3 priorites importantes pour aujourd&apos;hui.
          </p>
        </div>
        <span className={styles.counterBadge}>0/3</span>
      </div>

      <form className={styles.prioritiesForm}>
        <div className={styles.inputRow}>
          <input
            type="text"
            value=""
            placeholder="Exemple : Finaliser mon objectif principal"
            className={styles.textField}
            readOnly
          />

          <button
            type="button"
            className={`control-button ${styles.button} ${styles.addButton}`}
          >
            Ajouter
          </button>
        </div>

        <p className={styles.helperText}>
          Ou choisis un objectif existant pour l&apos;ajouter directement.
        </p>

        <div className={styles.inputRow}>
          <select value="" className={styles.textField} disabled>
            <option value="">Aucun objectif disponible</option>
          </select>

          <button
            type="button"
            className={`control-button ${styles.button} ${styles.addButton}`}
            disabled
          >
            Transformer en priorite
          </button>
        </div>
      </form>

      <p className={styles.emptyText}>Aucune priorite pour aujourd&apos;hui.</p>
    </article>
  );
}

function TodayActionsCard({ todayKey }: { todayKey: string }) {
  const actions = getTodayActionsFromLocalStorage(todayKey);

  return (
    <article className={`${styles.card} ${styles.actionsCard}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.cardTitle}>Actions du jour</h2>
          <p className={styles.cardText}>
            Une selection simple des prochaines choses utiles a faire.
          </p>
        </div>
        <span className={styles.counterBadge}>{actions.length}/3</span>
      </div>

      {actions.length === 0 ? (
        <p className={styles.emptyText}>Tout est a jour pour aujourd&apos;hui.</p>
      ) : (
        <ul className={styles.list}>
          {actions.map((action) => (
            <li key={action.id} className={styles.actionItem}>
              <span className={styles.actionCategory}>{action.category}</span>
              <strong className={styles.itemTitle}>{action.title}</strong>
              <p className={styles.itemMeta}>{action.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default function HomePage() {
  const todayKey = getTodayKey();
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const dashboard = isClient
    ? getDashboardFromLocalStorage()
    : initialDashboardState;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Dashboard</p>
        <h1 className={styles.pageTitle}>Taiji Life Plan</h1>
        <p className={styles.intro}>
          Bienvenue dans ton application de pilotage personnel. Voici un resume
          simple de tes principales sections.
        </p>
      </section>

      <section className={styles.grid}>
        {isClient ? (
          <PrioritiesCard todayKey={todayKey} />
        ) : (
          <PrioritiesLoadingCard />
        )}

        {isClient ? <DataBackupCard /> : null}

        {isClient ? <TodayActionsCard todayKey={todayKey} /> : null}

        <article className={`${styles.card} ${styles.progressCard}`}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.cardTitle}>Progression globale</h2>
              <p className={styles.cardText}>
                {isClient
                  ? "Vue simple de ta progression sur les sections principales."
                  : "Chargement de la progression globale..."}
              </p>
            </div>
          </div>

          {isClient ? (
            <>
              <div className={styles.progressTop}>
                <div>
                  <p className={styles.progressLabel}>Score actuel</p>
                  <p className={styles.progressValue}>
                    {dashboard.globalProgressScore}%
                  </p>
                </div>

                <p className={styles.messageBadge}>
                  {dashboard.globalProgressMessage}
                </p>
              </div>

              <div className={styles.progressBar} aria-hidden="true">
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${dashboard.globalProgressScore}%` }}
                />
              </div>

              <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>Habitudes</span>
                  <strong className={styles.metricValue}>
                    {dashboard.habitsCompleted}/{dashboard.habitsTotal}
                  </strong>
                </div>

                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>Objectifs</span>
                  <strong className={styles.metricValue}>
                    {dashboard.goalsCompleted}/{dashboard.goalsTotal}
                  </strong>
                </div>

                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>Planning</span>
                  <strong className={styles.metricValue}>
                    {dashboard.planningTotal > 0 ? "Actif" : "Vide"}
                  </strong>
                </div>

                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>Trajectoire</span>
                  <strong className={styles.metricValue}>
                    {dashboard.hasTodayTrajectoryEntry ? "A jour" : "A remplir"}
                  </strong>
                </div>
              </div>

              <ul className={styles.progressDetails}>
                <li className={styles.progressDetailItem}>
                  <span className={styles.progressDetailLabel}>Habitudes</span>
                  <span className={styles.progressDetailValue}>
                    {dashboard.habitsCompleted}/{dashboard.habitsTotal}
                  </span>
                </li>
                <li className={styles.progressDetailItem}>
                  <span className={styles.progressDetailLabel}>Objectifs</span>
                  <span className={styles.progressDetailValue}>
                    {dashboard.goalsCompleted}/{dashboard.goalsTotal}
                  </span>
                </li>
                <li className={styles.progressDetailItem}>
                  <span className={styles.progressDetailLabel}>Planning</span>
                  <span className={styles.progressDetailValue}>
                    {dashboard.planningTotal > 0
                      ? "taches planifiees presentes"
                      : "aucune tache planifiee"}
                  </span>
                </li>
                <li className={styles.progressDetailItem}>
                  <span className={styles.progressDetailLabel}>
                    Correcteur de trajectoire
                  </span>
                  <span className={styles.progressDetailValue}>
                    {dashboard.hasTodayTrajectoryEntry
                      ? "entree du jour presente"
                      : "pas encore d'entree aujourd'hui"}
                  </span>
                </li>
              </ul>
            </>
          ) : (
            <p className={styles.emptyText}>Chargement de la progression...</p>
          )}
        </article>

        <article className={`${styles.card} ${styles.compactCard}`}>
          <h2 className={styles.cardTitle}>Habitudes</h2>
          <p className={styles.cardText}>
            {isClient
              ? "Suivi rapide de tes habitudes du moment."
              : "Chargement des habitudes..."}
          </p>
          {isClient ? (
            <>
              <p className={styles.highlightValue}>
                {dashboard.habitsCompleted}/{dashboard.habitsTotal}
              </p>
              <p className={styles.cardText}>
                habitudes completees aujourd&apos;hui.
              </p>
            </>
          ) : (
            <p className={styles.emptyText}>Chargement des habitudes...</p>
          )}
        </article>

        <article className={`${styles.card} ${styles.compactCard}`}>
          <h2 className={styles.cardTitle}>Objectifs</h2>
          <p className={styles.cardText}>
            {isClient
              ? "Vision rapide de l'avancement de tes objectifs."
              : "Chargement des objectifs..."}
          </p>
          {isClient ? (
            <>
              <p className={styles.highlightValue}>
                {dashboard.goalsCompleted}/{dashboard.goalsTotal}
              </p>
              <p className={styles.cardText}>objectifs termines.</p>
            </>
          ) : (
            <p className={styles.emptyText}>Chargement des objectifs...</p>
          )}
        </article>

        <article className={`${styles.card} ${styles.planningCard}`}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.cardTitle}>Planning</h2>
              <p className={styles.cardText}>
                {isClient
                  ? `${dashboard.planningTotal} taches planifiees.`
                  : "Chargement du planning..."}
              </p>
            </div>
            {isClient ? (
              <span className={styles.counterBadge}>
                {dashboard.nextTasks.length} a venir
              </span>
            ) : null}
          </div>

          {!isClient ? (
            <p className={styles.emptyText}>Chargement des prochaines taches...</p>
          ) : dashboard.nextTasks.length === 0 ? (
            <p className={styles.emptyText}>
              Aucune tache enregistree pour le moment.
            </p>
          ) : (
            <ul className={styles.list}>
              {dashboard.nextTasks.map((task) => (
                <li key={task.id} className={styles.listItem}>
                  <strong className={styles.itemTitle}>{task.label}</strong>
                  <p className={styles.itemMeta}>
                    {task.day} a {task.time}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className={`${styles.card} ${styles.compactCard}`}>
          <h2 className={styles.cardTitle}>Correcteur de trajectoire</h2>
          <p className={styles.cardText}>
            {isClient
              ? "Garde un point de controle sur ta direction."
              : "Chargement de la derniere entree..."}
          </p>

          {!isClient ? (
            <p className={styles.emptyText}>Chargement de la derniere entree...</p>
          ) : dashboard.lastTrajectoryDate ? (
            <>
              <p className={styles.highlightValueSmall}>
                {formatTrajectoryDate(dashboard.lastTrajectoryDate)}
              </p>
              <p className={styles.cardText}>
                Derniere entree enregistree.
              </p>
              <p className={styles.statusText}>
                {dashboard.hasTodayTrajectoryEntry
                  ? "Ton point du jour est deja rempli."
                  : "Il reste ton point du jour a completer."}
              </p>
            </>
          ) : (
            <p className={styles.emptyText}>
              Aucune entree enregistree pour le moment.
            </p>
          )}
        </article>
      </section>
    </main>
  );
}
