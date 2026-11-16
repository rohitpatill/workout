// Helpers that build equipment specs for PropPool. Points may be arrays or Vector3s.
import { torsoDir, frontDir } from './rig.js';

const A = (v) => (v.isVector3 ? [v.x, v.y, v.z] : v);
const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const midpoint = (a, b) => {
  a = A(a);
  b = A(b);
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
};

export const cyl = (a, b, r = 0.02, c = 'metal') => ({ t: 'cyl', a: A(a), b: A(b), r, c });
export const box = (p, s, rx = 0, c = 'pad') => ({ t: 'box', p: A(p), s, rx, c });
export const cable = (a, b) => cyl(a, b, 0.006, 'cable');
export const column = (x, z, h = 2.1) => cyl([x, 0, z], [x, h, z], 0.035);

export function db(p, axis = [1, 0, 0]) {
  p = A(p);
  const ax = norm(axis);
  return [
    cyl(add(p, ax, -0.1), add(p, ax, 0.1), 0.014),
    cyl(add(p, ax, -0.125), add(p, ax, -0.06), 0.052, 'weight'),
    cyl(add(p, ax, 0.06), add(p, ax, 0.125), 0.052, 'weight'),
  ];
}
export const dbs = (pts, axis) => [...db(pts.haA, axis), ...db(pts.haB, axis)];

// A bar through both hands. plates = true draws a loaded barbell.
export function bar(pts, len = 1.2, plates = false) {
  const a = A(pts.haA);
  const b = A(pts.haB);
  let ax = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  if (Math.hypot(...ax) < 0.02) ax = [1, 0, 0];
  ax = norm(ax);
  const c = midpoint(a, b);
  const out = [cyl(add(c, ax, -len / 2), add(c, ax, len / 2), 0.014)];
  if (plates) {
    for (const s of [-1, 1]) out.push(cyl(add(c, ax, s * (len / 2 - 0.17)), add(c, ax, s * (len / 2 - 0.11)), 0.2, 'weight'));
  }
  return out;
}

// A pad lying along the torso. side -1 = behind the back, +1 = under the chest.
export function pad(pelvis, lean, len = 0.85, side = -1) {
  const d = torsoDir(lean);
  const f = frontDir(lean);
  const c = add(add(pelvis, d, len / 2 - 0.12), f, side * 0.15);
  return box(c, [0.32, 0.07, len], 90 + lean);
}

export function seat(pelvis, depth = 0.42) {
  const top = pelvis[1] - 0.15;
  return [
    box([0, top, pelvis[2] + 0.1], [0.34, 0.07, depth]),
    box([0, (top - 0.03) / 2, pelvis[2] + 0.05], [0.1, top - 0.03, 0.1], 0, 'metal'),
  ];
}

// Flat or inclined bench under a lying / reclined body.
export function bench(pelvis, lean, len = 0.95) {
  const out = [pad(pelvis, lean, len)];
  if (lean > -80) out.push(...seat(pelvis));
  const d = torsoDir(lean);
  const f = frontDir(lean);
  const c = add(add(pelvis, d, len / 2 - 0.12), f, -0.19);
  out.push(box([0, c[1] / 2, c[2]], [0.1, c[1], 0.1], 0, 'metal'));
  if (lean <= -80) out.push(box([0, (pelvis[1] - 0.19) / 2, pelvis[2] + 0.05], [0.1, pelvis[1] - 0.19, 0.1], 0, 'metal'));
  return out;
}
