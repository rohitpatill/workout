import { DAYS, dayByDow } from '../data/plan.js';
import { MEALS, TARGETS } from '../data/diet.js';
import { dateKey, dayLog, peekDay, doneCount, body, addBody, save } from '../store.js';
import { fmtDate, bar, ICON, esc } from '../ui.js';

let pickedDow = null;

export function todayView(root) {
  const date = dateKey();
  const todayDow = new Date().getDay();
  if (pickedDow === null) pickedDow = todayDow;

  const paint = () => {
    const day = dayByDow(pickedDow);
    const log = peekDay(date);
    const eaten = MEALS.filter((m) => log?.meals?.[m.id]);
    const kcal = eaten.reduce((s, m) => s + m.kcal, 0);
    const protein = eaten.reduce((s, m) => s + m.p, 0);
    const water = log?.water ?? 0;
    const lastWeight = body().at(-1);

    let workout;
    if (day) {
      const total = day.items.reduce((s, i) => s + i.sets, 0);
      const done = day.items.reduce((s, i) => s + Math.min(i.sets, doneCount(date, i.ex)), 0);
      workout = `
        <a class="card link" href="#/day/${day.id}">
          <div class="row"><div><div class="eyebrow">${pickedDow === todayDow ? 'Today’s workout' : day.short + ' workout'}</div><h2>${esc(day.name)}</h2><p class="muted">${esc(day.focus)}</p></div>${ICON.chev}</div>
          ${bar(done, total)}
          <div class="row small"><span>${done} of ${total} sets done</span><b class="accent">${done === 0 ? 'Start' : done >= total ? 'Finished' : 'Continue'}</b></div>
        </a>`;
    } else {
      workout = `<div class="card"><div class="eyebrow">Sunday</div><h2>Rest day</h2><p class="muted">Take a 30–40 minute walk. No gym today.</p></div>`;
    }

    root.innerHTML = `
      <header class="top"><div class="eyebrow">${fmtDate()}</div><h1>Today</h1></header>
      <div class="chips" role="tablist">
        ${[...DAYS.map((d) => [d.dow, d.short]), [0, 'Sun']]
          .map(([dow, label]) => `<button class="chip ${dow === pickedDow ? 'on' : ''} ${dow === todayDow ? 'now' : ''}" data-dow="${dow}">${label}</button>`)
          .join('')}
      </div>
      ${workout}
      <a class="card link" href="#/diet">
        <div class="row"><div><div class="eyebrow">Diet</div><h2>${eaten.length} of ${MEALS.length} meals</h2></div>${ICON.chev}</div>
        <div class="duo">
          <div><div class="row small"><span>Calories</span><span>${kcal} / ${TARGETS.kcal}</span></div>${bar(kcal, TARGETS.kcal)}</div>
          <div><div class="row small"><span>Protein</span><span>${protein} / ${TARGETS.protein} g</span></div>${bar(protein, TARGETS.protein)}</div>
        </div>
      </a>
      <div class="card">
        <div class="row"><div><div class="eyebrow">Water</div><h2>${+((water * TARGETS.glassMl) / 1000).toFixed(2)} L <span class="muted">of ${(TARGETS.waterGlasses * TARGETS.glassMl) / 1000} L</span></h2></div>
          <div class="stepper"><button data-water="-1" aria-label="Remove a glass">−</button><button data-water="1" aria-label="Add a glass">+</button></div></div>
        ${bar(water, TARGETS.waterGlasses)}
        <p class="small muted">One tap is a 250 ml glass.</p>
      </div>
      <div class="card">
        <div class="eyebrow">Morning weight</div>
        <form class="row gap" id="wform">
          <input type="number" inputmode="decimal" step="0.1" min="40" max="250" name="w" placeholder="${lastWeight ? lastWeight.w : TARGETS.weightFrom}" aria-label="Weight in kg" />
          <span class="muted">kg</span>
          <button class="btn" type="submit">Save</button>
        </form>
        <p class="small muted">${lastWeight ? `Last: ${lastWeight.w} kg` : 'Weigh yourself after waking, before eating.'}</p>
      </div>
      <div class="card note"><b>Back check</b><p>Stand up and walk for 2 minutes every 30–40 minutes of sitting.</p></div>`;
  };

  root.onclick = (e) => {
    const chip = e.target.closest('[data-dow]');
    if (chip) {
      pickedDow = Number(chip.dataset.dow);
      paint();
      return;
    }
    const w = e.target.closest('[data-water]');
    if (w) {
      const log = dayLog(date);
      log.water = Math.max(0, log.water + Number(w.dataset.water));
      save();
      paint();
    }
  };
  root.onsubmit = (e) => {
    e.preventDefault();
    const w = parseFloat(new FormData(e.target).get('w'));
    if (!w) return;
    const prev = body().find((b) => b.d === date);
    addBody({ ...prev, d: date, w });
    paint();
  };
  paint();
  return () => {
    root.onclick = root.onsubmit = null;
  };
}
