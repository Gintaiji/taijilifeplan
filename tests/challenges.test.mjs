// No extra dependency: execute the app's TypeScript with the installed compiler.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const requireModule = createRequire(import.meta.url);
const directory = path.dirname(fileURLToPath(import.meta.url));

const values = new Map();
global.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};
global.window = new EventTarget();
let cloud = null;
let writes = 0;
let failRead = false;
let failWrite = false;
// Exercise the real cloudBackup and cloudSyncStatus modules; replace only the SDK transport.
const supabase = { getSupabaseBrowserClient: () => ({ from: (table) => {
  assert.equal(table, 'taiji_app_data');
  return {
    select: () => ({ eq: (_key, userId) => ({ maybeSingle: async () => {
      assert.equal(userId, 'test-user');
      return { data: cloud, error: failRead ? new Error('offline') : null };
    } }) }),
    upsert: (row) => ({ select: () => ({ single: async () => {
      if (failWrite) return { data: null, error: new Error('write failed') };
      writes++;
      cloud = { data: structuredClone(row.data), updated_at: row.updated_at };
      return { data: { updated_at: row.updated_at }, error: null };
    } }) }),
  };
} }) };
const modules = new Map();
function load(relative) {
  const filename = path.resolve(directory, '..', relative);
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiledModule = { exports: {} };
  modules.set(filename, compiledModule);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const localRequire = (name) => {
    if (name === './supabase') return supabase;
    if (name.startsWith('.')) return load(path.relative(path.resolve(directory, '..'), path.resolve(path.dirname(filename), `${name}.ts`)));
    return requireModule(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`, { filename })(localRequire, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const c = load('app/utils/challenges.ts');
const recommendations = load('app/utils/challengeSuggestions.ts');
const surprise = load('app/utils/surpriseChallenges.ts');
const s = load('app/utils/storage.ts');
const b = load('app/utils/backup.ts');
const cloudApi = load('app/utils/cloudBackup.ts');
const sync = load('app/utils/cloudSyncStatus.ts');
const today = '2026-10-29';
const template = c.CHALLENGE_TEMPLATES[0];
function attempted() { return c.startChallenge(c.emptyChallenges(), template, 'main', 3, today, 'attempt-1'); }
function saveAttempt() { s.setStorage(s.STORAGE_KEYS.challenges, attempted()); }
test('92B: validation guards, daily and early weekly closure preserve notes and results', () => {
  for (const slot of ['main', 'week']) {
    let data = c.startChallenge(c.emptyChallenges(), template, slot, 5, today, 'validate');
    data = c.updateChallenge(data, 'validate', { progress: 4, note: 'Réflexion' });
    data = c.stepChallengeResult(data, 'validate', 'conversations', 1);
    const before = structuredClone(data);
    assert.throws(() => c.validateChallenge(data, 'validate', today));
    assert.deepEqual(data, before);
    data = c.updateChallenge(data, 'validate', { progress: 5 });
    const reached = data.attempts[0];
    data = c.validateChallenge(data, 'validate', today);
    assert.deepEqual(data.attempts[0], { ...reached, closed: true });
    assert.equal(c.isCurrentChallenge(data.attempts[0], today), false);
    assert.equal(c.challengeStatus(data.attempts[0], today), 'Terminé');
    assert.throws(() => c.validateChallenge(data, 'validate', today));
    assert.ok(c.isChallengesData(JSON.parse(JSON.stringify(data))));
  }
  const archived = c.updateChallenge(attempted(), 'attempt-1', { closed: true });
  assert.equal(c.challengeStatus(archived.attempts[0], today), 'Non terminé');
  assert.throws(() => c.validateChallenge(archived, 'attempt-1', today));
});
beforeEach(() => { values.clear(); cloud = null; writes = 0; failRead = false; failWrite = false; });

test('36 stable templates cover all categories and levels with concrete criteria', () => {
  assert.equal(c.CHALLENGE_TEMPLATES.length, 36);
  assert.equal(new Set(c.CHALLENGE_TEMPLATES.map((t) => t.id)).size, 36);
  for (const category of c.CHALLENGE_CATEGORIES) {
    const group = c.CHALLENGE_TEMPLATES.filter((t) => t.category === category);
    assert.equal(group.length, 6);
    assert.deepEqual([...new Set(group.map((t) => t.difficulty))].sort(), [1, 2, 3, 4]);
  }
  assert.ok(c.isChallengesData({ ...c.emptyChallenges(), customTemplates: c.CHALLENGE_TEMPLATES }));
});
test('custom creation, counters, target changes, completion and reload retain unrelated data', () => {
  s.setStorage(s.STORAGE_KEYS.trajectory, { [today]: { accomplishedToday: 'préservé' } });
  s.setStorage(s.STORAGE_KEYS.dailyObjectives, { [today]: [{ id: 1, label: 'préservé' }] });
  const unrelated = [...values.entries()];
  const custom = { ...template, id: 'custom-test', title: 'Mon défi' };
  let data = { ...c.emptyChallenges(), customTemplates: [custom] };
  data = c.startChallenge(data, custom, 'main', 2, today, 'custom-attempt');
  data = c.updateChallenge(data, 'custom-attempt', { progress: 1 });
  data = c.updateChallenge(data, 'custom-attempt', { progress: 0 });
  assert.equal(data.attempts[0].progress, 0);
  data = c.updateChallenge(data, 'custom-attempt', { target: 1, progress: 1, note: 'J’ai osé.' });
  assert.equal(c.challengeStatus(data.attempts[0], today), 'Terminé');
  data = c.updateChallenge(data, 'custom-attempt', { target: 3 });
  assert.equal(c.challengeStatus(data.attempts[0], today), 'En cours');
  s.setStorage(s.STORAGE_KEYS.challenges, data);
  assert.deepEqual(JSON.parse(localStorage.getItem(s.STORAGE_KEYS.challenges)), data);
  for (const [key, value] of unrelated) if (key !== s.STORAGE_KEYS.localDataUpdatedAt) assert.equal(values.get(key), value);
  assert.ok(s.isAppDataStorageKey(s.STORAGE_KEYS.challenges));
});
test('one main, one bonus, one weekly; replacement preserves history and dates expire', () => {
  let data = attempted();
  data = c.startChallenge(data, template, 'bonus', 1, today, 'bonus');
  data = c.startChallenge(data, template, 'week', 10, today, 'week');
  data = c.startChallenge(data, template, 'main', 5, today, 'replacement');
  assert.equal(data.attempts.length, 4);
  assert.equal(data.attempts[0].closed, true);
  assert.equal(c.challengeStatus(data.attempts[0], today), 'Non terminé');
  assert.equal(data.attempts.filter((a) => c.isCurrentChallenge(a, today)).length, 3);
  const week = data.attempts[2];
  assert.equal(week.date, today);
  assert.equal(week.endDate, '2026-11-01');
  assert.ok(c.isCurrentChallenge(week, '2026-11-01'));
  assert.equal(c.isCurrentChallenge(week, '2026-11-02'), false);
  assert.equal(c.challengeStatus(week, '2026-11-02'), 'Non terminé');
  assert.equal(c.isCurrentChallenge(data.attempts[3], '2026-10-30'), false);
  assert.deepEqual(c.challengePeriod('week', '2027-01-01'), { date: '2026-12-28', endDate: '2027-01-03' });
});
test('JSON round trip includes templates, attempts and notes', () => {
  saveAttempt();
  const backup = JSON.parse(JSON.stringify(b.createBackupFile()));
  assert.ok(b.isBackupFile(backup));
  values.clear();
  b.importBackupData(backup.data);
  assert.deepEqual(b.getBackupData().challenges, backup.data.challenges);
});
test('old JSON and old cloud payload preserve existing challenges', () => {
  saveAttempt();
  const original = localStorage.getItem(s.STORAGE_KEYS.challenges);
  const old = b.createBackupFile();
  delete old.data.challenges;
  assert.ok(b.isBackupFile(old));
  b.importBackupData(old.data);
  assert.equal(localStorage.getItem(s.STORAGE_KEYS.challenges), original);
  values.clear();
  b.importBackupData(old.data);
  assert.deepEqual(b.getBackupData().challenges, c.emptyChallenges());
});
test('malformed imports rejected before any write and corrupt storage is never repaired', () => {
  saveAttempt();
  const backup = b.createBackupFile();
  backup.data.challenges.attempts[0].progress = -1;
  const snapshot = [...values];
  assert.equal(b.isBackupFile(backup), false);
  assert.throws(() => b.importBackupData(backup.data));
  assert.deepEqual([...values], snapshot);
  localStorage.setItem(s.STORAGE_KEYS.challenges, '{invalid');
  assert.throws(() => b.createBackupFile());
  assert.equal(localStorage.getItem(s.STORAGE_KEYS.challenges), '{invalid');
});
test('challenge-only data passes empty guards; empty library state does not', () => {
  assert.equal(b.isBackupDataEmptyOrAlmostEmpty(b.getBackupData()), true);
  saveAttempt();
  assert.equal(b.isBackupDataEmptyOrAlmostEmpty(b.getBackupData()), false);
});
test('cloud save and restore round trip uses the shared payload', async () => {
  saveAttempt();
  const result = await sync.saveCloudBackupSafely('test-user');
  assert.equal(result.status, 'success');
  assert.equal(writes, 1);
  const restored = await cloudApi.getCloudBackup('test-user');
  assert.ok(b.isBackupData(restored.data));
  values.clear();
  b.importBackupData(restored.data);
  assert.deepEqual(b.getBackupData().challenges, attempted());
});
test('newer cloud blocks save including when old cloud has no challenges', async () => {
  saveAttempt();
  const oldData = b.getBackupData();
  delete oldData.challenges;
  cloud = { data: oldData, updated_at: '2099-01-01T00:00:00.000Z' };
  const snapshot = [...values];
  const result = await sync.saveCloudBackupSafely('test-user');
  assert.equal(result.status, 'conflict');
  assert.equal(writes, 0);
  assert.deepEqual([...values], snapshot);
  b.importBackupData(cloud.data);
  assert.deepEqual(b.getBackupData().challenges, attempted());
});
test('empty saves blocked; network and write failures preserve local challenges', async () => {
  assert.equal((await sync.saveCloudBackupSafely('test-user')).status, 'empty');
  saveAttempt();
  const snapshot = [...values];
  failRead = true;
  await assert.rejects(sync.saveCloudBackupSafely('test-user'));
  assert.equal(writes, 0);
  failRead = false; failWrite = true;
  await assert.rejects(sync.saveCloudBackupSafely('test-user'));
  assert.deepEqual([...values], snapshot);
});
test('invalid quantities rejected without altering history', () => {
  const data = attempted();
  for (const target of [0, -1, 1.2, NaN, Infinity, 1000001]) {
    assert.throws(() => c.updateChallenge(data, 'attempt-1', { target }));
    assert.throws(() => c.startChallenge(data, template, 'main', target, today, 'invalid'));
  }
  assert.equal(data.attempts[0].target, 3);
});

function suggestionData(successes, overrides = {}) {
  return { ...c.emptyChallenges(), attempts: Array.from({ length: 4 }, (_, i) => ({
    ...template, instanceId: `history-${i}`, slot: 'main', date: `2026-10-${20 + i}`,
    endDate: `2026-10-${20 + i}`, target: 10, progress: i < successes ? 10 : 4,
    note: 'À conserver', closed: true, ...overrides,
  })) };
}
const recommend = (data) => recommendations.getChallengeSuggestion(data, today);

test('91B: 3 or 4 successes suggest exactly the next level without a large jump', () => {
  for (const successes of [3, 4]) {
    const data = suggestionData(successes);
    const result = recommend(data);
    assert.equal(result.kind, 'advance');
    assert.equal(result.suggested.difficulty, 2);
    assert.equal(result.suggested.target, 12);
    assert.ok(result.message.includes(`${successes} de tes 4`));
  }
});
test('91B: 2 successes maintain the latest level and adjusted target', () => {
  const result = recommend(suggestionData(2, { difficulty: 3, target: 8 }));
  assert.equal(result.kind, 'maintain');
  assert.equal(result.suggested.difficulty, 3);
  assert.equal(result.suggested.target, 8);
});
test('91B: 0 or 1 success suggests a reasonable reduction using actual results', () => {
  for (const successes of [0, 1]) {
    const result = recommend(suggestionData(successes));
    assert.equal(result.kind, 'ease');
    assert.equal(result.suggested.target, 8);
    assert.equal(result.suggested.difficulty, 1);
  }
  const minimal = recommend(suggestionData(0, { target: 1, progress: 0 }));
  assert.equal(minimal.suggested.target, 1);
  assert.ok(minimal.message.includes('déjà minimale'));
});
test('91B: fewer than four finished comparable attempts never claims personalization', () => {
  for (let count = 0; count < 4; count++) {
    const data = suggestionData(4);
    data.attempts = data.attempts.slice(0, count);
    const result = recommend(data);
    assert.equal(result.kind, 'insufficient');
    assert.equal(result.suggested, null);
    assert.ok(!result.message.includes('Tu as réussi'));
  }
});
test('91B: curated progressions compare across IDs but not category or incompatible units', () => {
  const data = suggestionData(3);
  data.attempts[0] = { ...data.attempts[0], ...c.CHALLENGE_TEMPLATES.find((t) => t.id === 'meet-5'), progress: 5 };
  assert.equal(recommend(data).kind, 'advance');
  data.attempts[0].unit = 'minutes';
  assert.equal(recommend(data).kind, 'insufficient');
  data.attempts[0] = { ...data.attempts[0], ...c.CHALLENGE_TEMPLATES.find((t) => t.id === 'follow-up-5') };
  assert.equal(recommend(data).kind, 'insufficient');
});
test('91B: 25-minute sessions compare singular/plural; 45-minute work is excluded', () => {
  const focus = c.CHALLENGE_TEMPLATES.find((t) => t.id === 'focus-25');
  const data = suggestionData(4, focus);
  data.attempts[0] = { ...data.attempts[0], ...c.CHALLENGE_TEMPLATES.find((t) => t.id === 'focus-4') };
  assert.equal(recommend(data).kind, 'advance');
  data.attempts[0] = { ...data.attempts[0], ...c.CHALLENGE_TEMPLATES.find((t) => t.id === 'deep-work') };
  assert.equal(recommend(data).kind, 'insufficient');
});
test('91B: daily main and bonus compare together, weekly attempts stay separate', () => {
  const data = suggestionData(4);
  data.attempts[0].slot = 'bonus';
  assert.equal(recommend(data).kind, 'advance');
  data.attempts[0].slot = 'week';
  assert.equal(recommend(data).kind, 'insufficient');
  data.attempts.forEach((a) => { a.slot = 'week'; });
  assert.equal(recommend(data).kind, 'advance');
});
test('91B: four latest results use actual target per attempt and deterministic date ordering', () => {
  const data = suggestionData(4);
  data.attempts.forEach((a) => { a.target = 100; a.progress = 1; });
  data.attempts[0].target = 1;
  data.attempts[1].target = 1;
  // Older successes inserted at the end must not displace newer results.
  data.attempts.push(...suggestionData(4).attempts.map((a, i) => ({ ...a, instanceId: `old-${i}`, date: '2026-09-01', endDate: '2026-09-01' })));
  assert.equal(recommend(data).kind, 'maintain');
  const sameDay = suggestionData(0, { date: today, endDate: today });
  sameDay.attempts.push(...suggestionData(4, { date: today, endDate: today }).attempts);
  assert.equal(recommend(sameDay).kind, 'advance');
});
test('91B: unfinished ongoing and future attempts excluded; expired attempts count as closed', () => {
  const data = suggestionData(3, { closed: false });
  assert.equal(recommend(data).kind, 'advance');
  data.attempts[3].date = today;
  data.attempts[3].endDate = today;
  assert.equal(recommend(data).kind, 'insufficient');
  data.attempts[3].progress = 10;
  assert.equal(recommend(data).kind, 'advance');
  data.attempts[3].date = '2026-11-01';
  data.attempts[3].endDate = '2026-11-01';
  assert.equal(recommend(data).kind, 'insufficient');
});
test('91B: custom settings and history are unchanged; changed success criteria excluded', () => {
  const custom = { ...template, id: 'custom-personal', title: 'Mon modèle', description: 'Mon texte', target: 15, difficulty: 2 };
  const data = suggestionData(4, custom);
  data.customTemplates = [custom];
  s.setStorage(s.STORAGE_KEYS.challenges, data);
  const snapshot = JSON.stringify(data);
  const storageBefore = [...values];
  const result = recommend(data);
  assert.equal(result.kind, 'ease'); // actual quantity 10 is below custom target 15
  assert.equal(result.suggested.title, custom.title);
  assert.equal(result.suggested.successCriterion, custom.successCriterion);
  assert.equal(JSON.stringify(data), snapshot);
  assert.deepEqual([...values], storageBefore);
  data.attempts[0].successCriterion = 'Un autre résultat attendu';
  assert.equal(recommend(data).kind, 'insufficient');
});
test('91B: level and quantity boundaries never generate an invalid or fifth level', () => {
  const top = recommend(suggestionData(4, { difficulty: 4 }));
  assert.equal(top.kind, 'maintain');
  assert.equal(top.suggested.difficulty, 4);
  const capped = recommend(suggestionData(4, { target: 1000000, progress: 1000000 }));
  assert.equal(capped.suggested.target, 1000000);
});

test('optional results: only relevant prospecting models and custom prospecting challenges qualify', () => {
  const relevant = c.CHALLENGE_TEMPLATES.filter(c.canTrackChallengeResults).map((t) => t.id);
  assert.deepEqual(relevant, ['meet-3', 'meet-5', 'meet-10', 'follow-up-5', 'discovery-2']);
  assert.equal(c.canTrackChallengeResults({ ...template, id: 'custom-prospecting' }), true);
  assert.equal(c.canTrackChallengeResults({ ...template, id: 'custom-reading', category: c.CHALLENGE_CATEGORIES[5] }), false);
});
test('optional results: independent + and − counters, zero floor and safe maximum', () => {
  let data = attempted();
  assert.equal(data.attempts[0].results, undefined);
  for (const key of Object.keys(c.CHALLENGE_RESULT_LABELS)) {
    data = c.stepChallengeResult(data, 'attempt-1', key, 1);
    data = c.stepChallengeResult(data, 'attempt-1', key, 1);
    data = c.stepChallengeResult(data, 'attempt-1', key, -1);
    assert.equal(data.attempts[0].results[key], 1);
  }
  assert.equal(data.attempts[0].progress, 0);
  assert.equal(data.attempts[0].target, 3);
  data = c.stepChallengeResult(data, 'attempt-1', 'conversations', -1);
  data = c.stepChallengeResult(data, 'attempt-1', 'conversations', -1);
  assert.equal(data.attempts[0].results.conversations, 0);
  data.attempts[0].results.appointmentsObtained = 1000000;
  data = c.stepChallengeResult(data, 'attempt-1', 'appointmentsObtained', 1);
  assert.equal(data.attempts[0].results.appointmentsObtained, 1000000);
  assert.ok(c.isChallengesData(data));
  assert.throws(() => c.stepChallengeResult(data, 'missing', 'conversations', 1));
  assert.throws(() => c.stepChallengeResult(data, 'attempt-1', 'prospectName', 1));
  assert.throws(() => c.stepChallengeResult(data, 'attempt-1', 'conversations', 2));
  const irrelevant = { ...data, attempts: [{ ...data.attempts[0], id: 'focus-25', category: c.CHALLENGE_CATEGORIES[4] }] };
  assert.throws(() => c.stepChallengeResult(irrelevant, 'attempt-1', 'conversations', 1));
});
test('optional results: legacy data remains valid and is not rewritten to add empty counters', () => {
  saveAttempt();
  const original = localStorage.getItem(s.STORAGE_KEYS.challenges);
  assert.ok(c.isChallengesData(attempted()));
  const file = b.createBackupFile();
  assert.ok(b.isBackupFile(file));
  assert.equal(localStorage.getItem(s.STORAGE_KEYS.challenges), original);
  values.clear();
  b.importBackupData(file.data);
  assert.equal(b.getBackupData().challenges.attempts[0].results, undefined);
});
test('optional results: history retains results and reflection; later outcomes can be recorded', () => {
  const original = attempted();
  let data = c.stepChallengeResult(original, 'attempt-1', 'conversations', 1);
  data = c.updateChallenge(data, 'attempt-1', { note: 'Une bonne expérience.', progress: 3 });
  data = c.startChallenge(data, template, 'main', 5, today, 'new-attempt');
  data = c.stepChallengeResult(data, 'attempt-1', 'appointmentsObtained', 1);
  assert.equal(original.attempts[0].results, undefined, 'no mutation of prior snapshot');
  assert.equal(data.attempts[0].closed, true);
  assert.equal(data.attempts[0].results.conversations, 1);
  assert.equal(data.attempts[0].results.appointmentsObtained, 1);
  assert.equal(data.attempts[0].note, 'Une bonne expérience.');
  assert.equal(data.attempts[1].results, undefined, 'new attempt never inherits past outcomes');
  s.setStorage(s.STORAGE_KEYS.challenges, data);
  assert.deepEqual(b.getBackupData().challenges, data, 'reload preserves full history');
});
test('optional results: no impact on action success or 91B recommendations', () => {
  const data = suggestionData(3);
  const before = recommend(data);
  let after = data;
  for (const a of data.attempts) after = c.stepChallengeResult(after, a.instanceId, 'appointmentsObtained', 1);
  const result = recommend(after);
  assert.equal(result.kind, before.kind);
  assert.equal(result.message, before.message);
  assert.deepEqual(result.suggested, before.suggested);
  for (let i = 0; i < data.attempts.length; i++) {
    assert.equal(c.challengeStatus(after.attempts[i], today), c.challengeStatus(data.attempts[i], today));
    assert.equal(after.attempts[i].progress, data.attempts[i].progress);
  }
  assert.equal(c.challengeStatus(c.stepChallengeResult(attempted(), 'attempt-1', 'appointmentsObtained', 1).attempts[0], today), 'En cours');
  assert.equal(c.challengeStatus(c.updateChallenge(attempted(), 'attempt-1', { progress: 3 }).attempts[0], today), 'Terminé');
});
test('optional results: JSON export/import includes all three counters', () => {
  let data = attempted();
  for (const key of Object.keys(c.CHALLENGE_RESULT_LABELS)) data = c.stepChallengeResult(data, 'attempt-1', key, 1);
  s.setStorage(s.STORAGE_KEYS.challenges, data);
  const backup = JSON.parse(JSON.stringify(b.createBackupFile()));
  assert.ok(b.isBackupFile(backup));
  values.clear();
  b.importBackupData(backup.data);
  assert.deepEqual(b.getBackupData().challenges, data);
});
test('optional results: malformed values reject an import before any write', () => {
  saveAttempt();
  const snapshot = [...values];
  for (const invalid of [null, {}, { conversations: -1, appointmentsProposed: 0, appointmentsObtained: 0 },
    { conversations: 1.5, appointmentsProposed: 0, appointmentsObtained: 0 },
    { conversations: 0, appointmentsProposed: 0, appointmentsObtained: 1000001 },
    { conversations: 0, appointmentsProposed: 0, appointmentsObtained: 0, prospectName: 'Unexpected field' }]) {
    const backup = b.createBackupFile();
    backup.data.challenges.attempts[0].results = invalid;
    assert.equal(b.isBackupFile(backup), false);
    assert.throws(() => b.importBackupData(backup.data));
    assert.deepEqual([...values], snapshot);
  }
});
test('optional results: simulated cloud round trip and newer-cloud conflicts preserve data', async () => {
  const data = c.stepChallengeResult(attempted(), 'attempt-1', 'appointmentsObtained', 1);
  s.setStorage(s.STORAGE_KEYS.challenges, data);
  assert.equal((await sync.saveCloudBackupSafely('test-user')).status, 'success');
  const savedCloud = await cloudApi.getCloudBackup('test-user');
  values.clear();
  assert.ok(b.isBackupData(savedCloud.data));
  b.importBackupData(savedCloud.data);
  assert.deepEqual(b.getBackupData().challenges, data);
  const beforeConflict = [...values];
  cloud.updated_at = '2099-01-01T00:00:00.000Z';
  assert.equal((await sync.saveCloudBackupSafely('test-user')).status, 'conflict');
  assert.equal(writes, 1);
  assert.deepEqual([...values], beforeConflict);
});

const surpriseOptions = { slot: 'main', mode: 'balanced', includeCustom: false };
const offered = (data) => data.surpriseDays[today].offers.at(-1);
test('surprise: 80/20 and 65/35 levels, uniform within each selected group', () => {
  const day = { ...surpriseOptions, baseLevel: 1, personalized: false };
  const candidates = c.CHALLENGE_TEMPLATES.filter((t) => surprise.SURPRISE_MIN_DAYS[t.id] === 1 && t.difficulty === 1);
  for (let i = 0; i < candidates.length; i++) {
    const samples = [.9, (i + .5) / candidates.length];
    const selection = surprise.selectSurprise(c.emptyChallenges(), today, day, () => samples.shift());
    assert.equal(selection.template.id, candidates[i].id);
  }
  for (const mode of ['balanced', 'bold']) {
    let higher = 0;
    for (let i = 0; i < 100; i++) {
      const samples = [(i + .5) / 100, .5];
      const selection = surprise.selectSurprise(c.emptyChallenges(), today, { ...day, mode }, () => samples.shift());
      assert.ok([1, 2].includes(selection.template.difficulty));
      if (selection.template.difficulty === 2) higher++;
    }
    assert.equal(higher, mode === 'balanced' ? 20 : 35);
  }
});
test('surprise: duration rules exclude multi-day work daily and check remaining week days', () => {
  const minDays = surprise.SURPRISE_MIN_DAYS;
  assert.equal(minDays['plan-5'], 5);
  assert.equal(minDays['personal-experiment'], 7);
  assert.equal(minDays['network-event'], undefined);
  assert.equal(minDays['new-activity'], undefined);
  for (const slot of ['main', 'bonus']) {
    for (let i = 0; i < 40; i++) {
      const result = surprise.selectSurprise(c.emptyChallenges(), today, { ...surpriseOptions, slot, baseLevel: 3, personalized: true }, () => i / 40);
      assert.equal(minDays[result.template.id], 1);
    }
  }
  // Thursday leaves four days: never propose 5/7-day challenges for this week.
  for (let i = 0; i < 40; i++) {
    const result = surprise.selectSurprise(c.emptyChallenges(), today, { ...surpriseOptions, slot: 'week', baseLevel: 3, personalized: true }, () => i / 40);
    assert.ok(minDays[result.template.id] <= 4);
  }
});
test('surprise: recent attempts avoided when at least two fresh candidates exist', () => {
  const data = attempted();
  data.attempts[0].date = '2026-10-28'; data.attempts[0].endDate = '2026-10-28';
  for (let i = 0; i < 40; i++) {
    const result = surprise.selectSurprise(data, today, { ...surpriseOptions, baseLevel: 1, personalized: false }, () => i / 40);
    assert.notEqual(result.template.id, template.id);
  }
});
test('surprise: fallback is explicit; same-day exclusion is never relaxed; no candidates throws', () => {
  const data = { ...c.emptyChallenges(), attempts: c.CHALLENGE_TEMPLATES.map((t, i) => ({
    ...attempted().attempts[0], ...t, instanceId: `recent-${i}`, date: '2026-10-28', endDate: '2026-10-28',
  })) };
  const day = { ...surpriseOptions, baseLevel: 1, personalized: false };
  assert.ok(surprise.selectSurprise(data, today, day, () => .5).notes.some((n) => n.includes('7 derniers jours')));
  data.attempts.forEach((a) => { a.date = today; a.endDate = today; });
  assert.throws(() => surprise.selectSurprise(data, today, day, () => .5), /Aucun défi éligible/);
  // Only a higher-level candidate left: report this instead of silently changing the mix.
  data.attempts = data.attempts.filter((a) => a.difficulty !== 2);
  const higherOnly = surprise.selectSurprise(data, today, day, () => .5);
  assert.equal(higherOnly.template.difficulty, 2);
  assert.ok(higherOnly.notes.some((n) => n.includes('seul le niveau immédiatement supérieur')));
});
test('surprise: joker and exceptional alternative are bounded across slots and reloads', () => {
  let data = surprise.drawSurprise(c.emptyChallenges(), today, surpriseOptions, 'initial', () => .5);
  assert.equal(data.attempts.length, 0);
  assert.ok(c.isChallengesData(data));
  assert.throws(() => surprise.drawSurprise(data, today, { ...surpriseOptions, slot: 'week' }, 'initial'), /existe déjà/);
  assert.throws(() => surprise.drawSurprise(data, today, surpriseOptions, 'alternative'), /réservée/);
  const firstId = offered(data).template.id;
  data = surprise.drawSurprise(data, today, { ...surpriseOptions, mode: 'bold', slot: 'week' }, 'joker', () => .5);
  assert.equal(data.surpriseDays[today].slot, 'main', 'configuration locked for the day');
  assert.notEqual(offered(data).template.id, firstId);
  assert.throws(() => surprise.drawSurprise(data, today, surpriseOptions, 'joker'), /déjà été utilisé/);
  data = surprise.refuseSurprise(data, today, offered(data).template.id);
  assert.equal(data.attempts.length, 0, 'refusal never creates a failed attempt');
  data = surprise.drawSurprise(data, today, surpriseOptions, 'alternative', () => .5);
  assert.equal(new Set(data.surpriseDays[today].offers.map((o) => o.template.id)).size, 3);
  s.setStorage(s.STORAGE_KEYS.challenges, data);
  data = JSON.parse(localStorage.getItem(s.STORAGE_KEYS.challenges));
  assert.throws(() => surprise.drawSurprise(data, today, surpriseOptions, 'joker'));
  data = surprise.refuseSurprise(data, today, offered(data).template.id);
  assert.throws(() => surprise.drawSurprise(data, today, surpriseOptions, 'alternative'));
  assert.equal(data.attempts.length, 0);
  assert.ok(c.isChallengesData(data));
  const tomorrow = surprise.drawSurprise(data, '2026-10-30', surpriseOptions, 'initial', () => .5);
  assert.equal(tomorrow.surpriseDays['2026-10-30'].offers.length, 1);
});
test('surprise: failed redraw does not consume the joker', () => {
  const data = surprise.drawSurprise(c.emptyChallenges(), today, surpriseOptions, 'initial', () => .5);
  const snapshot = JSON.stringify(data);
  const blocked = { ...data, attempts: c.CHALLENGE_TEMPLATES.map((t, i) => ({ ...attempted().attempts[0], ...t, instanceId: `today-${i}` })) };
  assert.throws(() => surprise.drawSurprise(blocked, today, surpriseOptions, 'joker'), /Aucun défi éligible/);
  assert.equal(JSON.stringify(data), snapshot);
  assert.equal(data.surpriseDays[today].offers.some((o) => o.reason === 'joker'), false);
});
test('surprise: voluntary acceptance alone starts an attempt and archives the previous active one', () => {
  let data = surprise.drawSurprise(attempted(), today, surpriseOptions, 'initial', () => .5);
  assert.equal(data.attempts.length, 1);
  const chosen = offered(data).template;
  assert.throws(() => surprise.acceptSurprise(data, today, 'stale', 'outdated-template'), /autre onglet/);
  assert.throws(() => surprise.refuseSurprise(data, today, 'outdated-template'), /autre onglet/);
  data = surprise.acceptSurprise(data, today, 'accepted-surprise', chosen.id);
  assert.equal(data.attempts.length, 2);
  assert.equal(data.attempts[0].closed, true);
  assert.equal(data.attempts[1].id, chosen.id);
  assert.equal(data.attempts[1].target, chosen.target);
  assert.equal(data.attempts[1].progress, 0);
  assert.equal(data.attempts[1].results, undefined);
  assert.throws(() => surprise.acceptSurprise(data, today, 'second', chosen.id));
  assert.throws(() => surprise.drawSurprise(data, today, surpriseOptions, 'joker'));
  assert.ok(c.isChallengesData(data));
});
test('surprise: conservative fallback and 91B reference never jump more than one level', () => {
  assert.deepEqual(surprise.surpriseLevel(c.emptyChallenges(), today, surpriseOptions), { baseLevel: 1, personalized: false });
  const history = suggestionData(4, { difficulty: 3 });
  assert.deepEqual(surprise.surpriseLevel(history, today, surpriseOptions), { baseLevel: 3, personalized: true });
  assert.deepEqual(surprise.surpriseLevel(history, today, { ...surpriseOptions, slot: 'week' }), { baseLevel: 1, personalized: false });
  const drawn = surprise.drawSurprise(history, today, surpriseOptions, 'initial', () => .5);
  assert.ok([3, 4].includes(offered(drawn).template.difficulty));
  assert.equal(history.attempts.at(-1).difficulty, 3);
});
test('surprise: custom challenges require both global opt-in and explicit duration confirmation', () => {
  const custom = { ...template, id: 'custom-surprise', surpriseMinDays: 1 };
  const data = { ...c.emptyChallenges(), customTemplates: [custom] };
  const day = { ...surpriseOptions, baseLevel: 1, personalized: false };
  const eligible = c.CHALLENGE_TEMPLATES.filter((t) => t.difficulty === 1 && surprise.SURPRISE_MIN_DAYS[t.id] === 1).length;
  const chooseLast = () => .99999;
  assert.notEqual(surprise.selectSurprise(data, today, day, chooseLast).template.id, custom.id);
  assert.equal(surprise.selectSurprise(data, today, { ...day, includeCustom: true }, chooseLast).template.id, custom.id);
  assert.ok(eligible > 1);
  delete custom.surpriseMinDays;
  assert.notEqual(surprise.selectSurprise(data, today, { ...day, includeCustom: true }, chooseLast).template.id, custom.id);
  custom.surpriseMinDays = 7;
  assert.notEqual(surprise.selectSurprise(data, today, { ...day, includeCustom: true }, chooseLast).template.id, custom.id);
});
test('surprise: optional schema rejects corrupt draw state before any import write', () => {
  assert.ok(c.isChallengesData(attempted()));
  const data = surprise.drawSurprise(c.emptyChallenges(), today, surpriseOptions, 'initial', () => .5);
  s.setStorage(s.STORAGE_KEYS.challenges, data);
  const snapshot = [...values];
  const invalid = b.createBackupFile();
  invalid.data.challenges.surpriseDays[today].offers.push(invalid.data.challenges.surpriseDays[today].offers[0]);
  assert.equal(b.isBackupFile(invalid), false);
  assert.throws(() => b.importBackupData(invalid.data));
  assert.deepEqual([...values], snapshot);
});
test('surprise: JSON and cloud round trips, old payloads and conflict protection', async () => {
  let data = surprise.drawSurprise(c.emptyChallenges(), today, surpriseOptions, 'initial', () => .5);
  data = surprise.drawSurprise(data, today, surpriseOptions, 'joker', () => .5);
  s.setStorage(s.STORAGE_KEYS.challenges, data);
  assert.equal(b.isBackupDataEmptyOrAlmostEmpty(b.getBackupData()), false, 'draw-only data is meaningful cloud data');
  const file = JSON.parse(JSON.stringify(b.createBackupFile()));
  values.clear(); b.importBackupData(file.data);
  assert.deepEqual(b.getBackupData().challenges, data);
  const old = b.createBackupFile(); delete old.data.challenges.surpriseDays;
  b.importBackupData(old.data);
  assert.deepEqual(b.getBackupData().challenges.surpriseDays, data.surpriseDays, 'old backup cannot erase joker history');
  assert.equal((await sync.saveCloudBackupSafely('test-user')).status, 'success');
  const remote = await cloudApi.getCloudBackup('test-user');
  values.clear(); b.importBackupData(remote.data);
  assert.deepEqual(b.getBackupData().challenges, data);
  cloud.updated_at = '2099-01-01T00:00:00.000Z';
  assert.equal((await sync.saveCloudBackupSafely('test-user')).status, 'conflict');
  assert.equal(writes, 1);
});
