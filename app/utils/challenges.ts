export const CHALLENGE_LEVELS = ["Élan", "Progression", "Audace", "Dépassement"] as const;
export const CHALLENGE_CATEGORIES = [
  "Prospection et nouvelles rencontres", "Audace et confiance en soi",
  "Communication et leadership", "Business et projets",
  "Discipline et productivité", "Développement personnel",
] as const;

export type ChallengeTemplate = {
  id: string; title: string; description: string; category: string;
  difficulty: number; target: number; unit: string; successCriterion: string;
  // Present only after explicit feasibility confirmation for a custom template.
  surpriseMinDays?: number;
};
export type ChallengeSlot = "main" | "bonus" | "week";
export const CHALLENGE_RESULT_LABELS = {
  conversations: "Conversations engagées",
  appointmentsProposed: "Rendez-vous proposés",
  appointmentsObtained: "Rendez-vous obtenus",
} as const;
export type ChallengeResultKey = keyof typeof CHALLENGE_RESULT_LABELS;
export type ChallengeResults = Record<ChallengeResultKey, number>;
export type ChallengeAttempt = ChallengeTemplate & {
  instanceId: string; slot: ChallengeSlot; date: string; endDate: string;
  progress: number; note: string; closed: boolean;
  results?: ChallengeResults;
};
export type ChallengesData = {
  version: 1; customTemplates: ChallengeTemplate[]; attempts: ChallengeAttempt[];
  surpriseDays?: Record<string, SurpriseDay>;
};
export type SurpriseOptions = { slot: ChallengeSlot; mode: "balanced" | "bold"; includeCustom: boolean };
export type SurpriseOffer = {
  template: ChallengeTemplate; reason: "initial" | "joker" | "alternative";
  status: "offered" | "replaced" | "refused" | "accepted"; notes: string[];
};
export type SurpriseDay = SurpriseOptions & { baseLevel: number; personalized: boolean; offers: SurpriseOffer[] };

