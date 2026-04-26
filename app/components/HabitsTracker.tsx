"use client";

import { useEffect, useState } from "react";
import styles from "./HabitsTracker.module.css";

const STORAGE_KEY = "taiji-life-plan-habits";
const HABIT_LIST_STORAGE_KEY = "taiji-life-plan-habit-list";
const ORDER_STORAGE_KEY = "taiji-life-plan-habits-order";

const defaultHabits = [
  "Boire de l'eau",
  "Lecture",
  "Sport",
  "Meditation",
  "Travail projet",
];

type HabitsState = Record<string, boolean>;

type HabitsData = {
  habitNames: string[];
  habitsState: HabitsState;
};

type SavedDailyHabits = {
  date: string;
  habitsState: HabitsState;
};

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function removeDuplicateHabitNames(habitNames: string[]) {
  const usedNames = new Set<string>();
  const uniqueHabitNames: string[] = [];

  for (const habitName of habitNames) {
    const cleanHabitName = habitName.trim();
    const normalizedHabitName = cleanHabitName.toLowerCase();

    if (cleanHabitName === "" || usedNames.has(normalizedHabitName)) {
      continue;
    }

    usedNames.add(normalizedHabitName);
    uniqueHabitNames.push(cleanHabitName);
  }

  return uniqueHabitNames;
}

function getEmptyHabitsState(habitNames: string[]) {
  return habitNames.reduce<HabitsState>((accumulator, habitName) => {
    accumulator[habitName] = false;
    return accumulator;
  }, {});
}

function normalizeHabitsState(savedHabits: unknown): HabitsState {
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

  const habitNames = savedHabitNames.filter(
    (habitName): habitName is string => typeof habitName === "string",
  );

  return removeDuplicateHabitNames(habitNames);
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
    habitsState: normalizeHabitsState(savedDailyHabits.habitsState),
  };
}

