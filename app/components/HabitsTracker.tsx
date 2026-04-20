"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "taiji-life-plan-habits";

const defaultHabits = [
  "Boire de l’eau",
  "Lecture",
  "Sport",
  "Méditation",
  "Travail projet",
];

const sectionStyle = {
  marginTop: "24px",
  maxWidth: "420px",
};

const listStyle = {
  listStyle: "none",
  padding: 0,
  margin: "16px 0 0 0",
  display: "grid",
  gap: "12px",
};

const itemStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "12px 16px",
};

const labelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  cursor: "pointer",
};

type HabitsState = Record<string, boolean>;

function getInitialHabitsState() {
  return defaultHabits.reduce<HabitsState>((accumulator, habit) => {
    accumulator[habit] = false;
    return accumulator;
  }, {});
}

export default function HabitsTracker() {
  const [habits, setHabits] = useState<HabitsState>(() => {
    const initialHabits = getInitialHabitsState();

    if (typeof window === "undefined") {
      return initialHabits;
    }

    const savedHabits = localStorage.getItem(STORAGE_KEY);

    if (!savedHabits) {
      return initialHabits;
    }

    try {
      const parsedHabits = JSON.parse(savedHabits) as HabitsState;

      return {
        ...initialHabits,
        ...parsedHabits,
      };
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return initialHabits;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  }, [habits]);

  function handleHabitChange(habitName: string) {
    setHabits((currentHabits) => ({
      ...currentHabits,
      [habitName]: !currentHabits[habitName],
    }));
  }

  return (
    <section style={sectionStyle}>
      <h2>Mes habitudes</h2>
      <ul style={listStyle}>
        {defaultHabits.map((habit) => (
          <li key={habit} style={itemStyle}>
            <label style={labelStyle}>
              <input
                type="checkbox"
                checked={habits[habit] ?? false}
                onChange={() => handleHabitChange(habit)}
              />
              <span>{habit}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
