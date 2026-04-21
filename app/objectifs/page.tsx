"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "taiji-life-plan-objectifs";

const periods = ["Hebdomadaire", "Mensuel", "Annuel"] as const;

type GoalPeriod = (typeof periods)[number];

type Goal = {
  id: number;
  title: string;
  period: GoalPeriod;
  completed: boolean;
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
};

const selectStyle = {
  ...inputStyle,
};

const addButtonStyle = {
  width: "fit-content",
  borderRadius: "8px",
  padding: "10px 14px",
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

const itemCompletedStyle = {
  ...itemStyle,
  backgroundColor: "#f9fafb",
};

const goalTextStyle = {
  display: "grid",
  gap: "6px",
};

const goalTitleStyle = {
  fontWeight: 600,
};

const goalTitleCompletedStyle = {
  ...goalTitleStyle,
  textDecoration: "line-through",
  color: "#6b7280",
};

const periodBadgeStyle = {
  width: "fit-content",
  padding: "4px 10px",
  borderRadius: "999px",
  backgroundColor: "#e5e7eb",
  color: "#1f2937",
  fontSize: "14px",
};

const buttonStyle = {
  borderRadius: "8px",
  padding: "8px 12px",
  cursor: "pointer",
  font: "inherit",
};

const actionsStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const periodSectionTitleStyle = {
  marginTop: "24px",
};

const emptyTextStyle = {
  marginTop: "24px",
  color: "#6b7280",
};

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
      !periods.includes(goal.period as GoalPeriod)
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

function getInitialGoals(): Goal[] {
  if (typeof window === "undefined") {
    return [];
  }

  const savedGoals = localStorage.getItem(STORAGE_KEY);

  if (!savedGoals) {
    return [];
  }

  try {
    const parsedGoals = JSON.parse(savedGoals);
    return normalizeGoals(parsedGoals);
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
      completed: false,
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

  function handleToggleCompleted(goalId: number) {
    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === goalId ? { ...goal, completed: !goal.completed } : goal,
      ),
    );
  }

  return (
    <main style={pageStyle}>
      <h1>Objectifs</h1>
      <p style={introStyle}>
        Ajoute tes objectifs et retrouve-les automatiquement au rechargement de
        la page, avec leur etat termine ou non termine.
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
              Periode
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

          <button
            type="submit"
            className="control-button"
            style={addButtonStyle}
          >
            Ajouter l&apos;objectif
          </button>
        </form>

        <h2 style={{ marginTop: "32px" }}>Mes objectifs</h2>

        {goals.length === 0 ? (
          <p style={emptyTextStyle}>Aucun objectif pour le moment.</p>
        ) : (
          periods.map((currentPeriod) => {
            const goalsByPeriod = goals.filter(
              (goal) => goal.period === currentPeriod,
            );

            return (
              <section key={currentPeriod}>
                <h3 style={periodSectionTitleStyle}>{currentPeriod}</h3>

                {goalsByPeriod.length === 0 ? (
                  <p style={emptyTextStyle}>
                    Aucun objectif dans cette section.
                  </p>
                ) : (
                  <ul style={listStyle}>
                    {goalsByPeriod.map((goal) => (
                      <li
                        key={goal.id}
                        style={goal.completed ? itemCompletedStyle : itemStyle}
                      >
                        <div style={goalTextStyle}>
                          <span
                            style={
                              goal.completed
                                ? goalTitleCompletedStyle
                                : goalTitleStyle
                            }
                          >
                            {goal.title}
                          </span>
                          <span style={periodBadgeStyle}>{goal.period}</span>
                        </div>

                        <div style={actionsStyle}>
                          <button
                            type="button"
                            className="control-button"
                            style={buttonStyle}
                            onClick={() => handleToggleCompleted(goal.id)}
                          >
                            {goal.completed
                              ? "Marquer non termine"
                              : "Marquer termine"}
                          </button>

                          <button
                            type="button"
                            className="control-button"
                            style={buttonStyle}
                            onClick={() => handleDelete(goal.id)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })
        )}
      </section>
    </main>
  );
}
