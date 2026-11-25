import { EXERCISES, videoUrl } from '../data/exercises.js';
import { WARMUP, dayById } from '../data/plan.js';
import { dateKey, dayLog, peekDay, lastSets, save } from '../store.js';
import { createViewer } from '../three/viewer.js';
import { startRest } from '../timer.js';
import { coach, repRange } from '../coach.js';
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
      <div class="vzoom">
        <button data-a="zin" aria-label="Zoom in">+</button>
        <button data-a="zout" aria-label="Zoom out">−</button>
      </div>
      <div class="vctl">
        <button data-a="play" aria-label="Pause or play">${ICON.pause}</button>
        <button data-a="speed" aria-label="Change speed">1×</button>
        <button data-a="view" class="wide" aria-label="Change camera angle">3D</button>
        <button data-a="full" aria-label="Full screen view">${ICON.expand}</button>
      </div>
      <div class="vhint">Swipe sideways to rotate</div>
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
    const n = rows();
    const plan = coach(id, item, last, saved, n);
    const range = repRange(item.reps);
    let current = saved.findIndex((s) => !s?.done);
    if (current < 0) current = saved.length;
    logger.innerHTML = `
      <div class="row"><h3>Log your sets</h3><span class="small muted">${last ? `Last time (${fmtShort(last.date)}): ${last.sets.map((s) => (unit === 'kg' ? `${s.w ?? '–'}×${s.r ?? '–'}` : (s.r ?? '–'))).join(', ')}` : 'First session'}</span></div>
      ${plan.header ? `<p class="coach">${esc(plan.header)}</p>` : ''}
      ${Array.from({ length: n }, (_, i) => {
        const s = saved[i] ?? {};
        const ph = (key) => (key === 'w' ? (plan.sets[i]?.w ?? '') : ghost(i, key) || (unit === 'kg' && range ? (range[0] === range[1] ? range[0] : `${range[0]}–${range[1]}`) : ''));
        const hint = i === current && i < n ? plan.sets[i]?.hint : '';
        return `${hint ? `<p class="hint">${esc(hint)}</p>` : ''}<div class="set ${s.done ? 'done' : ''}" data-i="${i}">
          <span class="setn">${i + 1}</span>
          ${fields.map(([key, label, step]) => `<label><input type="number" inputmode="decimal" step="${step}" min="0" data-k="${key}" value="${s[key] ?? ''}" placeholder="${ph(key)}" /><span>${label}</span></label>`).join('')}
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
  let full = false;
  let viewIdx = 0;
  const VIEWS = [['default', '3D'], ['front', 'Front'], ['side', 'Side'], ['back', 'Back'], ['top', 'Top']];
  const viewerEl = root.querySelector('.viewer');
  const setFull = (v) => {
    full = v;
    viewerEl.classList.toggle('full', v);
    document.body.classList.toggle('noscroll', v);
    viewer.setFull(v);
    viewerEl.querySelector('[data-a="full"]').innerHTML = v ? ICON.close : ICON.expand;
    viewerEl.querySelector('.vhint').textContent = v ? 'Drag to rotate · pinch to zoom' : 'Swipe sideways to rotate';
  };
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
    } else if (a === 'view') {
      viewIdx = (viewIdx + 1) % VIEWS.length;
      viewer.setView(VIEWS[viewIdx][0]);
      btn.textContent = VIEWS[viewIdx][1];
    } else if (a === 'full') setFull(!full);
    else if (a === 'zin') viewer.zoom(0.8);
    else if (a === 'zout') viewer.zoom(1.25);
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
        // A suggested range such as "14–18" is not a value; only a single number is.
        const text = input.value || (/^\d+(\.\d+)?$/.test(input.placeholder) ? input.placeholder : '');
        const v = parseFloat(text);
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
    document.body.classList.remove('noscroll');
    viewer.dispose();
    root.onclick = root.onchange = null;
  };
}
