"use client";

import { useEffect, useRef, useState } from "react";
import { CHALLENGE_LEVELS, dateKey, isCurrentChallenge, type ChallengesData, type SurpriseOptions, type SurpriseOffer } from "../utils/challenges";
import { acceptSurprise, drawSurprise, refuseSurprise, surpriseLevel } from "../utils/surpriseChallenges";
import styles from "./ProgressChallenges.module.css";

export default function SurpriseChallenge({ data, today, commit }: {
  data: ChallengesData; today: string;
  commit: (change: (current: ChallengesData) => ChallengesData) => boolean;
}) {
  const [options, setOptions] = useState<SurpriseOptions>({ slot: "main", mode: "balanced", includeCustom: false });
  const [revealing, setRevealing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const day = data.surpriseDays?.[today];
  const config = day ?? options;
  const level = day ?? surpriseLevel(data, today, options);
  const offer = day?.offers.at(-1);
  const jokerUsed = day?.offers.some((o) => o.reason === "joker");
  const alternativeUsed = day?.offers.some((o) => o.reason === "alternative");
  const replacement = data.attempts.some((a) => a.slot === config.slot && isCurrentChallenge(a, today));

  function draw(reason: SurpriseOffer["reason"]) {
    if (revealing) return;
    if (commit((current) => drawSurprise(current, dateKey(), options, reason))) {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setRevealing(true);
        timer.current = setTimeout(() => setRevealing(false), 300);
      }
    }
  }
  function confirmCustom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const id = String(fields.get("template"));
    const minDays = Number(fields.get("minDays"));
    if (commit((current) => {
      if (!Number.isInteger(minDays) || minDays < 1 || minDays > 7 || !current.customTemplates.some((t) => t.id === id)) throw new Error("Vérifie le modèle et sa durée minimale.");
      return { ...current, customTemplates: current.customTemplates.map((t) => t.id === id ? { ...t, surpriseMinDays: minDays } : t) };
    })) event.currentTarget.reset();
  }

  return <div className={styles.surprise} role="group" aria-label="Défi Surprise">
    <div className={styles.heading}><strong>Défi Surprise</strong>
      {!day && <button type="button" onClick={() => draw("initial")} disabled={revealing}>Surprends-moi</button>}
    </div>
    <details>
      <summary>Options du tirage</summary>
      <fieldset disabled={!!day || revealing} className={styles.surpriseOptions}>
        <div className={styles.filters}>
          <label>Emplacement<select value={config.slot} onChange={(e) => setOptions({ ...options, slot: e.target.value as SurpriseOptions["slot"] })}>
            <option value="main">Principal · aujourd’hui</option><option value="bonus">Bonus · aujourd’hui</option><option value="week">Hebdomadaire · jusqu’à dimanche</option>
          </select></label>
          <label>Mode<select value={config.mode} onChange={(e) => setOptions({ ...options, mode: e.target.value as SurpriseOptions["mode"] })}>
            <option value="balanced">Équilibré</option><option value="bold">Ose davantage</option>
          </select></label>
        </div>
        <label className={styles.check}><input type="checkbox" checked={config.includeCustom} onChange={(e) => setOptions({ ...options, includeCustom: e.target.checked })} />Inclure mes défis personnalisés vérifiés</label>
        {!day && options.includeCustom && <details>
          <summary>Vérifier un modèle personnalisé</summary>
          {data.customTemplates.length ? <form className={styles.form} onSubmit={confirmCustom}>
            <label>Modèle<select name="template">{data.customTemplates.map((t) => <option key={t.id} value={t.id}>{t.title}{t.surpriseMinDays ? " · vérifié" : ""}</option>)}</select></label>
            <label>Nombre minimum de jours nécessaires<select name="minDays">{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
            <label className={styles.check}><input type="checkbox" required />Je confirme : sans dépense obligatoire, sans danger et dans le respect d’un refus.</label>
            <button type="submit">Confirmer la faisabilité</button>
          </form> : <p className={styles.muted}>Crée d’abord un modèle dans la bibliothèque.</p>}
        </details>}
      </fieldset>
      <p className={styles.muted}>{day ? "Les options restent fixées pour le tirage du jour." : "Les modèles personnalisés non vérifiés sont exclus, même si l’option est activée."}</p>
      <p className={styles.muted}>Équilibré : 20 % au niveau supérieur ; Ose davantage : 35 %, si les deux niveaux disposent de candidats.</p>
    </details>
    <p className={styles.muted}>{level.personalized ? "Repère issu de ton historique comparable" : "Historique insuffisant : repère prudent, sans recommandation personnalisée"} · {CHALLENGE_LEVELS[level.baseLevel - 1]}.</p>
    <p className={styles.muted}>Un joker et une alternative après refus par jour, tous emplacements confondus. Respecte toujours un refus ; aucune dépense n’est nécessaire.</p>
    {revealing ? <p role="status" className={styles.mystery}>Un petit pas à découvrir…</p> : offer && <div className={styles.reveal}>
      <strong>{offer.template.title}</strong>
      <p>{offer.template.description}</p>
      <p className={styles.muted}>{CHALLENGE_LEVELS[offer.template.difficulty - 1]} · {offer.template.target} {offer.template.unit} · {config.slot === "week" ? "Cette semaine" : "Aujourd’hui"}</p>
      <p className={styles.muted}>Réussite : {offer.template.successCriterion}</p>
      {offer.notes.map((note) => <p key={note} className={styles.muted}>{note}</p>)}
      {offer.status === "offered" && <>
        {replacement && <p className={styles.muted}>Accepter archivera le défi actif de cet emplacement en conservant son historique.</p>}
        <div className={styles.actions}>
          <button type="button" onClick={() => commit((current) => acceptSurprise(current, dateKey(), crypto.randomUUID(), offer.template.id))}>J’accepte ce défi</button>
          <button type="button" onClick={() => commit((current) => refuseSurprise(current, dateKey(), offer.template.id))}>Refuser : impossible ou inadapté</button>
        </div>
      </>}
      {offer.status === "refused" && <p className={styles.muted}>Défi refusé, sans pénalité. Ce n’est pas un échec.</p>}
      {offer.status === "accepted" ? <p className={styles.muted}>Défi accepté. Retrouve ses compteurs dans l’emplacement choisi.</p> : <div className={styles.actions}>
        <button type="button" disabled={jokerUsed} onClick={() => draw("joker")}>{jokerUsed ? "Joker du jour utilisé" : "Utiliser mon joker · nouveau tirage"}</button>
        {offer.status === "refused" && !alternativeUsed && <button type="button" onClick={() => draw("alternative")}>Chercher une alternative exceptionnelle</button>}
      </div>}
    </div>}
  </div>;
}
