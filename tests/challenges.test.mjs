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
const s = load('app/utils/storage.ts');
const b = load('app/utils/backup.ts');
const cloudApi = load('app/utils/cloudBackup.ts');
const sync = load('app/utils/cloudSyncStatus.ts');
const today = '2026-10-29';
const template = c.CHALLENGE_TEMPLATES[0];
function attempted() { return c.startChallenge(c.emptyChallenges(), template, 'main', 3, today, 'attempt-1'); }
function saveAttempt() { s.setStorage(s.STORAGE_KEYS.challenges, attempted()); }
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
