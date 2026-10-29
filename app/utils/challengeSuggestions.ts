import { CHALLENGE_LEVELS, CHALLENGE_TEMPLATES, type ChallengeAttempt, type ChallengesData, type ChallengeTemplate } from "./challenges";

export type ChallengeSuggestion = {
  kind: "insufficient" | "advance" | "maintain" | "ease";
  message: string;
  reference: ChallengeAttempt | null;
  suggested: ChallengeTemplate | null;
};

// Only curated progressions share results across IDs. Category or level alone
// never establishes comparability (in particular 25-minute vs 45-minute work).
const families: Record<string, string> = {
  "meet-3": "meet", "meet-5": "meet", "meet-10": "meet",
  "focus-25": "focus-25-minutes", "focus-4": "focus-25-minutes",
};
const normalize = (text: string) => text.trim().toLocaleLowerCase("fr-FR").replace(/\s+/g, " ");
function identity(template: ChallengeTemplate) {
  const canonical = CHALLENGE_TEMPLATES.find((t) => t.id === template.id);
  const family = families[template.id];
  // Modified snapshots must not inherit a family's semantics just through an ID.
  if (family && canonical && normalize(template.unit) === normalize(canonical.unit) &&
    normalize(template.successCriterion) === normalize(canonical.successCriterion)) {
    return { model: `family:${family}`, unit: family === "focus-25-minutes" ? "sessions" : normalize(template.unit) };
  }
  return { model: `model:${template.id}:${normalize(template.successCriterion)}`, unit: normalize(template.unit) };
}

function templateSnapshot(a: ChallengeAttempt): ChallengeTemplate {
  return { id: a.id, title: a.title, description: a.description, category: a.category,
    difficulty: a.difficulty, target: a.target, unit: a.unit, successCriterion: a.successCriterion };
}

export function getChallengeSuggestion(data: ChallengesData, today: string): ChallengeSuggestion {
  // No completion timestamp exists in v1. For equal dates, append order is the
  // stable tie-breaker. Work on copies: suggestions never mutate stored data.
  const recent = data.attempts.map((attempt, index) => ({ attempt, index }))
    .filter(({ attempt }) => attempt.date <= today)
    .sort((a, b) => b.attempt.date.localeCompare(a.attempt.date) || b.index - a.index)
    .map(({ attempt }) => attempt);
  const reference = recent[0] ?? null;
  const insufficient: ChallengeSuggestion = {
    kind: "insufficient", reference, suggested: null,
    message: "Encore un peu d’expérience : il faut quatre défis comparables terminés ou clôturés pour une suggestion personnalisée.",
  };
  if (!reference) return insufficient;
  const key = identity(reference);
  const sample = recent.filter((a) => {
    const candidate = identity(a);
    return (a.slot === "week") === (reference.slot === "week") &&
      candidate.model === key.model && candidate.unit === key.unit &&
      (a.closed || a.endDate < today || a.progress >= a.target);
  }).slice(0, 4);
  if (sample.length < 4) return insufficient;

  const successes = sample.filter((a) => a.progress >= a.target).length;
  const result = `Tu as réussi ${successes} de tes 4 derniers défis comparables.`;
  const suggested = templateSnapshot(reference);
  if (successes >= 3) {
    if (reference.difficulty === 4 || reference.target === 1000000) {
      return { kind: "maintain", reference, suggested,
        message: `${result} Tu peux consolider ce palier à ton rythme.` };
    }
    suggested.difficulty = reference.difficulty + 1;
    // A small quantity step, without jumping to a distant catalogue target.
    suggested.target = Math.min(1000000, reference.target + Math.max(1, Math.ceil(reference.target * .2)));
    return { kind: "advance", reference, suggested,
      message: `${result} Prêt à essayer le niveau ${CHALLENGE_LEVELS[suggested.difficulty - 1]} ?` };
  }
  if (successes === 2) {
    return { kind: "maintain", reference, suggested,
      message: `${result} Garder ce niveau et cette cible te laisse le temps de consolider.` };
  }
  // Remain within 20% of the current target (one unit for small quantities).
  // The actual average helps avoid suggesting a target below recent capacity.
  const average = Math.ceil(sample.reduce((sum, a) => sum + a.progress, 0) / sample.length);
  suggested.target = Math.max(1, Math.min(reference.target - 1,
    Math.max(Math.floor(reference.target * .8), average)));
  return { kind: "ease", reference, suggested,
    message: reference.target === 1
      ? `${result} La cible est déjà minimale : tu peux la garder et avancer à ton rythme.`
      : `${result} Une cible de ${suggested.target} ${reference.unit} peut rendre le prochain pas plus accessible.` };
}
