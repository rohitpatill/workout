import { TARGETS } from '../data/diet.js';
import { dateKey, body, addBody, removeBody, trainedDates, exportData, importData } from '../store.js';
import { esc, fmtShort } from '../ui.js';

function chart(entries) {
  if (entries.length < 2) return '<p class="muted small">Add at least two weigh-ins to see your trend.</p>';
  const W = 320;
  const H = 150;
  const pad = 26;
  const ws = entries.map((e) => e.w);
  const lo = Math.min(...ws, TARGETS.weightGoal[0]) - 1;
  const hi = Math.max(...ws, TARGETS.weightGoal[1]) + 1;
  const x = (i) => pad + (i / (entries.length - 1)) * (W - pad - 8);
  const y = (w) => 8 + ((hi - w) / (hi - lo)) * (H - 28);
  const pts = entries.map((e, i) => `${x(i).toFixed(1)},${y(e.w).toFixed(1)}`).join(' ');
  const last = entries.at(-1);
  return `
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend from ${entries[0].w} to ${last.w} kg">
      <rect x="${pad}" y="${y(TARGETS.weightGoal[1])}" width="${W - pad - 8}" height="${y(TARGETS.weightGoal[0]) - y(TARGETS.weightGoal[1])}" class="goal" />
      <text x="${W - 10}" y="${y(TARGETS.weightGoal[1]) + 12}" text-anchor="end" class="lbl">goal ${TARGETS.weightGoal[0]}–${TARGETS.weightGoal[1]} kg</text>
      <text x="2" y="${y(hi - 1) + 4}" class="lbl">${Math.round(hi - 1)}</text>
      <text x="2" y="${y(lo + 1) + 4}" class="lbl">${Math.round(lo + 1)}</text>
      <polyline points="${pts}" class="line" />
      ${entries.map((e, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(e.w).toFixed(1)}" r="${i === entries.length - 1 ? 4 : 2.5}" class="dot" />`).join('')}
      <text x="${pad}" y="${H - 4}" class="lbl">${fmtShort(entries[0].d)}</text>
      <text x="${W - 8}" y="${H - 4}" text-anchor="end" class="lbl">${fmtShort(last.d)}</text>
    </svg>`;
}

function weekStart() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dateKey(d);
}

export function progressView(root) {
  let message = '';
  const paint = () => {
    const entries = body();
    const first = entries[0];
    const last = entries.at(-1);
    const trained = trainedDates();
    const thisWeek = trained.filter((d) => d >= weekStart()).length;
    const change = first && last ? +(last.w - first.w).toFixed(1) : null;
    root.innerHTML = `
      <header class="top"><div class="eyebrow">Goal: ${TARGETS.weightGoal[0]}–${TARGETS.weightGoal[1]} kg</div><h1>Progress</h1></header>
      <div class="stats">
        <div class="card"><b>${last ? last.w : '–'}</b><span>kg now</span></div>
        <div class="card"><b>${change === null ? '–' : (change > 0 ? '+' : '') + change}</b><span>kg change</span></div>
        <div class="card"><b>${thisWeek}/6</b><span>this week</span></div>
        <div class="card"><b>${trained.length}</b><span>workouts</span></div>
      </div>
      <div class="card"><h3>Weight</h3>${chart(entries)}</div>
      <div class="card">
        <h3>Add a measurement</h3>
        <form id="bform" class="grid3">
          <label><span>Date</span><input type="date" name="d" value="${dateKey()}" max="${dateKey()}" required /></label>
          <label><span>Weight (kg)</span><input type="number" inputmode="decimal" step="0.1" min="40" max="250" name="w" required /></label>
          <label><span>Waist (cm)</span><input type="number" inputmode="decimal" step="0.5" min="40" max="200" name="waist" /></label>
          <button class="btn" type="submit">Save</button>
        </form>
      </div>
      ${
        entries.length
          ? `<div class="card"><h3>History</h3>${entries
              .slice()
              .reverse()
              .slice(0, 30)
              .map((e) => `<div class="row hist"><span>${fmtShort(e.d)}</span><span><b>${e.w} kg</b>${e.waist ? ` · ${e.waist} cm waist` : ''}</span><button class="del" data-del="${e.d}" aria-label="Delete entry for ${fmtShort(e.d)}">×</button></div>`)
              .join('')}</div>`
          : ''
      }
      <div class="card">
        <h3>Backup</h3>
        <p class="small muted">Your data is stored only in this browser on this device. Export a backup now and then.</p>
        <div class="row gap"><button class="btn ghost" data-a="export">Export</button><label class="btn ghost">Import<input type="file" accept="application/json,.json" hidden /></label></div>
        ${message ? `<p class="small">${esc(message)}</p>` : ''}
      </div>`;
  };

  root.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const entry = { d: f.get('d'), w: parseFloat(f.get('w')) };
    const waist = parseFloat(f.get('waist'));
    if (!Number.isNaN(waist)) entry.waist = waist;
    if (!entry.d || Number.isNaN(entry.w)) return;
    addBody(entry);
    paint();
  };
  root.onclick = (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      if (confirm(`Delete the entry for ${fmtShort(del.dataset.del)}?`)) {
        removeBody(del.dataset.del);
        paint();
      }
      return;
    }
    if (e.target.closest('[data-a="export"]')) {
      const url = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `gym-backup-${dateKey()}.json` });
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  root.onchange = async (e) => {
    const file = e.target.matches('input[type=file]') && e.target.files[0];
    if (!file) return;
    if (!confirm('Importing replaces all data currently in this app. Continue?')) return;
    try {
      importData(await file.text());
      message = 'Backup imported.';
    } catch (err) {
      message = `Import failed: ${err.message}`;
    }
    paint();
  };
  paint();
  return () => {
    root.onclick = root.onsubmit = root.onchange = null;
  };
}
