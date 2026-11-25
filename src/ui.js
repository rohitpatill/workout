export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const fmtDate = (d = new Date()) => d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
export const fmtShort = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

const svg = (path) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
export const ICON = {
  today: svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
  workout: svg('<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>'),
  diet: svg('<path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-2 2-2 7 0 9v9"/>'),
  progress: svg('<path d="M4 20V4M4 20h16M8 15l3-4 3 2 4-6"/>'),
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  chev: svg('<path d="M9 5l7 7-7 7"/>'),
  check: svg('<path d="M5 12l5 5 9-10"/>'),
  play: svg('<path d="M7 4l13 8-13 8z" fill="currentColor"/>'),
  pause: svg('<path d="M7 4v16M17 4v16"/>'),
  expand: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  reset: svg('<path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5"/>'),
};

export const bar = (value, max) => `<div class="bar"><i style="width:${Math.min(100, max ? (value / max) * 100 : 0)}%"></i></div>`;
