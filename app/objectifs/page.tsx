"use client";

import { useEffect, useState } from "react";
import { getStorage, setStorage, STORAGE_KEYS } from "../utils/storage";

import styles from "./page.module.css";

const STORAGE_KEY = STORAGE_KEYS.goals;

const periods = ["Hebdomadaire", "Mensuel", "Annuel"] as const;

type GoalPeriod = (typeof periods)[number];

type Goal = {
  id: number;
  title: string;
  period: GoalPeriod;
  completed: boolean;
  subGoals: SubGoal[];
};

type SubGoal = {
  id: number;
  title: string;
  completed: boolean;
};

function normalizeSubGoals(savedSubGoals: unknown): SubGoal[] {
  if (!Array.isArray(savedSubGoals)) {
    return [];
  }

  return savedSubGoals.flatMap((subGoal) => {
    if (
      typeof subGoal !== "object" ||
      subGoal === null ||
      !("id" in subGoal) ||
      !("title" in subGoal)
    ) {
      return [];
    }

    if (typeof subGoal.id !== "number" || typeof subGoal.title !== "string") {
      return [];
    }

    return [
      {
        id: subGoal.id,
        title: subGoal.title,
        completed:
          "completed" in subGoal && typeof subGoal.completed === "boolean"
            ? subGoal.completed
            : false,
      },
    ];
  });
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
        subGoals:
          "subGoals" in goal ? normalizeSubGoals(goal.subGoals) : [],
      },
    ];
  });
}

function getInitialGoals(): Goal[] {
  if (typeof window === "undefined") {
    return [];
  }

  const savedGoals = getStorage<unknown>(STORAGE_KEY, []);
  return normalizeGoals(savedGoals);
}

