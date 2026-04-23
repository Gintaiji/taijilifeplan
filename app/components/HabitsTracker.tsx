"use client";

import { useEffect, useState } from "react";
import styles from "./HabitsTracker.module.css";

const STORAGE_KEY = "taiji-life-plan-habits";
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

function getDefaultHabitsState() {
  return defaultHabits.reduce<HabitsState>((accumulator, habit) => {
    accumulator[habit] = false;
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

function normalizeHabitNames(
  savedOrder: unknown,
  habitsState: HabitsState,
): string[] {
  const validHabitNames = new Set(Object.keys(habitsState));

  if (!Array.isArray(savedOrder)) {
    return Object.keys(habitsState);
  }

  const orderedHabits = savedOrder.filter(
    (habitName): habitName is string =>
      typeof habitName === "string" && validHabitNames.has(habitName),
  );

  const missingHabits = Object.keys(habitsState).filter(
    (habitName) => !orderedHabits.includes(habitName),
  );

  return [...orderedHabits, ...missingHabits];
}

function getInitialHabitsData(): HabitsData {
  const defaultHabitsState = getDefaultHabitsState();

  if (typeof window === "undefined") {
    return {
      habitNames: defaultHabits,
      habitsState: defaultHabitsState,
    };
  }

  const savedHabits = localStorage.getItem(STORAGE_KEY);
  const savedOrder = localStorage.getItem(ORDER_STORAGE_KEY);

  let normalizedSavedHabits: HabitsState = {};
  let normalizedHabitNames = defaultHabits;

  if (savedHabits) {
    try {
      normalizedSavedHabits = normalizeHabitsState(JSON.parse(savedHabits));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const mergedHabitsState = {
    ...defaultHabitsState,
    ...normalizedSavedHabits,
  };

  if (savedOrder) {
    try {
      normalizedHabitNames = normalizeHabitNames(
        JSON.parse(savedOrder),
        mergedHabitsState,
      );
    } catch {
      localStorage.removeItem(ORDER_STORAGE_KEY);
      normalizedHabitNames = normalizeHabitNames([], mergedHabitsState);
    }
  } else {
    normalizedHabitNames = normalizeHabitNames([], mergedHabitsState);
  }

  return {
    habitNames: normalizedHabitNames,
    habitsState: mergedHabitsState,
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habitsData.habitsState));
    localStorage.setItem(
      ORDER_STORAGE_KEY,
      JSON.stringify(habitsData.habitNames),
    );
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
      cleanHabitName in habitsData.habitsState
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
