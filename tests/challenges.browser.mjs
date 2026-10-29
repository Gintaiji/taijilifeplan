// Run against an isolated headless Chrome profile on port 9322 and the app on 3100.
// Uses native CDP/WebSocket support in Node, without adding a browser dependency.
import assert from 'node:assert/strict';

const targets = await (await fetch('http://127.0.0.1:9322/json/list')).json();
const target = targets.find((t) => t.type === 'page');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
const errors = [];
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  if (!message.id) return;
  const callback = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) callback.reject(new Error(JSON.stringify(message.error)));
  else callback.resolve(message.result);
});
function send(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function waitFor(expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${expression}`);
}
async function click(text) {
  const clicked = await evaluate(`(() => {
    const el = [...document.querySelectorAll('button,summary')].find(e => e.textContent.includes(${JSON.stringify(text)}));
    if (!el) return false; el.click(); return true;
  })()`);
  assert.ok(clicked, `Control found: ${text}`);
}
async function fill(selector, value) {
  await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
  })()`);
}
const saved = () => evaluate(`JSON.parse(localStorage.getItem('taiji-life-plan-challenges'))`);

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:3100/trajectoire' });
  await waitFor(`document.querySelector('section[aria-label="Défis de progression"]')`);
  await evaluate('localStorage.clear()');
  await send('Page.reload');
  await waitFor(`document.querySelector('section[aria-label="Défis de progression"]') && !document.querySelector('section[aria-label="Défis de progression"]').getAttribute('aria-busy').includes('true')`);
  assert.equal(await evaluate(`localStorage.getItem('taiji-life-plan-challenges')`), null, 'mount never writes empty challenges');
  assert.equal(await evaluate(`document.querySelectorAll('#accomplishedToday,#notDoneToday,#decideForTomorrow').length`), 3);
  await click('Choisir un défi');
  await click('Aborder 3 nouvelles personnes');
  await click('Commencer ce défi');
  await waitFor(`document.querySelector('output')`);
  assert.equal((await saved()).attempts.length, 1);
  for (let i = 0; i < 3; i++) {
    await evaluate(`document.querySelector('button[aria-label^="Augmenter"]').click()`);
    await waitFor(`document.querySelector('output').textContent.startsWith('${i + 1} /')`);
  }
  assert.equal((await saved()).attempts[0].progress, 3);
  assert.ok(await evaluate(`document.querySelector('section[aria-label="Défis de progression"]').textContent.includes('Terminé')`));
  await click('Ajuster la cible');
  await fill('input[name="target"]', '5');
  await click('Modifier la cible');
  await waitFor(`document.querySelector('output').textContent.includes('/ 5')`);
  await evaluate(`document.querySelector('button[aria-label^="Diminuer"]').click()`);
  await waitFor(`document.querySelector('output').textContent.startsWith('2 / 5')`);
  await fill('section[aria-label="Défis de progression"] textarea', 'J’ai appris à oser.');
  await waitFor(`JSON.parse(localStorage.getItem('taiji-life-plan-challenges')).attempts[0].note === 'J’ai appris à oser.'`);
  await send('Page.reload');
  await waitFor(`document.querySelector('output')?.textContent.startsWith('2 / 5')`);
  await click('Choisir un défi');
  await click('Créer un défi personnalisé');
  await fill('input[name="title"]', 'Mon défi navigateur');
  await fill('input[name="description"]', 'Une petite action concrète.');
  await fill('input[name="unit"]', 'actions');
  await fill('textarea[name="criterion"]', 'Réaliser une action et noter son résultat.');
  await click('Créer le modèle');
  await click('Commencer ce défi');
  await waitFor(`JSON.parse(localStorage.getItem('taiji-life-plan-challenges')).attempts.length === 2`);
  assert.equal((await saved()).attempts[0].closed, true);
  assert.equal((await saved()).customTemplates[0].title, 'Mon défi navigateur');
  await click('Revoir mes progrès');
  assert.ok(await evaluate(`document.querySelector('section[aria-label="Défis de progression"]').textContent.includes('J’ai appris à oser.')`));
  assert.ok(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`), 'no overflow on 390px screen');
  assert.ok(await evaluate(`[...document.querySelectorAll('section[aria-label="Défis de progression"] button')].filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().height >= 44)`), 'comfortable touch controls');
  assert.deepEqual(errors, [], 'no browser exceptions');
  console.log('Browser PASS: choose, counter +/−, target, completion, reflection, reload, custom creation, replacement/history, 390px mobile, touch controls.');
} finally {
  await send('Browser.close').catch(() => {});
  socket.close();
}
