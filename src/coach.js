// Weight suggestions: what to load today, and whether to go up, stay or drop after each set.
// The method is double progression: keep one weight until every set reaches the top of the
// rep range, then add the smallest jump.
import { LOADS, PER_LABEL } from './data/loads.js';

const fmt = (n) => String(+n.toFixed(2));

// "8–10" -> [8, 10], "12" -> [12, 12], "near failure" -> null
export function repRange(reps) {
  const m = String(reps).match(/^(\d+)(?:\s*[–-]\s*(\d+))?/);
  return m ? [Number(m[1]), Number(m[2] ?? m[1])] : null;
}

// Short label for lists, for example "14–18 kg each hand".
export function loadLabel(exId, last) {
  const load = LOADS[exId];
  if (!load?.kg) return '';
  const w = last?.sets.find((s) => s.w != null)?.w;
  if (w != null) return `last ${fmt(w)} kg`;
  return `${fmt(load.kg[0])}–${fmt(load.kg[1])} ${PER_LABEL[load.per]}`;
}

// Returns { header, sets: [{ w, hint }] } where w is the suggested weight for that set as a
// string (a single number, or a range on the very first session) and hint explains a change.
export function coach(exId, item, last, saved, rows) {
  const load = LOADS[exId];
  if (!load) return { header: '', sets: [] };
  if (!load.kg) return { header: load.note ?? '', sets: Array.from({ length: rows }, () => ({ w: '', hint: '' })) };

  const range = repRange(item.reps);
  const [lo, hi] = range ?? [0, Infinity];
  const unit = PER_LABEL[load.per];
  const step = load.step;
  const done = last?.sets.filter((s) => s.w != null) ?? [];
  let base;
  let header;

  if (!done.length) {
    base = `${fmt(load.kg[0])}–${fmt(load.kg[1])}`;
    header = `First session: start with ${base} ${unit}. Pick a weight that leaves about 3 reps in reserve.`;
  } else {
    const w0 = done[0].w;
    const reps = done.map((s) => s.r).filter((r) => r != null);
    const allTop = range && reps.length >= item.sets && reps.every((r) => r >= hi);
    const short = range && reps.some((r) => r < lo);
    if (load.hold) {
      base = fmt(w0);
      header = `Last time: ${base} ${unit}.`;
    } else if (allTop) {
      base = fmt(w0 + step);
      header = `You reached ${hi} reps on every set last time. Go up to ${base} ${unit}.`;
    } else if (short) {
      base = fmt(reps[0] < lo ? Math.max(0, w0 - step) : w0);
      header = `Some sets fell short of ${lo} reps last time. Use ${base} ${unit} and aim for ${lo} or more on every set.`;
    } else {
      base = fmt(w0);
      header = `Same weight as last time: ${base} ${unit}. Try to add a rep to each set.`;
    }
  }
  if (load.note) header += ` ${load.note}`;

  const sets = [];
  for (let i = 0; i < rows; i++) {
    const prev = saved[i - 1];
    let w = i === 0 ? base : (sets[i - 1].w ?? base);
    let hint = '';
    if (prev?.done && prev.w != null) {
      w = fmt(prev.w);
      if (load.hold) {
        hint = `Keep ${w} kg for every set today.`;
      } else if (range && prev.r != null) {
        if (prev.r >= hi + 2) {
          w = fmt(prev.w + step);
          hint = `Set ${i} was easy (${prev.r} reps). Go up to ${w} kg.`;
        } else if (prev.r < lo) {
          w = fmt(Math.max(0, prev.w - step));
          hint = `Set ${i} fell short (${prev.r} reps). Drop to ${w} kg.`;
        } else {
          hint = `Set ${i} was on target. Stay at ${w} kg.`;
        }
      }
    }
    sets.push({ w, hint });
  }
  return { header, sets };
}