function getSavedHabitNames(): string[] | null {
  const savedHabitList = localStorage.getItem(HABIT_LIST_STORAGE_KEY);

  if (savedHabitList) {
    try {
      return normalizeHabitNames(JSON.parse(savedHabitList));
    } catch {
      localStorage.removeItem(HABIT_LIST_STORAGE_KEY);
    }
  }

  const savedOrder = localStorage.getItem(ORDER_STORAGE_KEY);

  if (savedOrder) {
    try {
      const normalizedHabitNames = normalizeHabitNames(JSON.parse(savedOrder));

      if (normalizedHabitNames.length > 0) {
        return normalizedHabitNames;
      }
    } catch {
      localStorage.removeItem(ORDER_STORAGE_KEY);
    }
  }

  const savedHabits = localStorage.getItem(STORAGE_KEY);

  if (savedHabits) {
    try {
      const parsedHabits = JSON.parse(savedHabits);
      const savedDailyHabits = normalizeDailyHabits(parsedHabits);
      const habitsState = savedDailyHabits
        ? savedDailyHabits.habitsState
        : normalizeHabitsState(parsedHabits);
      const normalizedHabitNames = removeDuplicateHabitNames(
        Object.keys(habitsState),
      );

      if (normalizedHabitNames.length > 0) {
        return normalizedHabitNames;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return null;
}

function getSavedHabitsState(habitNames: string[]): HabitsState {
  const savedHabits = localStorage.getItem(STORAGE_KEY);
  const emptyHabitsState = getEmptyHabitsState(habitNames);

  if (!savedHabits) {
    return emptyHabitsState;
  }

  try {
    const parsedHabits = JSON.parse(savedHabits);
    const savedDailyHabits = normalizeDailyHabits(parsedHabits);
    const todayKey = getTodayKey();
    const savedHabitsState =
      savedDailyHabits === null
        ? normalizeHabitsState(parsedHabits)
        : savedDailyHabits.date === todayKey
          ? savedDailyHabits.habitsState
          : {};

    return habitNames.reduce<HabitsState>((accumulator, habitName) => {
      accumulator[habitName] = savedHabitsState[habitName] ?? false;
      return accumulator;
    }, {});
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return emptyHabitsState;
  }
}

function getInitialHabitsData(): HabitsData {
  if (typeof window === "undefined") {
    return {
      habitNames: defaultHabits,
      habitsState: getEmptyHabitsState(defaultHabits),
    };
  }

  const savedHabitNames = getSavedHabitNames();
  const habitNames = savedHabitNames ?? defaultHabits;

  return {
    habitNames,
    habitsState: getSavedHabitsState(habitNames),
  };
}

export default function HabitsTracker() {
  const [habitsData, setHabitsData] = useState<HabitsData>(getInitialHabitsData);
  const [newHabitName, setNewHabitName] = useState("");

  const completedHabitsCount = Object.values(habitsData.habitsState).filter(
    Boolean,
  ).length;
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    const savedDailyHabits: SavedDailyHabits = {
      date: getTodayKey(),
      habitsState: habitsData.habitsState,
    };

    localStorage.setItem(HABIT_LIST_STORAGE_KEY, JSON.stringify(habitsData.habitNames));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDailyHabits));
  }, [habitsData]);

  function handleHabitChange(habitName: string) {
    setHabitsData((currentHabitsData) => ({
      ...currentHabitsData,
      habitsState: {
        ...currentHabitsData.habitsState,
        [habitName]: !currentHabitsData.habitsState[habitName],
      },
    }));
  }

  function handleResetHabits() {
    setHabitsData((currentHabitsData) => ({
      ...currentHabitsData,
      habitsState: currentHabitsData.habitNames.reduce<HabitsState>(
        (accumulator, habitName) => {
          accumulator[habitName] = false;
          return accumulator;
        },
        {},
      ),
    }));
  }

  function handleAddHabit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanHabitName = newHabitName.trim();

    if (
      cleanHabitName === "" ||
      habitsData.habitNames.some(
        (habitName) =>
          habitName.trim().toLowerCase() === cleanHabitName.toLowerCase(),
      )
    ) {
      return;
    }

    setHabitsData((currentHabitsData) => ({
      habitNames: [...currentHabitsData.habitNames, cleanHabitName],
      habitsState: {
        ...currentHabitsData.habitsState,
        [cleanHabitName]: false,
      },
    }));
    setNewHabitName("");
  }

  function handleDeleteHabit(habitName: string) {
    setHabitsData((currentHabitsData) => {
      const nextHabitsState = { ...currentHabitsData.habitsState };
      delete nextHabitsState[habitName];

      return {
        habitNames: currentHabitsData.habitNames.filter(
          (currentHabitName) => currentHabitName !== habitName,
        ),
        habitsState: nextHabitsState,
      };
    });
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Mes habitudes</h2>
          <p className={styles.date}>Aujourd&apos;hui : {today}</p>
        </div>

        <button
          type="button"
          className={`control-button ${styles.button}`}
          onClick={handleResetHabits}
        >
          Reinitialiser
        </button>
      </div>

      <p className={styles.summary}>
        {completedHabitsCount} habitudes sur {habitsData.habitNames.length} completees
      </p>

      <form className={styles.form} onSubmit={handleAddHabit}>
        <div className={styles.formRow}>
          <input
            type="text"
            value={newHabitName}
            onChange={(event) => setNewHabitName(event.target.value)}
            placeholder="Exemple : 10 minutes d'etirements"
            className={styles.input}
          />

          <button
            type="submit"
            className={`control-button ${styles.button} ${styles.addButton}`}
          >
            Ajouter
          </button>
        </div>

        <p className={styles.helperText}>
          Les habitudes ajoutees ou supprimees restent enregistrees apres
          rechargement.
        </p>
      </form>

      <ul className={styles.list}>
        {habitsData.habitNames.map((habit) => (
          <li key={habit} className={styles.item}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={habitsData.habitsState[habit] ?? false}
                onChange={() => handleHabitChange(habit)}
              />
              <span className={styles.habitName}>{habit}</span>
            </label>

            <button
              type="button"
              className={`control-button ${styles.button} ${styles.deleteButton}`}
              onClick={() => handleDeleteHabit(habit)}
            >
              Supprimer
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
