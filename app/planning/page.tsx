"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "taiji-life-plan-planning";

type PlannedTask = {
  id: number;
  day: string;
  time: string;
  label: string;
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

const taskTextStyle = {
  display: "grid",
  gap: "6px",
};

const taskLabelStyle = {
  fontWeight: 600,
};

const taskMetaStyle = {
  color: "#4b5563",
  fontSize: "14px",
};

const deleteButtonStyle = {
  borderRadius: "8px",
  padding: "8px 12px",
  cursor: "pointer",
  font: "inherit",
};

const emptyTextStyle = {
  marginTop: "24px",
  color: "#6b7280",
};

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

function getInitialTasks(): PlannedTask[] {
  if (typeof window === "undefined") {
    return [];
  }

  const savedTasks = localStorage.getItem(STORAGE_KEY);

  if (!savedTasks) {
    return [];
  }

  try {
    const parsedTasks = JSON.parse(savedTasks);
    return normalizeTasks(parsedTasks);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export default function PlanningPage() {
  const [tasks, setTasks] = useState<PlannedTask[]>(getInitialTasks);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [label, setLabel] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanDay = day.trim();
    const cleanTime = time.trim();
    const cleanLabel = label.trim();

    if (cleanDay === "" || cleanTime === "" || cleanLabel === "") {
      return;
    }

    const newTask: PlannedTask = {
      id: Date.now(),
      day: cleanDay,
      time: cleanTime,
      label: cleanLabel,
    };

    setTasks((currentTasks) => [...currentTasks, newTask]);
    setDay("");
    setTime("");
    setLabel("");
  }

  function handleDelete(taskId: number) {
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId),
    );
  }

  return (
    <main style={pageStyle}>
      <h1>Planning</h1>
      <p style={introStyle}>
        Ajoute tes taches planifiees et retrouve-les automatiquement au
        rechargement de la page.
      </p>

      <section style={sectionStyle}>
        <h2>Ajouter une tache</h2>

        <form style={formStyle} onSubmit={handleSubmit}>
          <div style={fieldGroupStyle}>
            <label htmlFor="task-day" style={labelStyle}>
              Jour
            </label>
            <input
              id="task-day"
              type="text"
              value={day}
              onChange={(event) => setDay(event.target.value)}
              placeholder="Exemple : Lundi"
              style={inputStyle}
            />
          </div>

          <div style={fieldGroupStyle}>
            <label htmlFor="task-time" style={labelStyle}>
              Heure
            </label>
            <input
              id="task-time"
              type="text"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              placeholder="Exemple : 08:30"
              style={inputStyle}
            />
          </div>

          <div style={fieldGroupStyle}>
            <label htmlFor="task-label" style={labelStyle}>
              Libelle
            </label>
            <input
              id="task-label"
              type="text"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Exemple : Sport"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            className="control-button"
            style={addButtonStyle}
          >
            Ajouter la tache
          </button>
        </form>

        <h2 style={{ marginTop: "32px" }}>Mes taches planifiees</h2>

        {tasks.length === 0 ? (
          <p style={emptyTextStyle}>Aucune tache pour le moment.</p>
        ) : (
          <ul style={listStyle}>
            {tasks.map((task) => (
              <li key={task.id} style={itemStyle}>
                <div style={taskTextStyle}>
                  <span style={taskLabelStyle}>{task.label}</span>
                  <span style={taskMetaStyle}>
                    {task.day} a {task.time}
                  </span>
                </div>

                <button
                  type="button"
                  className="control-button"
                  style={deleteButtonStyle}
                  onClick={() => handleDelete(task.id)}
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
