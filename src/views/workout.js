import { DAYS, WARMUP, BACK_RULES, dayById } from '../data/plan.js';
import { EXERCISES } from '../data/exercises.js';
import { dateKey, doneCount } from '../store.js';
import { ICON, esc } from '../ui.js';

export function planView(root) {
  const todayDow = new Date().getDay();
  root.innerHTML = `
    <header class="top"><div class="eyebrow">6 days on, Sunday off</div><h1>Workout plan</h1></header>
    ${DAYS.map(
      (d) => `
      <a class="card link ${d.dow === todayDow ? 'today' : ''}" href="#/day/${d.id}">
        <div class="row"><div><div class="eyebrow">${d.short}${d.dow === todayDow ? ' · today' : ''}</div><h2>${esc(d.name)}</h2><p class="muted">${esc(d.focus)} · ${d.items.length} exercises</p></div>${ICON.chev}</div>
      </a>`,
    ).join('')}
    <div class="card"><div class="eyebrow">Sun</div><h2>Rest</h2><p class="muted">30–40 minute walk.</p></div>
    <div class="card note"><b>Rules</b><ul>${BACK_RULES.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
}

const exRow = (item, dayId, date, n) => {
  const ex = EXERCISES[item.ex];
  const done = Math.min(item.sets, doneCount(date, item.ex));
  return `
    <a class="ex-row" href="#/ex/${item.ex}?d=${dayId}">
      <span class="num ${done >= item.sets ? 'done' : ''}">${done >= item.sets ? ICON.check : n}</span>
      <span class="grow"><b>${esc(ex.name)}</b><span class="muted small">${item.sets} × ${esc(item.reps)}${done && done < item.sets ? ` · ${done} done` : ''}</span></span>
      ${ICON.chev}
    </a>`;
};

export function dayView(root, [id]) {
  const day = dayById(id);
  if (!day) {
    location.hash = '#/plan';
    return;
  }
  const date = dateKey();
  root.innerHTML = `
    <header class="top with-back"><a class="back" href="#/plan" aria-label="Back to plan">${ICON.back}</a><div><div class="eyebrow">${day.short} · about 60 minutes</div><h1>${esc(day.name)}</h1></div></header>
    <p class="muted lead">${esc(day.focus)}. Tap an exercise to see how to do it and log your sets.</p>
    <h3>Warm-up · 5 minutes</h3>
    <div class="card list">${WARMUP.map((w, i) => exRow(w, 'warmup', date, i + 1)).join('')}</div>
    <h3>Workout</h3>
    <div class="card list">${day.items.map((it, i) => exRow(it, day.id, date, i + 1)).join('')}</div>`;
}