// IDs are explicit and remain stable when wording or ordering changes.
const groups: [string, string, number, number, string, string, string][][] = [
  [
    ["meet-3", "Aborder 3 nouvelles personnes", 1, 3, "personnes", "Oser un premier échange.", "Avoir un échange réciproque avec chaque personne."],
    ["meet-5", "Aborder 5 nouvelles personnes", 2, 5, "personnes", "Élargir son cercle.", "Avoir un échange réciproque avec chaque personne."],
    ["meet-10", "Aborder 10 nouvelles personnes", 4, 10, "personnes", "Multiplier les occasions de rencontre.", "Avoir un échange réciproque avec chaque personne."],
    ["follow-up-5", "Faire 5 relances personnalisées", 2, 5, "relances", "Reprendre contact avec attention.", "Envoyer une relance adaptée à chaque destinataire."],
    ["discovery-2", "Proposer 2 rendez-vous découverte", 3, 2, "propositions", "Créer des occasions de dialogue.", "Envoyer deux invitations avec un créneau proposé."],
    ["network-event", "Participer à une rencontre", 2, 1, "rencontre", "Découvrir un nouveau cercle.", "Participer à une rencontre et échanger avec une personne."],
  ],
  [
    ["video-minute", "Enregistrer une vidéo d’une minute", 1, 1, "vidéo", "S’habituer à être visible.", "Enregistrer et regarder une vidéo d’au moins une minute."],
    ["say-no", "Poser une limite avec calme", 2, 1, "limite", "Respecter ses besoins.", "Exprimer clairement une limite dans une situation réelle."],
    ["ask-help", "Demander de l’aide", 1, 1, "demande", "Oser exprimer un besoin.", "Adresser une demande précise à une personne."],
    ["share-idea", "Partager une idée en public", 3, 1, "partage", "Rendre une idée visible.", "Publier ou présenter une idée à plusieurs personnes."],
    ["bold-proposal", "Faire une proposition ambitieuse", 4, 1, "proposition", "Oser une opportunité inhabituelle.", "Envoyer une proposition concrète à son destinataire."],
    ["new-activity", "Essayer une activité nouvelle", 2, 1, "activité", "Explorer hors de ses habitudes.", "Participer à une première séance ou expérience."],
  ],
  [
    ["group-speech", "Prendre la parole devant un groupe", 3, 1, "intervention", "Exprimer son point de vue.", "Faire une intervention de deux minutes devant au moins trois personnes."],
    ["feedback", "Demander un retour constructif", 1, 1, "retour demandé", "Mieux comprendre son impact.", "Demander un point fort et un axe d’amélioration précis."],
    ["listen-3", "Pratiquer l’écoute active", 2, 3, "échanges", "Laisser de la place à l’autre.", "Reformuler les propos de trois interlocuteurs et vérifier sa compréhension."],
    ["lead-meeting", "Animer une réunion", 3, 1, "réunion", "Donner une direction commune.", "Animer une réunion avec un ordre du jour et une décision écrite."],
    ["difficult-talk", "Engager une conversation difficile", 4, 1, "conversation", "Clarifier une tension avec respect.", "Exprimer un fait, son besoin et une demande à la personne concernée."],
    ["thank-3", "Exprimer une reconnaissance précise", 1, 3, "messages", "Reconnaître les contributions.", "Remercier trois personnes en citant un fait concret."],
  ],
  [
    ["project-step", "Livrer une étape de projet", 2, 1, "livrable", "Transformer une intention en résultat.", "Terminer et partager un livrable défini avant de commencer."],
    ["client-interviews", "Interroger 3 clients potentiels", 3, 3, "entretiens", "Comprendre les besoins réels.", "Mener trois entretiens et noter un besoin par entretien."],
    ["offer", "Rédiger une offre claire", 1, 1, "offre", "Clarifier sa proposition.", "Écrire le public visé, le bénéfice, le contenu et le prix."],
    ["prototype", "Tester un prototype", 3, 1, "test", "Confronter une idée au terrain.", "Faire essayer un prototype et consigner un retour utilisateur."],
    ["pitch", "Présenter son projet en deux minutes", 2, 1, "présentation", "Rendre son projet compréhensible.", "Présenter le problème, la solution et la prochaine étape à une personne."],
    ["launch", "Lancer une première offre", 4, 1, "lancement", "Passer de la préparation à l’action.", "Publier une offre et l’adresser à au moins trois prospects."],
  ],
  [
    ["delayed-task", "Terminer une tâche importante repoussée", 2, 1, "tâche", "Débloquer une situation.", "Choisir une tâche repoussée et en terminer le résultat attendu."],
    ["focus-25", "Travailler 25 minutes sans distraction", 1, 1, "session", "Protéger son attention.", "Effectuer 25 minutes sur une seule tâche, notifications coupées."],
    ["focus-4", "Réaliser 4 sessions de concentration", 3, 4, "sessions", "Installer une pratique régulière.", "Effectuer quatre sessions de 25 minutes sur un travail prioritaire."],
    ["clear-desk", "Préparer son espace de travail", 1, 1, "préparation", "Faciliter le passage à l’action.", "Ranger son espace et préparer le matériel pour sa prochaine tâche."],
    ["plan-5", "Préparer sa journée à l’avance", 2, 5, "jours", "Construire un rythme sur la semaine.", "Écrire la veille la prochaine action prioritaire pendant cinq jours."],
    ["deep-work", "Protéger 8 sessions de travail profond", 4, 8, "sessions", "Soutenir un projet exigeant.", "Effectuer huit sessions de 45 minutes sans interruption sur un projet."],
  ],
  [
    ["journal", "Écrire une réflexion personnelle", 1, 1, "réflexion", "Prendre du recul.", "Écrire dix lignes sur une expérience et un enseignement."],
    ["values", "Clarifier ses valeurs", 1, 3, "valeurs", "Mieux choisir ses actions.", "Nommer trois valeurs et une action concrète pour chacune."],
    ["learn-3", "Apprendre puis mettre en pratique", 2, 3, "applications", "Transformer un savoir en action.", "Appliquer trois notions apprises et noter les résultats."],
    ["belief", "Questionner une croyance limitante", 2, 1, "expérience", "Tester une nouvelle possibilité.", "Écrire une croyance puis réaliser une petite expérience pour la vérifier."],
    ["seek-perspectives", "Explorer des points de vue différents", 3, 3, "échanges", "Élargir sa perspective.", "Échanger avec trois personnes et noter une idée nouvelle à chaque fois."],
    ["personal-experiment", "Mener une expérience personnelle sur 7 jours", 4, 7, "jours", "Observer un changement choisi.", "Tester une nouvelle pratique chaque jour et noter une observation pendant sept jours."],
  ],
];

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = groups.flatMap((rows, i) =>
  rows.map(([id, title, difficulty, target, unit, description, successCriterion]) => ({
    id, title, category: CHALLENGE_CATEGORIES[i], difficulty, target, unit, description, successCriterion,
  })),
);

