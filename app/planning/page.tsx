"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "taiji-life-plan-planning";

const weekdayOrder: Record<string, number> = {
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
  dimanche: 7,
};

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

const planningSectionStyle = {
  marginTop: "32px",
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
  gap: "24px",
};

const dayGroupStyle = {
  display: "grid",
  gap: "12px",
};

const dayTitleStyle = {
  margin: 0,
  fontSize: "18px",
};

const itemStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "16px",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "16px",
  backgroundColor: "#ffffff",
};

const taskTextStyle = {
  display: "grid",
  gap: "10px",
};

const taskInfoRowStyle = {
  display: "grid",
  gap: "4px",
};

const taskInfoLabelStyle = {
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  color: "#4b5563",
};

const taskInfoValueStyle = {
  fontSize: "16px",
  color: "#111827",
};

const taskLabelStyle = {
  fontWeight: 600,
  fontSize: "18px",
  color: "#111827",
};

const taskMetaStyle = {
  display: "grid",
  gap: "8px",
};

const taskSummaryStyle = {
  padding: "12px 16px",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#f9fafb",
};

const taskCountStyle = {
  margin: "8px 0 0 0",
  fontSize: "14px",
  color: "#4b5563",
};

const deleteButtonStyle = {
  borderRadius: "8px",
  padding: "8px 12px",
  cursor: "pointer",
  font: "inherit",
  alignSelf: "start",
};

const emptyTextStyle = {
  marginTop: "24px",
  color: "#6b7280",
};

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

function sortTasks(tasks: PlannedTask[]) {
  return [...tasks].sort((taskA, taskB) => {
    const dayDifference = getDayOrder(taskA.day) - getDayOrder(taskB.day);

    if (dayDifference !== 0) {
      return dayDifference;
    }

    return getTimeValue(taskA.time) - getTimeValue(taskB.time);
  });
}

function groupTasksByDay(tasks: PlannedTask[]) {
  const groups: Array<{ day: string; tasks: PlannedTask[] }> = [];

  for (const task of tasks) {
    const existingGroup = groups.find(
      (group) => group.day.toLowerCase() === task.day.toLowerCase(),
    );

    if (existingGroup) {
      existingGroup.tasks.push(task);
      continue;
    }

    groups.push({
      day: task.day,
      tasks: [task],
    });
  }

  return groups;
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
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingDay, setEditingDay] = useState("");
  const [editingTime, setEditingTime] = useState("");
  const [editingLabel, setEditingLabel] = useState("");
  const sortedTasks = sortTasks(tasks);
  const groupedTasks = groupTasksByDay(sortedTasks);

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

    if (editingTaskId === taskId) {
      handleCancelEdit();
    }
  }

  function handleStartEdit(task: PlannedTask) {
    setEditingTaskId(task.id);
    setEditingDay(task.day);
    setEditingTime(task.time);
    setEditingLabel(task.label);
  }

  function handleCancelEdit() {
    setEditingTaskId(null);
    setEditingDay("");
    setEditingTime("");
    setEditingLabel("");
  }

  function handleSaveEdit(taskId: number) {
    const cleanDay = editingDay.trim();
    const cleanTime = editingTime.trim();
    const cleanLabel = editingLabel.trim();

    if (cleanDay === "" || cleanTime === "" || cleanLabel === "") {
      return;
    }

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              day: cleanDay,
              time: cleanTime,
              label: cleanLabel,
            }
          : task,
      ),
    );

    handleCancelEdit();
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

        <section style={planningSectionStyle}>
          <h2>Mes taches planifiees</h2>

          {tasks.length === 0 ? (
            <p style={emptyTextStyle}>Aucune tache pour le moment.</p>
          ) : (
            <>
              <div style={taskSummaryStyle}>
                <strong>Organisation automatique</strong>
                <p style={taskCountStyle}>
                  Les taches sont triees par jour puis par heure.
                </p>
              </div>

              <ul style={listStyle}>
                {groupedTasks.map((group) => (
                  <li key={group.day} style={dayGroupStyle}>
                    <h3 style={dayTitleStyle}>{group.day}</h3>

                    <ul style={listStyle}>
                      {group.tasks.map((task) => (
                        <li key={task.id} style={itemStyle}>
                          {editingTaskId === task.id ? (
                            <>
                              <div style={taskTextStyle}>
                                <div style={taskInfoRowStyle}>
                                  <label htmlFor={`edit-day-${task.id}`} style={taskInfoLabelStyle}>
                                    Jour
                                  </label>
                                  <input
                                    id={`edit-day-${task.id}`}
                                    type="text"
                                    value={editingDay}
                                    onChange={(event) => setEditingDay(event.target.value)}
                                    placeholder="Exemple : Lundi"
                                    style={inputStyle}
                                  />
                                </div>

                                <div style={taskInfoRowStyle}>
                                  <label
                                    htmlFor={`edit-time-${task.id}`}
                                    style={taskInfoLabelStyle}
                                  >
                                    Heure
                                  </label>
                                  <input
                                    id={`edit-time-${task.id}`}
                                    type="text"
                                    value={editingTime}
                                    onChange={(event) => setEditingTime(event.target.value)}
                                    placeholder="Exemple : 08:30"
                                    style={inputStyle}
                                  />
                                </div>

                                <div style={taskInfoRowStyle}>
                                  <label
                                    htmlFor={`edit-label-${task.id}`}
                                    style={taskInfoLabelStyle}
                                  >
                                    Libelle
                                  </label>
                                  <input
                                    id={`edit-label-${task.id}`}
                                    type="text"
                                    value={editingLabel}
                                    onChange={(event) => setEditingLabel(event.target.value)}
                                    placeholder="Exemple : Sport"
                                    style={inputStyle}
                                  />
                                </div>
                              </div>

                              <div style={taskTextStyle}>
                                <button
                                  type="button"
                                  className="control-button"
                                  style={deleteButtonStyle}
                                  onClick={() => handleSaveEdit(task.id)}
                                >
                                  Enregistrer
                                </button>

                                <button
                                  type="button"
                                  className="control-button"
                                  style={deleteButtonStyle}
                                  onClick={handleCancelEdit}
                                >
                                  Annuler
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={taskTextStyle}>
                                <div style={taskMetaStyle}>
                                  <div style={taskInfoRowStyle}>
                                    <span style={taskInfoLabelStyle}>Jour</span>
                                    <span style={taskInfoValueStyle}>{task.day}</span>
                                  </div>

                                  <div style={taskInfoRowStyle}>
                                    <span style={taskInfoLabelStyle}>Heure</span>
                                    <span style={taskInfoValueStyle}>{task.time}</span>
                                  </div>
                                </div>

                                <div style={taskInfoRowStyle}>
                                  <span style={taskInfoLabelStyle}>Libelle</span>
                                  <span style={taskLabelStyle}>{task.label}</span>
                                </div>
                              </div>

                              <div style={taskTextStyle}>
                                <button
                                  type="button"
                                  className="control-button"
                                  style={deleteButtonStyle}
                                  onClick={() => handleStartEdit(task)}
                                >
                                  Modifier
                                </button>

                                <button
                                  type="button"
                                  className="control-button"
                                  style={deleteButtonStyle}
                                  onClick={() => handleDelete(task.id)}
                                >
                                  Supprimer
                                </button>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
