"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "taiji-life-plan-objectifs";

const periods = ["Hebdomadaire", "Mensuel", "Annuel"] as const;

type GoalPeriod = (typeof periods)[number];

type Goal = {
  id: number;
  title: string;
  period: GoalPeriod;
};

const pageStyle = {
  padding: "24px",
};

const sectionStyle = {
  marginTop: "24px",
  maxWidth: "720px",
};

const introStyle = {
  marginTop: "8px",
  color: "#4b5563",
};

const formStyle = {
  display: "grid",
  gap: "16px",
  marginTop: "24px",
  padding: "16px",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
};

const fieldGroupStyle = {
  display: "grid",
  gap: "8px",
};

const labelStyle = {
  fontWeight: 600,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  font: "inherit",
  backgroundColor: "#ffffff",
};

const selectStyle = {
  ...inputStyle,
};

const addButtonStyle = {
  width: "fit-content",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "10px 14px",
  backgroundColor: "#ffffff",
  cursor: "pointer",
  font: "inherit",
};

const listStyle = {
  listStyle: "none",
  padding: 0,
  margin: "24px 0 0 0",
  display: "grid",
  gap: "12px",
};

const itemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap" as const,
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "16px",
};

const goalTextStyle = {
  display: "grid",
  gap: "6px",
};

const periodBadgeStyle = {
  width: "fit-content",
  padding: "4px 10px",
  borderRadius: "999px",
  backgroundColor: "#e5e7eb",
  color: "#1f2937",
  fontSize: "14px",
};

const deleteButtonStyle = {
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "8px 12px",
  backgroundColor: "#ffffff",
  cursor: "pointer",
  font: "inherit",
};

const emptyTextStyle = {
  marginTop: "24px",
  color: "#6b7280",
};

function getInitialGoals(): Goal[] {
  if (typeof window === "undefined") {
    return [];
  }

  const savedGoals = localStorage.getItem(STORAGE_KEY);

  if (!savedGoals) {
    return [];
  }

  try {
    const parsedGoals = JSON.parse(savedGoals) as Goal[];

    if (!Array.isArray(parsedGoals)) {
      return [];
    }

    return parsedGoals.filter(
      (goal) =>
        typeof goal.id === "number" &&
        typeof goal.title === "string" &&
        periods.includes(goal.period),
    );
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export default function ObjectifsPage() {
  const [goals, setGoals] = useState<Goal[]>(getInitialGoals);
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState<GoalPeriod>("Hebdomadaire");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }, [goals]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanTitle = title.trim();

    if (cleanTitle === "") {
      return;
    }

    const newGoal: Goal = {
      id: Date.now(),
      title: cleanTitle,
      period,
    };

    setGoals((currentGoals) => [...currentGoals, newGoal]);
    setTitle("");
    setPeriod("Hebdomadaire");
  }

  function handleDelete(goalId: number) {
    setGoals((currentGoals) =>
      currentGoals.filter((goal) => goal.id !== goalId),
    );
  }

  return (
    <main style={pageStyle}>
      <h1>Objectifs</h1>
      <p style={introStyle}>
        Ajoute tes objectifs et retrouve-les automatiquement au rechargement de
        la page.
      </p>

      <section style={sectionStyle}>
        <h2>Ajouter un objectif</h2>

        <form style={formStyle} onSubmit={handleSubmit}>
          <div style={fieldGroupStyle}>
            <label htmlFor="goal-title" style={labelStyle}>
              Titre
            </label>
            <input
              id="goal-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Exemple : Lire 2 livres"
              style={inputStyle}
            />
          </div>

          <div style={fieldGroupStyle}>
            <label htmlFor="goal-period" style={labelStyle}>
              Période
            </label>
            <select
              id="goal-period"
              value={period}
              onChange={(event) => setPeriod(event.target.value as GoalPeriod)}
              style={selectStyle}
            >
              {periods.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" style={addButtonStyle}>
            Ajouter l&apos;objectif
          </button>
        </form>

        <h2 style={{ marginTop: "32px" }}>Mes objectifs</h2>

        {goals.length === 0 ? (
          <p style={emptyTextStyle}>Aucun objectif pour le moment.</p>
        ) : (
          <ul style={listStyle}>
            {goals.map((goal) => (
              <li key={goal.id} style={itemStyle}>
                <div style={goalTextStyle}>
                  <strong>{goal.title}</strong>
                  <span style={periodBadgeStyle}>{goal.period}</span>
                </div>

                <button
                  type="button"
                  style={deleteButtonStyle}
                  onClick={() => handleDelete(goal.id)}
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
