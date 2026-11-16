// All tracking data lives in localStorage on the device. Shape:
// { days: { 'YYYY-MM-DD': { sets: { exId: [{ w, r, done }] }, meals: {}, supp: {}, water: 0 } },
//   body: [{ d: 'YYYY-MM-DD', w: kg, waist: cm }] }
const KEY = 'gym.v1';

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { days: raw.days ?? {}, body: raw.body ?? [] };
  } catch {
    return { days: {}, body: [] };
  }
}

let state = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: the app still works for this visit */
  }
}

export const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function dayLog(date = dateKey()) {
  const log = (state.days[date] ??= {});
  log.sets ??= {};
  log.meals ??= {};
  log.supp ??= {};
  log.water ??= 0;
  return log;
}

export const peekDay = (date) => state.days[date];

// Most recent earlier session of an exercise that has at least one completed set.
export function lastSets(exId, before = dateKey()) {
  const dates = Object.keys(state.days)
    .filter((d) => d < before)
    .sort()
    .reverse();
  for (const d of dates) {
    const sets = state.days[d].sets?.[exId]?.filter((s) => s.done);
    if (sets?.length) return { date: d, sets };
  }
  return null;
}

export const doneCount = (date, exId) => state.days[date]?.sets?.[exId]?.filter((s) => s.done).length ?? 0;

export const body = () => state.body.slice().sort((a, b) => (a.d < b.d ? -1 : 1));

export function addBody(entry) {
  state.body = state.body.filter((e) => e.d !== entry.d);
  state.body.push(entry);
  save();
}

export function removeBody(d) {
  state.body = state.body.filter((e) => e.d !== d);
  save();
}

export function trainedDates() {
  return Object.keys(state.days)
    .filter((d) => Object.values(state.days[d].sets ?? {}).some((sets) => sets.some((s) => s.done)))
    .sort();
}

export const exportData = () => JSON.stringify(state, null, 2);

export function importData(json) {
  const data = JSON.parse(json);
  if (typeof data !== 'object' || !data || typeof data.days !== 'object') throw new Error('Not a Gym Plan backup file');
  state = { days: data.days, body: Array.isArray(data.body) ? data.body : [] };
  save();
}
