"use client";

import { useEffect, useState } from "react";
import { getStorage, setStorage, STORAGE_KEYS } from "../utils/storage";

import styles from "./page.module.css";

const STORAGE_KEY = STORAGE_KEYS.planning;

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
  completed: boolean;
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
        completed:
          "completed" in task && typeof task.completed === "boolean"
            ? task.completed
            : false,
      },
    ];
  });
}

function getInitialTasks(): PlannedTask[] {
  if (typeof window === "undefined") {
    return [];
  }

  const savedTasks = getStorage<unknown>(STORAGE_KEY, []);
  return normalizeTasks(savedTasks);
}

export default function PlanningPage() {
  const [tasks, setTasks] = useState<PlannedTask[]>([]);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [label, setLabel] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingDay, setEditingDay] = useState("");
  const [editingTime, setEditingTime] = useState("");
  const [editingLabel, setEditingLabel] = useState("");
  const sortedTasks = sortTasks(tasks);
  // Presentation only: retain every stored day value and the existing time order.
  const groupedTasks = [
    ...Object.entries(weekdayOrder).map(([dayName, order]) => ({
      day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      tasks: sortedTasks.filter((task) => getDayOrder(task.day) === order),
    })),
    ...groupTasksByDay(sortedTasks.filter((task) => getDayOrder(task.day) === 99)),
  ];

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setTasks(getInitialTasks());
      setIsStorageLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isStorageLoaded) {
      return;
    }

    setStorage(STORAGE_KEY, tasks);
  }, [isStorageLoaded, tasks]);

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
      completed: false,
    };

    setTasks((currentTasks) => [...currentTasks, newTask]);
    setDay("");
    setTime("");
    setLabel("");
    setIsAdding(false);
  }

  function handleDelete(taskId: number) {
    const confirmed = window.confirm("Supprimer cette tache ?");

    if (!confirmed) {
      return;
    }

    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId),
    );

    if (editingTaskId === taskId) {
      handleCancelEdit();
    }
  }

  function handleToggleCompleted(taskId: number) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completed: !task.completed,
            }
          : task,
      ),
    );
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
    <main className={styles.page} aria-busy={!isStorageLoaded}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1>Planning</h1>
            <p className={styles.intro}>Organise les moments importants de ta semaine.</p>
          </div>
          <button type="button" className="control-button" disabled={!isStorageLoaded}
            aria-expanded={isAdding} aria-controls="new-task-form"
            onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? "Fermer le formulaire" : "Ajouter une tâche"}
          </button>
        </header>

        <datalist id="planning-days">
          {Object.keys(weekdayOrder).map((weekday) => (
            <option key={weekday} value={weekday.charAt(0).toUpperCase() + weekday.slice(1)} />
          ))}
        </datalist>
        {isAdding && (
          <form id="new-task-form" className={styles.form} onSubmit={handleSubmit}>
            <h2>Nouvelle tâche</h2>
            <div className={styles.fields}>
              <label className={styles.field} htmlFor="task-day">
                Jour
                <input id="task-day" type="text" list="planning-days" value={day}
                  onChange={(event) => setDay(event.target.value)} placeholder="Exemple : Lundi" required />
              </label>
              <label className={styles.field} htmlFor="task-time">
                Heure
                <input id="task-time" type="text" value={time}
                  onChange={(event) => setTime(event.target.value)} placeholder="Exemple : 08:30" required />
              </label>
            </div>
            <label className={styles.field} htmlFor="task-label">
              Tâche
              <input id="task-label" type="text" value={label}
                onChange={(event) => setLabel(event.target.value)} placeholder="Exemple : Sport" required />
            </label>
            <div className={styles.actions}>
              <button type="submit" className="control-button">Ajouter</button>
            </div>
          </form>
        )}

        {!isStorageLoaded ? (
          <p className={styles.muted} role="status">Chargement du planning…</p>
        ) : (
          <section className={styles.agenda} aria-label="Agenda hebdomadaire">
            <p className={styles.overview}>
              {tasks.filter((task) => task.completed).length} / {tasks.length} tâches faites dans le planning
            </p>
            {tasks.length === 0 && <p className={styles.muted}>Aucune tâche pour l&apos;instant. Ajoute un premier moment à ta semaine.</p>}
            {groupedTasks.map((group) => (
              <details key={group.day} className={styles.day}>
                <summary className={styles.daySummary}>
                  <span className={styles.dayName}>{group.day || "Jour non renseigné"}</span>
                  <span className={styles.count}>
                    {group.tasks.length === 0 ? "Libre" : `${group.tasks.filter((task) => task.completed).length} / ${group.tasks.length} faites`}
                  </span>
                </summary>
                {group.tasks.length === 0 ? (
                  <p className={styles.emptyDay}>Aucune tâche prévue.</p>
                ) : (
                  <ul className={styles.tasks}>
                    {group.tasks.map((task) => (
                      <li key={task.id} className={`${styles.task} ${task.completed ? styles.completed : ""}`}>
                        <div className={styles.taskRow}>
                          <label className={styles.taskLabel}>
                            <input type="checkbox" checked={task.completed}
                              onChange={() => handleToggleCompleted(task.id)} />
                            <span className={styles.taskTitle}>{task.label}</span>
                            <span className={styles.time}>{task.time}</span>
                          </label>
                          <details className={styles.manage}>
                            <summary aria-label={`Gérer la tâche : ${task.label}`}>Gérer</summary>
                            <div className={styles.menu}>
                              <button type="button" className="control-button"
                                onClick={(event) => {
                                  handleStartEdit(task);
                                  const menu = event.currentTarget.closest("details");
                                  if (menu) menu.open = false;
                                }}>Modifier</button>
                              <button type="button" className="control-button control-button-danger"
                                onClick={() => handleDelete(task.id)}>Supprimer</button>
                            </div>
                          </details>
                        </div>
                        {editingTaskId === task.id && (
                          <form className={styles.editForm} onSubmit={(event) => {
                            event.preventDefault();
                            handleSaveEdit(task.id);
                          }}>
                            <div className={styles.fields}>
                              <label className={styles.field} htmlFor={`edit-day-${task.id}`}>
                                Jour
                                <input id={`edit-day-${task.id}`} type="text" list="planning-days" value={editingDay}
                                  onChange={(event) => setEditingDay(event.target.value)} required />
                              </label>
                              <label className={styles.field} htmlFor={`edit-time-${task.id}`}>
                                Heure
                                <input id={`edit-time-${task.id}`} type="text" value={editingTime}
                                  onChange={(event) => setEditingTime(event.target.value)} required />
                              </label>
                            </div>
                            <label className={styles.field} htmlFor={`edit-label-${task.id}`}>
                              Tâche
                              <input id={`edit-label-${task.id}`} type="text" value={editingLabel}
                                onChange={(event) => setEditingLabel(event.target.value)} required />
                            </label>
                            <div className={styles.actions}>
                              <button type="submit" className="control-button">Enregistrer</button>
                              <button type="button" className="control-button" onClick={handleCancelEdit}>Annuler</button>
                            </div>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
