import { EXERCISES, videoUrl } from '../data/exercises.js';
import { WARMUP, dayById } from '../data/plan.js';
import { dateKey, dayLog, peekDay, lastSets, save } from '../store.js';
import { createViewer } from '../three/viewer.js';
import { startRest } from '../timer.js';
import { ICON, esc, fmtShort } from '../ui.js';

// Which inputs a set row shows, by exercise unit.
const FIELDS = {
  kg: [['w', 'kg', 2.5], ['r', 'reps', 1]],
  reps: [['r', 'reps', 1]],
  sec: [['r', 'sec', 5]],
  min: [['r', 'min', 1]],
};

export function exerciseView(root, [id], query) {
  const ex = EXERCISES[id];
  if (!ex) {
    location.hash = '#/plan';
    return;
  }
  const items = query.d === 'warmup' ? WARMUP : (dayById(query.d)?.items ?? []);
  const idx = items.findIndex((i) => i.ex === id);
  const item = items[idx] ?? { sets: 3, reps: '10', rest: 60 };
  const prev = items[idx - 1];
  const next = items[idx + 1];
  const date = dateKey();
  const unit = ex.unit ?? 'kg';
  const fields = FIELDS[unit];
  const last = lastSets(id, date);

  root.innerHTML = `
    <header class="top with-back"><button class="back" data-a="back" aria-label="Back">${ICON.back}</button><div><div class="eyebrow">${esc(ex.muscles)}</div><h1>${esc(ex.name)}</h1></div></header>
    <div class="viewer">
      <div class="canvas"></div>
      <div class="cue"></div>
      <div class="vctl">
        <button data-a="play" aria-label="Pause or play">${ICON.pause}</button>
        <button data-a="speed" aria-label="Change speed">1×</button>
        <button data-a="reset" aria-label="Reset view">${ICON.reset}</button>
      </div>
      <div class="vhint">Drag to rotate</div>
    </div>
    <div class="target"><b>${item.sets} × ${esc(item.reps)}</b>${item.rest ? `<span>Rest ${item.rest} s</span>` : ''}<span>${esc(ex.equip)}</span></div>
    <section class="card" id="logger"></section>
    <section class="card"><h3>How to do it</h3><ol class="steps">${ex.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></section>
    <section class="card"><h3>Avoid</h3><ul class="avoid">${ex.avoid.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>
    ${ex.back ? `<section class="card note"><b>For your back</b><p>${esc(ex.back)}</p></section>` : ''}
    <a class="btn ghost wide" href="${videoUrl(ex.name)}" target="_blank" rel="noopener">Watch a real video demo</a>
    <div class="row gap nav2">
      ${prev ? `<a class="btn ghost" href="#/ex/${prev.ex}?d=${query.d}">${ICON.back} Previous</a>` : '<span></span>'}
      ${next ? `<a class="btn" href="#/ex/${next.ex}?d=${query.d}">Next: ${esc(EXERCISES[next.ex].name)} ${ICON.chev}</a>` : `<a class="btn" href="${query.d && query.d !== 'warmup' ? '#/day/' + query.d : '#/plan'}">Finish</a>`}
    </div>`;

  const cueEl = root.querySelector('.cue');
  const viewer = createViewer(root.querySelector('.canvas'), ex.anim, {
    highlight: ex.hl,
    onPhase: (p) => {
      cueEl.textContent = ex.cue[p];
      cueEl.classList.toggle('down', p === 1);
    },
  });

  const logger = root.querySelector('#logger');
  const rows = () => {
    const saved = peekDay(date)?.sets?.[id] ?? [];
    return Math.max(item.sets, saved.length);
  };
  const ghost = (i, key) => {
    const s = last?.sets[Math.min(i, last.sets.length - 1)];
    return s?.[key] ?? '';
  };
  const paintLogger = () => {
    const saved = peekDay(date)?.sets?.[id] ?? [];
    logger.innerHTML = `
      <div class="row"><h3>Log your sets</h3><span class="small muted">${last ? `Last time (${fmtShort(last.date)}): ${last.sets.map((s) => (unit === 'kg' ? `${s.w ?? '–'}×${s.r ?? '–'}` : (s.r ?? '–'))).join(', ')}` : 'First session'}</span></div>
      ${Array.from({ length: rows() }, (_, i) => {
        const s = saved[i] ?? {};
        return `<div class="set ${s.done ? 'done' : ''}" data-i="${i}">
          <span class="setn">${i + 1}</span>
          ${fields.map(([key, label, step]) => `<label><input type="number" inputmode="decimal" step="${step}" min="0" data-k="${key}" value="${s[key] ?? ''}" placeholder="${ghost(i, key)}" /><span>${label}</span></label>`).join('')}
          <button class="tick" data-a="done" aria-label="Mark set ${i + 1} done" aria-pressed="${!!s.done}">${ICON.check}</button>
        </div>`;
      }).join('')}
      <button class="btn ghost small" data-a="add">+ Add set</button>`;
  };
  const setAt = (i) => {
    const sets = (dayLog(date).sets[id] ??= []);
    while (sets.length <= i) sets.push({});
    return sets[i];
  };
  paintLogger();

  let playing = true;
  let speed = 1;
  root.onclick = (e) => {
    const btn = e.target.closest('[data-a]');
    if (!btn) return;
    const a = btn.dataset.a;
    if (a === 'back') history.length > 1 ? history.back() : (location.hash = '#/plan');
    else if (a === 'play') {
      playing = !playing;
      viewer.setPlaying(playing);
      btn.innerHTML = playing ? ICON.pause : ICON.play;
    } else if (a === 'speed') {
      speed = speed === 1 ? 0.5 : 1;
      viewer.setSpeed(speed);
      btn.textContent = speed === 1 ? '1×' : '½×';
    } else if (a === 'reset') viewer.resetView();
    else if (a === 'add') {
      setAt(rows());
      save();
      paintLogger();
    } else if (a === 'done') {
      const row = btn.closest('.set');
      const i = Number(row.dataset.i);
      const s = setAt(i);
      // An empty field takes the value from last session, so one tap repeats it.
      for (const input of row.querySelectorAll('input')) {
        const v = parseFloat(input.value || input.placeholder);
        if (!Number.isNaN(v)) s[input.dataset.k] = v;
      }
      s.done = !s.done;
      save();
      paintLogger();
      if (s.done) startRest(item.rest);
    }
  };
  root.onchange = (e) => {
    const input = e.target.closest('.set input');
    if (!input) return;
    const s = setAt(Number(input.closest('.set').dataset.i));
    const v = parseFloat(input.value);
    if (Number.isNaN(v)) delete s[input.dataset.k];
    else s[input.dataset.k] = v;
    save();
  };

  return () => {
    viewer.dispose();
    root.onclick = root.onchange = null;
  };
}
