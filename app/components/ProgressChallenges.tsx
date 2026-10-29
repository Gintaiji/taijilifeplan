"use client";

import { useEffect, useState } from "react";
import { APP_STORAGE_CHANGED_EVENT, setStorage, STORAGE_KEYS, type AppStorageChangedDetail } from "../utils/storage";
import {
  CHALLENGE_CATEGORIES, CHALLENGE_LEVELS, CHALLENGE_TEMPLATES,
  challengeStatus, dateKey, emptyChallenges, isChallengeQuantity, isChallengesData,
  isCurrentChallenge, startChallenge, updateChallenge,
  type ChallengeAttempt, type ChallengesData, type ChallengeSlot, type ChallengeTemplate,
} from "../utils/challenges";
import styles from "./ProgressChallenges.module.css";

const slotLabels: Record<ChallengeSlot, string> = { main: "Mon défi du jour", bonus: "Bonus facultatif", week: "Mon défi de la semaine" };

function readChallenges(): ChallengesData {
  const raw = localStorage.getItem(STORAGE_KEYS.challenges);
  if (raw === null) return emptyChallenges();
  const parsed: unknown = JSON.parse(raw);
  if (!isChallengesData(parsed)) throw new Error("Les défis enregistrés sont illisibles. Ils ont été conservés. Exporte une sauvegarde avant toute restauration.");
  return parsed;
}
function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR");
}

