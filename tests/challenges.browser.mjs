// Run against an isolated headless Chrome profile on port 9322 and the app on 3100.
// Uses native CDP/WebSocket support in Node, without adding a browser dependency.
import assert from 'node:assert/strict';
const appUrl = process.argv[2] ?? 'http://localhost:3100';
if (!/^http:\/\/localhost:\d+$/.test(appUrl)) throw new Error('Use an isolated localhost test origin.');

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
socket.addEventListener('close', () => {
  for (const callback of pending.values()) callback.reject(new Error('Browser connection closed'));
  pending.clear();
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
  await send('Page.navigate', { url: `${appUrl}/trajectoire` });
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
  assert.equal((await saved()).attempts[0].results, undefined);
  assert.equal(await evaluate(`document.querySelector('section[aria-label="Défis de progression"] > article details').open`), false, 'results closed by default');
  await click('Résultats obtenus');
  for (const [field, label] of Object.entries({conversations:'Conversations engagées', appointmentsProposed:'Rendez-vous proposés', appointmentsObtained:'Rendez-vous obtenus'})) {
    for (let i = 0; i < 2; i++) {
      await evaluate(`document.querySelector('button[aria-label^="Augmenter : ${label}"]').click()`);
      await waitFor(`JSON.parse(localStorage.getItem('taiji-life-plan-challenges')).attempts[0].results.${field} === ${i+1}`);
    }
    await evaluate(`document.querySelector('button[aria-label^="Diminuer : ${label}"]').click()`);
    await waitFor(`JSON.parse(localStorage.getItem('taiji-life-plan-challenges')).attempts[0].results.${field} === 1`);
  }
  assert.equal((await saved()).attempts[0].progress, 0, 'outcomes do not advance action counter');
  assert.ok(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`), 'open results fit mobile');
  assert.ok(await evaluate(`[...document.querySelectorAll('button[aria-label^="Augmenter :"],button[aria-label^="Diminuer :"]')].filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().height >= 44)`));
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
  assert.deepEqual((await saved()).attempts[0].results, { conversations:1, appointmentsProposed:1, appointmentsObtained:1 }, 'results survive reload');
  assert.equal(await evaluate(`document.querySelector('section[aria-label="Défis de progression"] > article details').open`), false, 'results closed again after reload');
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
  assert.ok(await evaluate(`(() => {
    const history = [...document.querySelectorAll('article')].find(a=>a.querySelector('strong')?.textContent === 'Aborder 3 nouvelles personnes');
    return history.textContent.includes('1 conversations · 1 RDV proposés · 1 RDV obtenus') && !history.querySelector('details').open;
  })()`), 'discreet results in archived history');
  await evaluate(`(() => {
    const history = [...document.querySelectorAll('article')].find(a=>a.querySelector('strong')?.textContent === 'Aborder 3 nouvelles personnes');
    history.querySelector('summary').click();
    history.querySelector('button[aria-label^="Augmenter : Rendez-vous obtenus"]').click();
  })()`);
  await waitFor(`JSON.parse(localStorage.getItem('taiji-life-plan-challenges')).attempts[0].results.appointmentsObtained === 2`);
  // Seed only this disposable profile, then ensure consulting never writes or activates.
  await evaluate(`(() => {
    const data = JSON.parse(localStorage.getItem('taiji-life-plan-challenges'));
    const first = data.attempts[0];
    const date = new Date();
    const today = date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0');
    data.attempts = Array.from({length:4}, (_, i) => ({...first, instanceId:'suggestion-'+i, date:today, endDate:today, target:3, progress:i<3?3:1, closed:true}));
    data.attempts.push({...first, instanceId:'ongoing', date:today, endDate:today, target:3, progress:0, closed:false});
    localStorage.setItem('taiji-life-plan-challenges', JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('taiji-life-plan-storage-changed', {detail:{key:'taiji-life-plan-challenges'}}));
  })()`);
  await waitFor(`document.querySelector('section[aria-label="Défis de progression"]').textContent.includes('3 de tes 4 derniers défis comparables')`);
  const beforeConsult = await saved();
  await click('Consulter le défi suggéré');
  await waitFor(`document.querySelector('form[aria-label="Aperçu du défi"]')?.textContent.includes('Progression')`);
  assert.deepEqual(await saved(), beforeConsult, 'consulting writes nothing and preserves current challenge/custom settings');
  assert.equal(await evaluate(`document.querySelector('form[aria-label="Aperçu du défi"] input').value`), '4');
  await click('Annuler');
  assert.deepEqual(await saved(), beforeConsult);
  await click('Résultats obtenus');
  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height:844, deviceScaleFactor:1, mobile:true });
    assert.ok(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`), `results fit ${width}px`);
  }
  // Irrelevant challenges must not display results even if a payload contains them.
  await evaluate(`(() => {
    const data=JSON.parse(localStorage.getItem('taiji-life-plan-challenges'));
    const ongoing=data.attempts.find(a=>a.instanceId==='ongoing');
    ongoing.id='focus-25'; ongoing.category='Discipline et productivité';
    localStorage.setItem('taiji-life-plan-challenges', JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('taiji-life-plan-storage-changed', {detail:{key:'taiji-life-plan-challenges'}}));
  })()`);
  await waitFor(`![...document.querySelector('section[aria-label="Défis de progression"] > article').querySelectorAll('summary')].some(s=>s.textContent.includes('Résultats obtenus'))`);
  // Surprise draws persist separately and create no attempt until accepted.
  const attemptsBeforeSurprise = (await saved()).attempts.length;
  await click('Surprends-moi');
  await waitFor(`document.querySelector('[aria-label="Défi Surprise"]').textContent.includes('J’accepte ce défi')`);
  const drawn = await saved();
  const drawDate = Object.keys(drawn.surpriseDays)[0];
  const firstDraw = drawn.surpriseDays[drawDate].offers[0].template.id;
  assert.equal(drawn.attempts.length, attemptsBeforeSurprise);
  await send('Page.reload');
  await waitFor(`document.querySelector('[aria-label="Défi Surprise"]')?.textContent.includes('J’accepte ce défi')`);
  assert.equal((await saved()).surpriseDays[drawDate].offers[0].template.id, firstDraw, 'refresh does not reroll');
  // Reduced-motion reveal skips both the waiting state and CSS animation.
  await send('Emulation.setEmulatedMedia', { features:[{name:'prefers-reduced-motion', value:'reduce'}] });
  await click('Utiliser mon joker');
  await waitFor(`JSON.parse(localStorage.getItem('taiji-life-plan-challenges')).surpriseDays['${drawDate}'].offers.length === 2`);
  assert.notEqual((await saved()).surpriseDays[drawDate].offers[1].template.id, firstDraw);
  assert.ok(!await evaluate(`document.querySelector('[aria-label="Défi Surprise"]').textContent.includes('Un petit pas à découvrir')`));
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[aria-label="Défi Surprise"] > div:last-child')).animationName`), 'none');
  await send('Page.reload');
  await waitFor(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Joker du jour utilisé') && b.disabled)`);
  await click('Refuser : impossible ou inadapté');
  assert.equal((await saved()).attempts.length, attemptsBeforeSurprise, 'refusal is not a failed attempt');
  await click('Chercher une alternative exceptionnelle');
  await waitFor(`JSON.parse(localStorage.getItem('taiji-life-plan-challenges')).surpriseDays['${drawDate}'].offers.length === 3`);
  const finalDraw = (await saved()).surpriseDays[drawDate];
  assert.equal(new Set(finalDraw.offers.map(o=>o.template.id)).size, 3);
  for (const width of [320,390]) {
    await send('Emulation.setDeviceMetricsOverride', {width,height:844,deviceScaleFactor:1,mobile:true});
    assert.ok(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`), `surprise reveal fits ${width}px`);
  }
  await click('J’accepte ce défi');
  await waitFor(`JSON.parse(localStorage.getItem('taiji-life-plan-challenges')).attempts.length === ${attemptsBeforeSurprise+1}`);
  const accepted = await saved();
  assert.equal(accepted.attempts.at(-1).id, finalDraw.offers.at(-1).template.id);
  assert.equal(accepted.surpriseDays[drawDate].offers.at(-1).status, 'accepted');
  assert.equal(accepted.attempts.filter(a=>a.slot==='main'&&!a.closed).length, 1);
  assert.ok(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`), 'no overflow on 390px screen');
  assert.ok(await evaluate(`[...document.querySelectorAll('section[aria-label="Défis de progression"] button')].filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().height >= 44)`), 'comfortable touch controls');
  assert.deepEqual(errors, [], 'no browser exceptions');
  console.log('Browser PASS: actions/results/history/91B; Surprise reveal, persistent draw and joker, no attempt before acceptance, refusal/alternative, voluntary activation, reduced motion, 320px/390px mobile.');
} finally {
  await send('Browser.close').catch(() => {});
  socket.close();
}