export function emptyChallenges(): ChallengesData {
  return { version: 1, customTemplates: [], attempts: [] };
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function isChallengeQuantity(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= 1000000;
}
export function isChallengeResults(value: unknown): value is ChallengeResults {
  return object(value) && Object.keys(value).length === 3 &&
    Object.keys(CHALLENGE_RESULT_LABELS).every((key) =>
      typeof value[key] === "number" && Number.isSafeInteger(value[key]) &&
      Number(value[key]) >= 0 && Number(value[key]) <= 1000000);
}
export function canTrackChallengeResults(template: ChallengeTemplate) {
  return template.category === CHALLENGE_CATEGORIES[0] && (
    ["meet-3", "meet-5", "meet-10", "follow-up-5", "discovery-2"].includes(template.id) ||
    template.id.startsWith("custom-")
  );
}
export function isTemplate(value: unknown): value is ChallengeTemplate {
  return object(value) && ["id", "title", "description", "category", "unit", "successCriterion"].every(
    (key) => typeof value[key] === "string" && (value[key] as string).trim().length > 0,
  ) && CHALLENGE_CATEGORIES.includes(value.category as typeof CHALLENGE_CATEGORIES[number]) &&
    Number.isInteger(value.difficulty) && Number(value.difficulty) >= 1 && Number(value.difficulty) <= 4 &&
    isChallengeQuantity(value.target) &&
    (value.surpriseMinDays === undefined || (Number.isInteger(value.surpriseMinDays) && Number(value.surpriseMinDays) >= 1 && Number(value.surpriseMinDays) <= 7));
}
function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T12:00:00`).getTime()) && dateKey(new Date(`${value}T12:00:00`)) === value;
}
export function isSurpriseDays(value: unknown): value is Record<string, SurpriseDay> {
  if (!object(value)) return false;
  return Object.entries(value).every(([date, day]) => {
    if (!isDateKey(date) || !object(day) || !["main", "bonus", "week"].includes(String(day.slot)) ||
      !["balanced", "bold"].includes(String(day.mode)) || typeof day.includeCustom !== "boolean" ||
      typeof day.personalized !== "boolean" || !Number.isInteger(day.baseLevel) || Number(day.baseLevel) < 1 || Number(day.baseLevel) > 4 ||
      !Array.isArray(day.offers) || day.offers.length < 1 || day.offers.length > 3) return false;
    const offers = day.offers;
    if (!offers.every((offer: unknown, index: number) => object(offer) && isTemplate(offer.template) &&
      offer.template.difficulty >= Number(day.baseLevel) && offer.template.difficulty <= Math.min(4, Number(day.baseLevel) + 1) &&
      ["initial", "joker", "alternative"].includes(String(offer.reason)) &&
      (index === 0 ? offer.reason === "initial" : offer.reason !== "initial") &&
      ["offered", "replaced", "refused", "accepted"].includes(String(offer.status)) &&
      (index === offers.length - 1 || ["replaced", "refused"].includes(String(offer.status))) &&
      Array.isArray(offer.notes) && offer.notes.every((note: unknown) => typeof note === "string"))) return false;
    return new Set(offers.map((o: SurpriseOffer) => o.template.id)).size === offers.length &&
      new Set(offers.map((o: SurpriseOffer) => o.reason)).size === offers.length &&
      offers.every((o: SurpriseOffer, i: number) => o.reason !== "alternative" || (i > 0 && offers[i - 1].status === "refused"));
  });
}
export function isChallengesData(value: unknown): value is ChallengesData {
  if (!object(value) || value.version !== 1 || !Array.isArray(value.customTemplates) || !Array.isArray(value.attempts)) return false;
  if (!value.customTemplates.every(isTemplate)) return false;
  if (value.surpriseDays !== undefined && !isSurpriseDays(value.surpriseDays)) return false;
  if (!value.attempts.every((a: unknown) => object(a) &&
    typeof a.instanceId === "string" && a.instanceId.length > 0 &&
    ["main", "bonus", "week"].includes(String(a.slot)) && isDateKey(a.date) && isDateKey(a.endDate) && a.endDate >= a.date &&
    Number.isSafeInteger(a.progress) && Number(a.progress) >= 0 && Number(a.progress) <= 1000000 &&
    typeof a.note === "string" && typeof a.closed === "boolean" &&
    (a.results === undefined || isChallengeResults(a.results)) && isTemplate(a))) return false;
  return new Set(value.attempts.map((a: ChallengeAttempt) => a.instanceId)).size === value.attempts.length &&
    new Set(value.customTemplates.map((t: ChallengeTemplate) => t.id)).size === value.customTemplates.length;
}

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function challengePeriod(slot: ChallengeSlot, today: string) {
  if (slot !== "week") return { date: today, endDate: today };
  const start = new Date(`${today}T12:00:00`);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { date: dateKey(start), endDate: dateKey(end) };
}
export function isCurrentChallenge(a: ChallengeAttempt, today: string) {
  return !a.closed && a.date <= today && a.endDate >= today;
}
export function challengeStatus(a: ChallengeAttempt, today: string) {
  if (a.progress >= a.target) return "Terminé";
  return a.closed || a.endDate < today ? "Non terminé" : "En cours";
}
export function startChallenge(data: ChallengesData, template: ChallengeTemplate, slot: ChallengeSlot, target: number, today: string, instanceId: string): ChallengesData {
  if (!isChallengeQuantity(target)) throw new Error("La cible doit être un entier de 1 à 1 000 000.");
  return { ...data, attempts: [
    ...data.attempts.map((a) => a.slot === slot && isCurrentChallenge(a, today) ? { ...a, closed: true } : a),
    { ...template, ...challengePeriod(slot, today), date: today, instanceId, slot, target, progress: 0, note: "", closed: false },
  ] };
}
export function validateChallenge(data: ChallengesData, id: string, today: string): ChallengesData {
  const attempt = data.attempts.find((a) => a.instanceId === id);
  if (!attempt || !isCurrentChallenge(attempt, today) || challengeStatus(attempt, today) !== "Terminé") {
    throw new Error("La validation nécessite un défi actif dont l’objectif est atteint.");
  }
  return updateChallenge(data, id, { closed: true });
}

export function updateChallenge(data: ChallengesData, id: string, patch: Partial<Pick<ChallengeAttempt, "target" | "progress" | "note" | "closed">>): ChallengesData {
  if (patch.target !== undefined && !isChallengeQuantity(patch.target)) throw new Error("Cible invalide.");
  if (patch.progress !== undefined && (!Number.isSafeInteger(patch.progress) || patch.progress < 0 || patch.progress > 1000000)) throw new Error("Progression invalide.");
  return { ...data, attempts: data.attempts.map((a) => a.instanceId === id ? { ...a, ...patch } : a) };
}

// Results are observations only: never update progress, target, status or level.
// Called with the latest storage snapshot, including for archived attempts.
export function stepChallengeResult(data: ChallengesData, id: string, key: ChallengeResultKey, delta: number): ChallengesData {
  const attempt = data.attempts.find((a) => a.instanceId === id);
  if (!attempt || !canTrackChallengeResults(attempt)) throw new Error("Les résultats ne sont pas disponibles pour ce défi.");
  if (!Object.hasOwn(CHALLENGE_RESULT_LABELS, key) || (delta !== 1 && delta !== -1)) throw new Error("Compteur de résultat invalide.");
  const results = attempt.results ?? { conversations: 0, appointmentsProposed: 0, appointmentsObtained: 0 };
  const nextResults = { ...results, [key]: Math.min(1000000, Math.max(0, results[key] + delta)) };
  return { ...data, attempts: data.attempts.map((a) => a.instanceId === id ? { ...a, results: nextResults } : a) };
}
