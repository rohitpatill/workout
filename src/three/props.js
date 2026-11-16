// Helpers that build equipment specs for PropPool. Points may be arrays or Vector3s.
// Materials (c): metal, chrome, frame, pad, rubber, weight, cable, rope, accent.
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

export const cyl = (a, b, r = 0.02, c = 'frame') => ({ t: 'cyl', a: A(a), b: A(b), r, c });
export const hex = (a, b, r, c = 'rubber') => ({ t: 'hex', a: A(a), b: A(b), r, c });
export const box = (p, s, rx = 0, c = 'frame') => ({ t: 'box', p: A(p), s, rx, c });
export const rbox = (p, s, rx = 0, c = 'pad', rad = 0.03) => ({ t: 'rbox', p: A(p), s, rx, c, rad });
export const sph = (p, r, c = 'rubber') => ({ t: 'sph', p: A(p), r, c });
export const cable = (a, b) => cyl(a, b, 0.005, 'cable');
export const tube = (a, b, r = 0.028) => cyl(a, b, r, 'frame');
export const column = (x, z, h = 2.1) => [tube([x, 0, z], [x, h, z], 0.03), box([x, 0.012, z], [0.3, 0.024, 0.3])];

// Hex dumbbell: knurled chrome handle between two rubber heads.
export function db(p, axis = [1, 0, 0]) {
  p = A(p);
  const ax = norm(A(axis));
  return [
    cyl(add(p, ax, -0.075), add(p, ax, 0.075), 0.0135, 'chrome'),
    cyl(add(p, ax, -0.078), add(p, ax, -0.066), 0.024, 'metal'),
    cyl(add(p, ax, 0.066), add(p, ax, 0.078), 0.024, 'metal'),
    hex(add(p, ax, -0.145), add(p, ax, -0.076), 0.058),
    hex(add(p, ax, 0.076), add(p, ax, 0.145), 0.058),
  ];
}
// A dumbbell in each hand, lined up with the hand's real grip unless an axis is given.
export const dbs = (pts, axis) => [...db(pts.haA, axis ?? pts.axA ?? [1, 0, 0]), ...db(pts.haB, axis ?? pts.axB ?? [1, 0, 0])];

// Short handle in each hand (machine grips, D-handles).
export const grips = (pts, len = 0.13) =>
  ['A', 'B'].flatMap((k) => {
    const p = A(pts['ha' + k]);
    const ax = norm(A(pts['ax' + k] ?? [1, 0, 0]));
    return [cyl(add(p, ax, -len / 2), add(p, ax, len / 2), 0.016, 'rubber')];
  });

// A bar through both hands. plates = radius of the main plate (0 for a bare bar).
export function bar(pts, len = 1.2, plates = 0) {
  const a = A(pts.haA);
  const b = A(pts.haB);
  let ax = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  if (Math.hypot(...ax) < 0.02) ax = [1, 0, 0];
  ax = norm(ax);
  const c = midpoint(a, b);
  const at = (d) => add(c, ax, d);
  const out = [cyl(at(-len / 2), at(len / 2), 0.0135, 'chrome')];
  if (plates === true) plates = 0.225;
  if (plates) {
    const sleeve = Math.min(0.4, len * 0.2);
    for (const s of [-1, 1]) {
      const e = s * (len / 2);
      const inner = e - s * sleeve;
      out.push(
        cyl(at(inner), at(e), 0.024, 'chrome'),
        cyl(at(inner - s * 0.03), at(inner), 0.04, 'metal'),
        cyl(at(inner + s * 0.005), at(inner + s * 0.055), plates, 'rubber'),
        cyl(at(inner + s * 0.022), at(inner + s * 0.038), plates + 0.002, 'accent'),
        cyl(at(inner + s * 0.002), at(inner + s * 0.058), plates * 0.36, 'metal'),
        cyl(at(inner + s * 0.06), at(inner + s * 0.09), plates * 0.72, 'weight'),
        cyl(at(inner + s * 0.092), at(inner + s * 0.12), 0.034, 'metal'),
      );
    }
  }
  return out;
}

