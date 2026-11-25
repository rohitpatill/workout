// #/debug: contact sheet of every animation's start and end pose, for checking poses.
// #/debug?only=dbCurl,rdl&size=420&t=0,0.5,1 narrows it down and enlarges the frames.
// &cam=0,3,0.1&look=0,1,0 overrides the camera; &look=hand&cam=0.3,0.2,0.4 is a close-up of
// the left hand with the camera offset from it.
import { ANIMS } from '../three/poses.js';
import { renderSheet } from '../three/viewer.js';

export function debugView(root, _params, query) {
  const keys = query.only ? query.only.split(',').filter((k) => ANIMS[k]) : Object.keys(ANIMS);
  const size = Number(query.size) || 360;
  const times = query.t ? query.t.split(',').map(Number) : null;
  const nums = (v) => v.split(',').map(Number);
  const view = {};
  if (query.cam) view.cam = nums(query.cam);
  if (query.look) view.look = query.look === 'hand' ? 'hand' : nums(query.look);
  if (query.fov) view.fov = Number(query.fov);
  if (query.hl) view.hl = query.hl.split(',');
  root.innerHTML = '<p class="muted">Rendering…</p>';
  let alive = true;
  renderSheet(keys, size, times, view).then((sheet) => {
    if (!alive) return;
    root.innerHTML = `<div class="sheet" style="--w:${size}px">${sheet
      .map((s) => `<figure>${s.shots.map((u) => `<img src="${u}" alt="" />`).join('')}<figcaption>${s.key}</figcaption></figure>`)
      .join('')}</div>`;
  });
  return () => {
    alive = false;
  };
}
