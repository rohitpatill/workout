import { ICON } from './ui.js';
import { mountTimer } from './timer.js';
import { todayView } from './views/today.js';
import { planView, dayView } from './views/workout.js';
import { exerciseView } from './views/exercise.js';
import { dietView } from './views/diet.js';
import { progressView } from './views/progress.js';
import { debugView } from './views/debug.js';

// Hash routes. To add a screen: write a view (root, params, query) => optional cleanup fn,
// and register it here.
const ROUTES = [
  [/^\/$/, todayView, 'today'],
  [/^\/plan$/, planView, 'workout'],
  [/^\/day\/([\w-]+)$/, dayView, 'workout'],
  [/^\/ex\/([\w-]+)$/, exerciseView, 'workout'],
  [/^\/diet$/, dietView, 'diet'],
  [/^\/progress$/, progressView, 'progress'],
  [/^\/debug$/, debugView, ''],
];

const TABS = [
  ['today', '#/', 'Today'],
  ['workout', '#/plan', 'Workout'],
  ['diet', '#/diet', 'Diet'],
  ['progress', '#/progress', 'Progress'],
];

const app = document.getElementById('app');
app.innerHTML = `<main id="view"></main><div id="dock"></div><nav class="tabs">${TABS.map(
  ([id, href, label]) => `<a href="${href}" data-tab="${id}">${ICON[id]}<span>${label}</span></a>`,
).join('')}</nav>`;
const view = document.getElementById('view');
mountTimer(document.getElementById('dock'));

let cleanup = null;

function route() {
  const [path, qs = ''] = (location.hash.slice(1) || '/').split('?');
  const query = Object.fromEntries(new URLSearchParams(qs));
  cleanup?.();
  cleanup = null;
  for (const [re, fn, tab] of ROUTES) {
    const m = path.match(re);
    if (!m) continue;
    view.innerHTML = '';
    window.scrollTo(0, 0);
    cleanup = fn(view, m.slice(1), query) ?? null;
    app.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
    return;
  }
  location.hash = '#/';
}

window.addEventListener('hashchange', route);
route();
