import { MEALS, TARGETS, SUPPLEMENTS, DIET_RULES } from '../data/diet.js';
import { dateKey, dayLog, peekDay, save } from '../store.js';
import { bar, ICON, esc } from '../ui.js';

export function dietView(root) {
  const date = dateKey();
  const paint = () => {
    const log = peekDay(date);
    const eaten = MEALS.filter((m) => log?.meals?.[m.id]);
    const kcal = eaten.reduce((s, m) => s + m.kcal, 0);
    const protein = eaten.reduce((s, m) => s + m.p, 0);
    root.innerHTML = `
      <header class="top"><div class="eyebrow">About ${TARGETS.kcal} kcal · ${TARGETS.protein} g protein</div><h1>Diet</h1></header>
      <div class="card">
        <div class="duo">
          <div><div class="row small"><span>Calories</span><span>${kcal} / ${TARGETS.kcal}</span></div>${bar(kcal, TARGETS.kcal)}</div>
          <div><div class="row small"><span>Protein</span><span>${protein} / ${TARGETS.protein} g</span></div>${bar(protein, TARGETS.protein)}</div>
        </div>
      </div>
      ${MEALS.map((m) => {
        const on = !!log?.meals?.[m.id];
        return `
        <div class="card meal ${on ? 'done' : ''}">
          <div class="row"><div><h2>${esc(m.name)}</h2><p class="small muted">${m.kcal} kcal · ${m.p} g protein</p></div>
            <button class="tick" data-meal="${m.id}" aria-pressed="${on}" aria-label="Mark ${esc(m.name)} eaten">${ICON.check}</button></div>
          <ul>${m.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
          <p class="small muted">${esc(m.swap)}</p>
        </div>`;
      }).join('')}
      <div class="card">
        <h3>Supplements</h3>
        ${SUPPLEMENTS.map((s) => {
          const on = !!log?.supp?.[s.id];
          return `<div class="row supp ${on ? 'done' : ''}"><span>${esc(s.name)}</span><button class="tick" data-supp="${s.id}" aria-pressed="${on}" aria-label="Mark ${esc(s.name)} taken">${ICON.check}</button></div>`;
        }).join('')}
      </div>
      <div class="card note"><b>Rules</b><ul>${DIET_RULES.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
  };
  root.onclick = (e) => {
    const meal = e.target.closest('[data-meal]');
    const supp = e.target.closest('[data-supp]');
    if (!meal && !supp) return;
    const log = dayLog(date);
    if (meal) log.meals[meal.dataset.meal] = !log.meals[meal.dataset.meal];
    else log.supp[supp.dataset.supp] = !log.supp[supp.dataset.supp];
    save();
    const y = window.scrollY;
    paint();
    window.scrollTo(0, y);
  };
  paint();
  return () => {
    root.onclick = null;
  };
}