// Rope attachment: the cable runs to a junction, then a rope end goes to each hand.
export function rope(pts, anchor) {
  const m = midpoint(pts.haA, pts.haB);
  const an = A(anchor);
  const j = add(m, norm([an[0] - m[0], an[1] - m[1], an[2] - m[2]]), 0.2);
  return [
    cable(j, an),
    sph(j, 0.02, 'metal'),
    cyl(j, pts.haA, 0.011, 'rope'),
    cyl(j, pts.haB, 0.011, 'rope'),
    sph(A(pts.haA), 0.024, 'rubber'),
    sph(A(pts.haB), 0.024, 'rubber'),
  ];
}

// Weight-stack tower at (x, z). lift (0..1) raises the selected plates as the cable is pulled.
export function tower(x, z, h = 2.1, lift = 0) {
  const up = lift * 0.22;
  return [
    tube([x - 0.12, 0, z], [x - 0.12, h, z], 0.026),
    tube([x + 0.12, 0, z], [x + 0.12, h, z], 0.026),
    tube([x - 0.12, h, z], [x + 0.12, h, z], 0.026),
    box([x, 0.02, z], [0.5, 0.04, 0.5]),
    cyl([x - 0.05, 0.04, z], [x - 0.05, h * 0.62, z], 0.008, 'chrome'),
    cyl([x + 0.05, 0.04, z], [x + 0.05, h * 0.62, z], 0.008, 'chrome'),
    box([x, 0.3, z], [0.17, 0.5, 0.09], 0, 'weight'),
    box([x, 0.66 + up, z], [0.17, 0.2, 0.09], 0, 'weight'),
    box([x, 0.66 + up, z + 0.047], [0.06, 0.03, 0.005], 0, 'accent'),
  ];
}

// A pad lying along the torso. side -1 = behind the back, +1 = under the chest.
export function pad(pelvis, lean, len = 0.85, side = -1) {
  const d = torsoDir(lean);
  const f = frontDir(lean);
  const c = add(add(pelvis, d, len / 2 - 0.12), f, side * 0.165);
  return rbox(c, [0.3, 0.07, len], 90 + lean);
}

export function seat(pelvis, depth = 0.42) {
  const top = pelvis[1] - 0.15;
  return [rbox([0, top, pelvis[2] + 0.1], [0.34, 0.07, depth]), tube([0, 0.03, pelvis[2] + 0.08], [0, top - 0.03, pelvis[2] + 0.08], 0.03)];
}

// Flat or inclined bench under a lying / reclined body: pads on a tube frame.
export function bench(pelvis, lean, len = 0.95) {
  const d = torsoDir(lean);
  const f = frontDir(lean);
  const out = [pad(pelvis, lean, len)];
  const flat = lean <= -80;
  if (!flat) out.push(rbox([0, pelvis[1] - 0.15, pelvis[2] + 0.1], [0.34, 0.07, 0.42]));
  // Points under the pad near its head end and near the hips.
  const head = add(add(pelvis, d, len - 0.3), f, -0.2);
  const hip = flat ? add(add(pelvis, d, -0.02), f, -0.2) : [0, pelvis[1] - 0.19, pelvis[2] + 0.1];
  const zBack = head[2] - 0.05;
  const zFront = hip[2] + (flat ? 0.05 : 0.22);
  out.push(
    tube(head, [0, 0.03, zBack]),
    tube(hip, [0, 0.03, zFront]),
    tube([0, 0.03, zBack], [0, 0.03, zFront]),
    tube([-0.26, 0.03, zBack], [0.26, 0.03, zBack]),
    tube([-0.22, 0.03, zFront], [0.22, 0.03, zFront]),
  );
  if (!flat) out.push(tube(head, hip, 0.024));
  return out;
}
