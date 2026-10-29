import {
  CHALLENGE_TEMPLATES, challengePeriod, dateKey, startChallenge,
  type ChallengesData, type ChallengeTemplate, type SurpriseOptions, type SurpriseDay, type SurpriseOffer,
} from "./challenges";
import { getChallengeSuggestion } from "./challengeSuggestions";

// Minimum available days; omitted models are not eligible. Paid/unknown-context
// activities are excluded. Neither IDs nor existing challenge criteria change.
export const SURPRISE_MIN_DAYS: Readonly<Record<string, number>> = {
  "meet-3": 1, "meet-5": 1, "meet-10": 1, "follow-up-5": 1, "discovery-2": 1,
  "video-minute": 1, "say-no": 1, "ask-help": 1, "share-idea": 1, "bold-proposal": 1,
  "group-speech": 1, "feedback": 1, "listen-3": 1, "lead-meeting": 1, "difficult-talk": 1, "thank-3": 1,
  "project-step": 1, "client-interviews": 1, "offer": 1, "prototype": 1, "pitch": 1, "launch": 1,
  "delayed-task": 1, "focus-25": 1, "focus-4": 1, "clear-desk": 1, "plan-5": 5, "deep-work": 3,
  "journal": 1, "values": 1, "learn-3": 1, "belief": 1, "seek-perspectives": 1, "personal-experiment": 7,
};

export function surpriseLevel(data: ChallengesData, today: string, options: SurpriseOptions) {
  const sameDuration = { ...data, attempts: data.attempts.filter((a) => (a.slot === "week") === (options.slot === "week")) };
  const suggestion = getChallengeSuggestion(sameDuration, today);
  // 91B provides the relevant reference, but a proposal to advance is not a
  // user-selected level. Keep the actual latest level as the base.
  return { baseLevel: suggestion.kind === "insufficient" ? 1 : suggestion.reference!.difficulty,
    personalized: suggestion.kind !== "insufficient" };
}

function randomIndex(length: number, random: () => number) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error("Source aléatoire invalide.");
  return Math.floor(value * length);
}

export function selectSurprise(data: ChallengesData, today: string, day: Omit<SurpriseDay, "offers"> & { offers?: SurpriseOffer[] }, random = Math.random) {
  const endDate = challengePeriod(day.slot, today).endDate;
  // Calendar-day arithmetic avoids DST-dependent day lengths.
  const remaining = Math.round((Date.parse(`${endDate}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000) + 1;
  const drawnToday = Object.values(data.surpriseDays?.[today]?.offers ?? day.offers ?? []).map((o) => o.template.id);
  const triedToday = data.attempts.filter((a) => a.date === today).map((a) => a.id);
  const excluded = new Set([...drawnToday, ...triedToday]);
  const cutoff = new Date(`${today}T12:00:00`); cutoff.setDate(cutoff.getDate() - 7);
  const recent = new Set(data.attempts.filter((a) => a.date >= dateKey(cutoff) && a.date < today).map((a) => a.id));
  const library = [...CHALLENGE_TEMPLATES, ...(day.includeCustom ? data.customTemplates.filter((t) => t.surpriseMinDays !== undefined && !CHALLENGE_TEMPLATES.some((p) => p.id === t.id)) : [])];
  const candidates = library.filter((t) => {
    const minDays = t.id.startsWith("custom-") ? t.surpriseMinDays : SURPRISE_MIN_DAYS[t.id];
    return minDays !== undefined && minDays <= remaining && !excluded.has(t.id) &&
      t.difficulty >= day.baseLevel && t.difficulty <= Math.min(4, day.baseLevel + 1);
  });
  const fresh = candidates.filter((t) => !recent.has(t.id));
  const notes: string[] = [];
  const pool = fresh.length >= 2 ? fresh : candidates;
  if (pool.some((t) => recent.has(t.id))) notes.push("Peu d’alternatives : des modèles tentés ces 7 derniers jours restent éligibles.");
  const base = pool.filter((t) => t.difficulty === day.baseLevel);
  const higher = pool.filter((t) => t.difficulty === day.baseLevel + 1);
  if (!base.length && !higher.length) throw new Error("Aucun défi éligible sans répétition aujourd’hui. Reviens demain ou choisis librement dans la bibliothèque.");
  let group: ChallengeTemplate[];
  if (base.length && higher.length) {
    group = randomIndex(100, random) < (day.mode === "bold" ? 35 : 20) ? higher : base;
  } else {
    group = base.length ? base : higher;
    if (day.baseLevel < 4) notes.push(base.length
      ? "Aucun candidat au niveau supérieur : tirage au niveau adapté uniquement."
      : "Aucun candidat au niveau adapté : seul le niveau immédiatement supérieur est disponible.");
  }
  return { template: { ...group[randomIndex(group.length, random)] }, notes };
}

export function drawSurprise(data: ChallengesData, today: string, options: SurpriseOptions, reason: SurpriseOffer["reason"], random = Math.random): ChallengesData {
  const previous = data.surpriseDays?.[today];
  const last = previous?.offers.at(-1);
  if (reason === "initial" && previous) throw new Error("Le tirage du jour existe déjà.");
  if (reason !== "initial" && (!previous || last?.status === "accepted")) throw new Error("Ce tirage ne peut plus être remplacé.");
  if (previous?.offers.some((o) => o.reason === reason)) throw new Error(reason === "joker" ? "Le joker du jour a déjà été utilisé." : "L’alternative exceptionnelle a déjà été utilisée.");
  if (reason === "alternative" && last?.status !== "refused") throw new Error("L’alternative est réservée à un défi refusé car inadapté.");
  const day = previous ?? { ...options, ...surpriseLevel(data, today, options), offers: [] };
  const { template, notes } = selectSurprise(data, today, day, random);
  const offers: SurpriseOffer[] = [
    ...day.offers.map((o, i) => i === day.offers.length - 1 && o.status === "offered" ? { ...o, status: "replaced" as const } : o),
    { template, reason, status: "offered", notes },
  ];
  return { ...data, surpriseDays: { ...data.surpriseDays, [today]: { ...day, offers } } };
}

export function refuseSurprise(data: ChallengesData, today: string, expectedTemplateId: string): ChallengesData {
  const day = data.surpriseDays?.[today];
  if (!day || day.offers.at(-1)?.status !== "offered") throw new Error("Aucun défi proposé à refuser.");
  if (day.offers.at(-1)?.template.id !== expectedTemplateId) throw new Error("Le tirage a changé dans un autre onglet. Consulte le défi actuel.");
  return { ...data, surpriseDays: { ...data.surpriseDays, [today]: { ...day,
    offers: day.offers.map((o, i) => i === day.offers.length - 1 ? { ...o, status: "refused" } : o) } } };
}

export function acceptSurprise(data: ChallengesData, today: string, instanceId: string, expectedTemplateId: string): ChallengesData {
  const day = data.surpriseDays?.[today];
  const last = day?.offers.at(-1);
  if (!day || !last || last.status !== "offered") throw new Error("Aucun défi proposé à accepter.");
  if (last.template.id !== expectedTemplateId) throw new Error("Le tirage a changé dans un autre onglet. Consulte le défi actuel.");
  const started = startChallenge(data, last.template, day.slot, last.template.target, today, instanceId);
  return { ...started, surpriseDays: { ...started.surpriseDays, [today]: { ...day,
    offers: day.offers.map((o, i) => i === day.offers.length - 1 ? { ...o, status: "accepted" } : o) } } };
}
