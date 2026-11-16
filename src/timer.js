// Rest timer shown above the tab bar. It survives navigation between screens.
let endsAt = 0;
let total = 0;
let tick = null;
const el = document.createElement('div');
el.className = 'rest';
el.hidden = true;
el.innerHTML = `
  <div class="rest-row">
    <div><span class="rest-label">Rest</span> <b class="rest-time">0:00</b></div>
    <div class="rest-actions"><button data-t="add">+15 s</button><button data-t="skip">Skip</button></div>
  </div>
  <div class="bar"><i></i></div>`;

function paint() {
  const left = Math.max(0, (endsAt - Date.now()) / 1000);
  const s = Math.ceil(left);
  el.querySelector('.rest-time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  el.querySelector('.bar i').style.width = `${total ? (left / total) * 100 : 0}%`;
  if (left <= 0) finish(true);
}

function finish(buzz) {
  clearInterval(tick);
  tick = null;
  if (!buzz) {
    el.hidden = true;
    return;
  }
  navigator.vibrate?.([200, 100, 200]);
  el.querySelector('.rest-label').textContent = 'Go';
  el.classList.add('rest-done');
  setTimeout(() => {
    if (!tick) el.hidden = true;
  }, 2500);
}

export function startRest(seconds) {
  if (!seconds) return;
  total = seconds;
  endsAt = Date.now() + seconds * 1000;
  el.hidden = false;
  el.classList.remove('rest-done');
  el.querySelector('.rest-label').textContent = 'Rest';
  clearInterval(tick);
  tick = setInterval(paint, 250);
  paint();
}

el.addEventListener('click', (e) => {
  const t = e.target.closest('button')?.dataset.t;
  if (t === 'add' && tick) {
    endsAt += 15000;
    total += 15;
    paint();
  } else if (t === 'skip') finish(false);
});

export const mountTimer = (parent) => parent.appendChild(el);