export default function ObjectifsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState<GoalPeriod>("Hebdomadaire");
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPeriod, setEditPeriod] = useState<GoalPeriod>("Hebdomadaire");
  const [newSubGoalTitles, setNewSubGoalTitles] = useState<
    Record<number, string>
  >({});

  useEffect(() => {
    let shouldUpdateState = true;

    queueMicrotask(() => {
      if (!shouldUpdateState) {
        return;
      }

      setGoals(getInitialGoals());
      setIsStorageLoaded(true);
    });

    return () => {
      shouldUpdateState = false;
    };
  }, []);

  useEffect(() => {
    if (!isStorageLoaded) {
      return;
    }

    setStorage(STORAGE_KEY, goals);
  }, [goals, isStorageLoaded]);

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
      subGoals: [],
    };

    setGoals((currentGoals) => [...currentGoals, newGoal]);
    setIsAdding(false);
    setTitle("");
    setPeriod("Hebdomadaire");
  }

  function handleDelete(goalId: number) {
    const confirmed = window.confirm("Supprimer cet objectif ?");

    if (!confirmed) {
      return;
    }

    setGoals((currentGoals) =>
      currentGoals.filter((goal) => goal.id !== goalId),
    );

    if (editingGoalId === goalId) {
      handleCancelEdit();
    }
  }

  function handleToggleCompleted(goalId: number) {
    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === goalId ? { ...goal, completed: !goal.completed } : goal,
      ),
    );
  }

  function handleStartEdit(goal: Goal) {
    setEditingGoalId(goal.id);
    setEditTitle(goal.title);
    setEditPeriod(goal.period);
  }

  function handleCancelEdit() {
    setEditingGoalId(null);
    setEditTitle("");
    setEditPeriod("Hebdomadaire");
  }

  function handleSaveEdit(goalId: number) {
    const cleanTitle = editTitle.trim();

    if (cleanTitle === "") {
      return;
    }

    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              title: cleanTitle,
              period: editPeriod,
            }
          : goal,
      ),
    );
    handleCancelEdit();
  }

  function handleSubGoalTitleChange(goalId: number, value: string) {
    setNewSubGoalTitles((currentTitles) => ({
      ...currentTitles,
      [goalId]: value,
    }));
  }

  function handleAddSubGoal(
    event: React.FormEvent<HTMLFormElement>,
    goalId: number,
  ) {
    event.preventDefault();

    const cleanTitle = (newSubGoalTitles[goalId] ?? "").trim();

    if (cleanTitle === "") {
      return;
    }

    const newSubGoal: SubGoal = {
      id: Date.now(),
      title: cleanTitle,
      completed: false,
    };

    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === goalId
          ? { ...goal, subGoals: [...goal.subGoals, newSubGoal] }
          : goal,
      ),
    );

    setNewSubGoalTitles((currentTitles) => ({
      ...currentTitles,
      [goalId]: "",
    }));
  }

  function handleToggleSubGoal(goalId: number, subGoalId: number) {
    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              subGoals: goal.subGoals.map((subGoal) =>
                subGoal.id === subGoalId
                  ? { ...subGoal, completed: !subGoal.completed }
                  : subGoal,
              ),
            }
          : goal,
      ),
    );
  }

  function handleDeleteSubGoal(goalId: number, subGoalId: number) {
    const confirmed = window.confirm("Supprimer ce sous-objectif ?");

    if (!confirmed) {
      return;
    }

    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              subGoals: goal.subGoals.filter(
                (subGoal) => subGoal.id !== subGoalId,
              ),
            }
          : goal,
      ),
    );
  }

  return (
    <main className={styles.page} aria-busy={!isStorageLoaded}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1>Objectifs</h1>
            <p className={styles.intro}>Avance à ton rythme, une étape à la fois.</p>
          </div>
          <button type="button" className="control-button" disabled={!isStorageLoaded}
            aria-expanded={isAdding} aria-controls="new-goal-form"
            onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? "Fermer le formulaire" : "Ajouter un objectif"}
          </button>
        </header>

        {isAdding && (
          <form id="new-goal-form" className={styles.form} onSubmit={handleSubmit}>
            <h2>Nouvel objectif</h2>
            <div className={styles.fields}>
              <label className={styles.field} htmlFor="goal-title">
                Objectif
                <input id="goal-title" type="text" value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Exemple : Lire 2 livres" required />
              </label>
              <label className={styles.field} htmlFor="goal-period">
                Période
                <select id="goal-period" value={period}
                  onChange={(event) => setPeriod(event.target.value as GoalPeriod)}>
                  {periods.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <div className={styles.actions}>
              <button type="submit" className="control-button">Ajouter</button>
            </div>
          </form>
        )}

        {!isStorageLoaded ? (
          <p className={styles.empty} role="status">Chargement des objectifs…</p>
        ) : goals.length === 0 ? (
          <p className={styles.empty}>Aucun objectif pour l&apos;instant. Choisis un premier pas qui compte pour toi.</p>
        ) : periods.map((currentPeriod) => {
          const goalsByPeriod = goals.filter((goal) => goal.period === currentPeriod);
          if (goalsByPeriod.length === 0) return null;

          return (
            <section key={currentPeriod} className={styles.period} aria-label={currentPeriod}>
              <h2 className={styles.periodTitle}>{currentPeriod}</h2>
              <ul className={styles.list}>
                {goalsByPeriod.map((goal) => {
                  const totalSubGoals = goal.subGoals.length;
                  const completedSubGoals = goal.subGoals.filter((subGoal) => subGoal.completed).length;
                  const progressPercent = totalSubGoals === 0
                    ? 0 : Math.round((completedSubGoals / totalSubGoals) * 100);

                  return (
                    <li key={goal.id} className={`${styles.card} ${goal.completed ? styles.completed : ""}`}>
                      <div className={styles.cardHeader}>
                        <h3 className={styles.goalTitle}>{goal.title}</h3>
                        <div className={styles.badges}>
                          <span className={styles.badge}>{goal.period}</span>
                          {goal.completed && <span className={styles.badge}>Objectif terminé</span>}
                        </div>
                      </div>
                      <div className={styles.progressText}>
                        <span>{completedSubGoals} / {totalSubGoals} étapes réalisées</span>
                        <span>{progressPercent} %</span>
                      </div>
                      <progress className={styles.progress} max={100} value={progressPercent}
                        aria-label={`Progression des étapes : ${goal.title}`} />

                      <details className={styles.details}>
                        <summary>Voir les étapes <span aria-hidden="true">({totalSubGoals})</span></summary>
                        <div className={styles.detailsBody}>
                          {totalSubGoals === 0 ? (
                            <p className={styles.muted}>Ajoute une étape pour avancer vers cet objectif.</p>
                          ) : (
                            <ul className={styles.steps}>
                              {goal.subGoals.map((subGoal) => (
                                <li key={subGoal.id} className={`${styles.step} ${subGoal.completed ? styles.stepCompleted : ""}`}>
                                  <label className={styles.stepLabel}>
                                    <input type="checkbox" checked={subGoal.completed}
                                      onChange={() => handleToggleSubGoal(goal.id, subGoal.id)} />
                                    <span>{subGoal.title}</span>
                                  </label>
                                  <button type="button" className="control-button control-button-danger"
                                    aria-label={`Supprimer l'étape : ${subGoal.title}`}
                                    onClick={() => handleDeleteSubGoal(goal.id, subGoal.id)}>Supprimer</button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <form className={styles.stepForm} onSubmit={(event) => handleAddSubGoal(event, goal.id)}>
                            <label className={styles.field} htmlFor={`step-${goal.id}`}>
                              Nouvelle étape
                              <input id={`step-${goal.id}`} type="text" value={newSubGoalTitles[goal.id] ?? ""}
                                onChange={(event) => handleSubGoalTitleChange(goal.id, event.target.value)}
                                placeholder="Un petit pas concret" required />
                            </label>
                            <button type="submit" className="control-button">Ajouter une étape</button>
                          </form>
                        </div>
                      </details>

                      <details className={`${styles.details} ${styles.manage}`}>
                        <summary>Gérer<span className={styles.srOnly}> : {goal.title}</span></summary>
                        <div className={styles.detailsBody}>
                          {editingGoalId === goal.id ? (
                            <form className={styles.editForm} onSubmit={(event) => {
                              event.preventDefault();
                              handleSaveEdit(goal.id);
                            }}>
                              <div className={styles.fields}>
                                <label className={styles.field} htmlFor={`edit-title-${goal.id}`}>
                                  Objectif
                                  <input id={`edit-title-${goal.id}`} type="text" value={editTitle}
                                    onChange={(event) => setEditTitle(event.target.value)} required />
                                </label>
                                <label className={styles.field} htmlFor={`edit-period-${goal.id}`}>
                                  Période
                                  <select id={`edit-period-${goal.id}`} value={editPeriod}
                                    onChange={(event) => setEditPeriod(event.target.value as GoalPeriod)}>
                                    {periods.map((item) => <option key={item} value={item}>{item}</option>)}
                                  </select>
                                </label>
                              </div>
                              <div className={styles.actions}>
                                <button type="submit" className="control-button">Enregistrer</button>
                                <button type="button" className="control-button" onClick={handleCancelEdit}>Annuler</button>
                              </div>
                            </form>
                          ) : (
                            <div className={styles.actions}>
                              <button type="button" className="control-button" onClick={() => handleStartEdit(goal)}>Modifier</button>
                              <button type="button" className="control-button" onClick={() => handleToggleCompleted(goal.id)}>
                                {goal.completed ? "Réouvrir" : "Terminer"}
                              </button>
                              <button type="button" className="control-button control-button-danger"
                                onClick={() => handleDelete(goal.id)}>Supprimer</button>
                            </div>
                          )}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