export default function ProgressChallenges() {
  const [data, setData] = useState<ChallengesData | null>(null);
  const [today, setToday] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [slot, setSlot] = useState<ChallengeSlot>("main");
  const [selected, setSelected] = useState<ChallengeTemplate | null>(null);
  const [target, setTarget] = useState("1");
  const [historyLimit, setHistoryLimit] = useState(10);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      if (!mounted) return;
      setToday(dateKey());
      try { setData(readChallenges()); setError(""); }
      catch { setData(null); setError("Les défis n’ont pas pu être lus. Les données ont été conservées. Vérifie ta sauvegarde avant de restaurer."); }
    };
    const onAppChange = (event: Event) => {
      if ((event as CustomEvent<AppStorageChangedDetail>).detail?.key === STORAGE_KEYS.challenges) load();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.challenges || event.key === null) load();
    };
    queueMicrotask(load);
    window.addEventListener(APP_STORAGE_CHANGED_EVENT, onAppChange);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", load);
    const timer = window.setInterval(() => setToday(dateKey()), 30000);
    return () => {
      mounted = false;
      window.removeEventListener(APP_STORAGE_CHANGED_EVENT, onAppChange);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", load);
      window.clearInterval(timer);
    };
  }, []);

  // Write only in response to an action, using the latest stored snapshot.
  // A late cloud restore or another tab must never be overwritten by a mount effect.
  function commit(change: (current: ChallengesData) => ChallengesData): boolean {
    try {
      const next = change(readChallenges());
      if (!isChallengesData(next)) throw new Error("Données de défi invalides.");
      setStorage(STORAGE_KEYS.challenges, next);
      setData(next);
      setError("");
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible. Réessaie avant de quitter la page.");
      return false;
    }
  }
  function choose(template: ChallengeTemplate) {
    setSelected(template); setTarget(String(template.target)); setMessage("");
  }
  function activate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const quantity = Number(target);
    if (!isChallengeQuantity(quantity)) { setError("Choisis une cible entière entre 1 et 1 000 000."); return; }
    if (commit((current) => startChallenge(current, selected, slot, quantity, dateKey(), crypto.randomUUID()))) {
      setSelected(null); setMessage("Défi choisi. Tu peux commencer à ton rythme.");
    }
  }
  function createCustom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const text = (key: string) => String(fields.get(key) ?? "").trim();
    const template: ChallengeTemplate = {
      id: `custom-${crypto.randomUUID()}`, title: text("title"), description: text("description"),
      category: text("category"), difficulty: Number(fields.get("difficulty")),
      target: Number(fields.get("target")), unit: text("unit"), successCriterion: text("criterion"),
    };
    if (commit((current) => ({ ...current, customTemplates: [...current.customTemplates, template] }))) {
      choose(template); form.reset(); setMessage("Modèle personnalisé créé. Choisis sa place puis démarre le défi.");
    }
  }

  const templates = [...CHALLENGE_TEMPLATES, ...(data?.customTemplates ?? [])].filter(
    (t) => (!category || t.category === category) && (!level || t.difficulty === Number(level)),
  );
  const attempts = [...(data?.attempts ?? [])].reverse();

  return (
    <section className={styles.section} aria-label="Défis de progression" aria-busy={!data && !error}>
      <div className={styles.heading}><h2>Défis de progression</h2><span>Un pas hors de ta zone de confort</span></div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <p role="status" className={styles.muted}>{message}</p>
      {!data ? <p className={styles.muted}>{error ? "Les défis sont temporairement indisponibles." : "Chargement des défis…"}</p> : <>
        {(["main", "bonus", "week"] as ChallengeSlot[]).map((key) => {
          const attempt = data.attempts.find((a) => a.slot === key && isCurrentChallenge(a, today));
          if (key === "bonus" && !attempt) return null;
          return <article key={key} className={styles.card}>
            <h3>{slotLabels[key]}</h3>
            {attempt ? <AttemptCard key={attempt.instanceId} attempt={attempt} today={today}
              onChange={(patch) => commit((current) => updateChallenge(current, attempt.instanceId, patch))}
              onStep={(delta) => commit((current) => {
                const latest = current.attempts.find((a) => a.instanceId === attempt.instanceId);
                if (!latest) throw new Error("Ce défi a changé. Recharge la page.");
                return updateChallenge(current, latest.instanceId, { progress: Math.min(1000000, Math.max(0, latest.progress + delta)) });
              })} /> : <p className={styles.muted}>{key === "week" ? "Choisis un défi plus ambitieux, à réaliser d’ici dimanche." : "Choisis un défi dans la bibliothèque ci-dessous."}</p>}
          </article>;
        })}

        <details className={styles.disclosure}>
          <summary>Choisir un défi · bibliothèque ({CHALLENGE_TEMPLATES.length + data.customTemplates.length})</summary>
          <div className={styles.body}>
            <p className={styles.muted}>Tu choisis librement ton niveau. Aucun changement automatique.</p>
            <div className={styles.filters}>
              <label>Catégorie<select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Toutes les catégories</option>{CHALLENGE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select></label>
              <label>Niveau<select value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="">Tous les niveaux</option>{CHALLENGE_LEVELS.map((l, i) => <option key={l} value={i + 1}>{i + 1} · {l}</option>)}
              </select></label>
            </div>
            <ul className={styles.library}>{templates.map((t) => <li key={t.id}>
              <button type="button" aria-pressed={selected?.id === t.id} onClick={() => choose(t)}>
                <strong>{t.title}</strong><span>{CHALLENGE_LEVELS[t.difficulty - 1]} · {t.target} {t.unit}</span>
              </button>
            </li>)}</ul>
            {templates.length === 0 && <p>Aucun défi pour ces filtres.</p>}
            <details className={styles.custom}>
              <summary>Créer un défi personnalisé</summary>
              <form onSubmit={createCustom} className={styles.form}>
                <label>Titre<input name="title" required maxLength={140} /></label>
                <label>Description courte<input name="description" required maxLength={300} /></label>
                <label>Catégorie<select name="category">{CHALLENGE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
                <label>Niveau<select name="difficulty">{CHALLENGE_LEVELS.map((l, i) => <option key={l} value={i + 1}>{l}</option>)}</select></label>
                <div className={styles.filters}>
                  <label>Quantité cible<input name="target" type="number" min={1} max={1000000} step={1} defaultValue={1} required /></label>
                  <label>Unité<input name="unit" placeholder="ex. échanges" required maxLength={60} /></label>
                </div>
                <label>Critère de réussite concret<textarea name="criterion" rows={2} required maxLength={500} /></label>
                <button type="submit">Créer le modèle</button>
              </form>
            </details>
          </div>
        </details>

        {selected && <form onSubmit={activate} className={styles.card}>
          <h3>{selected.title}</h3><p>{selected.description}</p>
          <p className={styles.muted}>Réussite : {selected.successCriterion}</p>
          <div className={styles.filters}>
            <label>Place du défi<select value={slot} onChange={(e) => setSlot(e.target.value as ChallengeSlot)}>
              {Object.entries(slotLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select></label>
            <label>Cible · {selected.unit}<input type="number" required min={1} max={1000000} step={1} value={target} onChange={(e) => setTarget(e.target.value)} /></label>
          </div>
          {data.attempts.some((a) => a.slot === slot && isCurrentChallenge(a, today)) && <p className={styles.muted}>Le défi actuel sera conservé dans l’historique.</p>}
          <div className={styles.actions}><button type="submit">Commencer ce défi</button><button type="button" onClick={() => setSelected(null)}>Annuler</button></div>
        </form>}

        <details className={styles.disclosure}>
          <summary>Revoir mes progrès · {attempts.length} défi{attempts.length > 1 ? "s" : ""} tenté{attempts.length > 1 ? "s" : ""}</summary>
          <div className={styles.body}>
            {attempts.length === 0 && <p className={styles.muted}>Tes défis apparaîtront ici dès que tu en choisis un.</p>}
            {attempts.slice(0, historyLimit).map((a) => <article className={styles.history} key={a.instanceId}>
              <strong>{a.title}</strong>
              <p>{formatDate(a.date)}{a.slot === "week" ? ` au ${formatDate(a.endDate)}` : ""} · {slotLabels[a.slot]}</p>
              <p>{a.progress} / {a.target} {a.unit} · <span className={a.progress >= a.target ? styles.success : ""}>{challengeStatus(a, today)}</span></p>
              {a.note && <p className={styles.note}>{a.note}</p>}
              <details><summary>{a.note ? "Modifier ma réflexion" : "Ajouter une réflexion"}</summary>
                <label>Qu’est-ce que ce défi m’a appris ?<textarea rows={3} maxLength={5000} value={a.note}
                  onChange={(e) => commit((current) => updateChallenge(current, a.instanceId, { note: e.target.value }))} /></label>
              </details>
            </article>)}
            {historyLimit < attempts.length && <button type="button" onClick={() => setHistoryLimit((n) => n + 10)}>Voir les défis précédents</button>}
          </div>
        </details>
      </>}
    </section>
  );
}

function AttemptCard({ attempt: a, today, onChange, onStep }: {
  attempt: ChallengeAttempt; today: string;
  onChange: (patch: Partial<Pick<ChallengeAttempt, "target" | "progress" | "note" | "closed">>) => boolean;
  onStep: (delta: number) => boolean;
}) {
  return <div className={styles.attempt}>
    <strong>{a.title}</strong>
    <p className={styles.muted}>{a.successCriterion}</p>
    {a.slot === "week" && <p className={styles.muted}>Jusqu’au {formatDate(a.endDate)}</p>}
    <div className={styles.counter}>
      <button type="button" aria-label={`Diminuer la progression : ${a.title}`} disabled={a.progress === 0} onClick={() => onStep(-1)}>−</button>
      <output aria-live="polite">{a.progress} / {a.target} <span>{a.unit}</span></output>
      <button type="button" aria-label={`Augmenter la progression : ${a.title}`} disabled={a.progress >= 1000000} onClick={() => onStep(1)}>+</button>
    </div>
    <progress aria-label={`Progression : ${a.title}`} max={a.target} value={Math.min(a.progress, a.target)} />
    <span role="status" className={a.progress >= a.target ? styles.success : styles.muted}>{challengeStatus(a, today)}</span>
    <details>
      <summary>Ajuster la cible et réfléchir</summary>
      <form key={a.target} className={styles.form} onSubmit={(e) => {
        e.preventDefault();
        onChange({ target: Number(new FormData(e.currentTarget).get("target")) });
      }}>
        <label>Cible · {a.unit}<input name="target" type="number" min={1} max={1000000} step={1} required defaultValue={a.target} /></label>
        <button type="submit">Modifier la cible</button>
      </form>
      <label className={styles.reflection}>Qu’est-ce que ce défi m’a appris ?
        <textarea rows={3} value={a.note} placeholder="Facultatif" maxLength={5000} onChange={(e) => onChange({ note: e.target.value })} />
      </label>
      <button type="button" onClick={() => onChange({ closed: true })}>Archiver ce défi</button>
    </details>
  </div>;
}
