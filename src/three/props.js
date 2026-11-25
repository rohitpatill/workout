// Helpers that build equipment specs for PropPool. Points may be arrays or Vector3s.
// Materials (c): metal, chrome, frame, pad, rubber, weight, cable, rope, accent.
//
// Machines are built so they could work: every cable runs from the handle over pulleys to
// a weight stack that rises by exactly the length of cable pulled out, and every lever arm
// turns about a fixed pivot.
import { torsoDir, frontDir } from './rig.js';

const A = (v) => (v.isVector3 ? [v.x, v.y, v.z] : v);
const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
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
export const cable = (a, b) => cyl(a, b, 0.004, 'cable');
export const tube = (a, b, r = 0.028) => cyl(a, b, r, 'frame');

// Upright post with a floor foot running front to back.
export const column = (x, z, h = 2.1, foot = 0.5) => [tube([x, 0.03, z], [x, h, z], 0.03), tube([x, 0.03, z - foot / 2], [x, 0.03, z + foot / 2])];

// ---------- free weights ----------

// Hex dumbbell: knurled chrome handle between two rubber heads.
export function db(p, axis = [1, 0, 0]) {
  p = A(p);
  const ax = norm(A(axis));
  return [
    cyl(add(p, ax, -0.07), add(p, ax, 0.07), 0.0135, 'chrome'),
    cyl(add(p, ax, -0.073), add(p, ax, -0.061), 0.024, 'metal'),
    cyl(add(p, ax, 0.061), add(p, ax, 0.073), 0.024, 'metal'),
    hex(add(p, ax, -0.14), add(p, ax, -0.071), 0.058),
    hex(add(p, ax, 0.071), add(p, ax, 0.14), 0.058),
  ];
}
// A dumbbell in each hand, lined up with the hand's real grip unless an axis is given.
export const dbs = (pts, axis) => [...db(pts.haA, axis ?? pts.axA ?? [1, 0, 0]), ...db(pts.haB, axis ?? pts.axB ?? [1, 0, 0])];

// Weight plates on a sleeve: from point p, stacked outward along dir.
export function plates(p, dir, r = 0.225, n = 1) {
  p = A(p);
  const d = norm(A(dir));
  const out = [];
  let o = 0;
  for (let i = 0; i < n; i++) {
    out.push(
      cyl(add(p, d, o), add(p, d, o + 0.045), r, 'rubber'),
      cyl(add(p, d, o + 0.017), add(p, d, o + 0.028), r + 0.002, 'accent'),
      cyl(add(p, d, o - 0.002), add(p, d, o + 0.047), r * 0.34, 'metal'),
    );
    o += 0.05;
  }
  return out;
}

// A bar through both hands. plateR = radius of the plates (0 for a bare bar).
export function bar(pts, length = 1.2, plateR = 0, nPlates = 1) {
  const a = A(pts.haA);
  const b = A(pts.haB);
  let ax = sub(a, b);
  if (len(ax) < 0.02) ax = [1, 0, 0];
  ax = norm(ax);
  const c = midpoint(a, b);
  const at = (d) => add(c, ax, d);
  const out = [cyl(at(-length / 2), at(length / 2), 0.0135, 'chrome')];
  if (plateR === true) plateR = 0.225;
  if (plateR) {
    const sleeve = Math.min(0.4, length * 0.2);
    for (const s of [-1, 1]) {
      const e = s * (length / 2);
      const inner = e - s * sleeve;
      out.push(
        cyl(at(inner), at(e), 0.024, 'chrome'),
        cyl(at(inner - s * 0.03), at(inner), 0.04, 'metal'),
        ...plates(at(inner + s * 0.004), s > 0 ? ax : [-ax[0], -ax[1], -ax[2]], plateR, nPlates),
        cyl(at(inner + s * (0.01 + 0.05 * nPlates)), at(inner + s * (0.04 + 0.05 * nPlates)), 0.034, 'metal'),
      );
    }
  }
  return out;
}

// ---------- handles ----------

// Short handle in each hand (machine grips).
export const grips = (pts, length = 0.13, r = 0.016) =>
  ['A', 'B'].flatMap((k) => {
    const p = A(pts['ha' + k]);
    const ax = norm(A(pts['ax' + k] ?? [1, 0, 0]));
    return [cyl(add(p, ax, -length / 2), add(p, ax, length / 2), r, 'rubber')];
  });

// D-handle (stirrup): a grip with two rods meeting at a ring on the cable side.
// Returns { specs, ring } so the cable can start at the ring.
export function dHandle(p, axis, toward) {
  p = A(p);
  const ax = norm(A(axis));
  const dir = norm(sub(A(toward), p));
  const ring = add(p, dir, 0.11);
  const e1 = add(p, ax, 0.06);
  const e2 = add(p, ax, -0.06);
  return {
    ring,
    specs: [cyl(e1, e2, 0.015, 'rubber'), cyl(e1, ring, 0.006, 'chrome'), cyl(e2, ring, 0.006, 'chrome'), sph(ring, 0.012, 'metal')],
  };
}

// Close-grip row handle: a grip in each hand joined to one ring on the cable side.
export function vHandle(pts, toward) {
  const m = midpoint(pts.haA, pts.haB);
  const ring = add(m, norm(sub(A(toward), m)), 0.12);
  const out = [sph(ring, 0.014, 'metal')];
  for (const k of ['A', 'B']) {
    const p = A(pts['ha' + k]);
    const ax = norm(A(pts['ax' + k] ?? [0, 1, 0]));
    const e1 = add(p, ax, 0.06);
    const e2 = add(p, ax, -0.06);
    out.push(cyl(e1, e2, 0.015, 'rubber'), cyl(e1, ring, 0.006, 'chrome'), cyl(e2, ring, 0.006, 'chrome'));
  }
  return { ring, specs: out };
}

// Rope attachment: two rope ends with rubber stoppers hanging from one ring.
export function rope(pts, toward) {
  const m = midpoint(pts.haA, pts.haB);
  const ring = add(m, norm(sub(A(toward), m)), 0.2);
  const out = [sph(ring, 0.016, 'metal')];
  for (const k of ['A', 'B']) {
    const p = A(pts['ha' + k]);
    const end = add(p, norm(sub(p, ring)), 0.075);
    out.push(cyl(ring, end, 0.011, 'rope'), sph(end, 0.024, 'rubber'));
  }
  return { ring, specs: out };
}

// Lat bar: straight centre with angled ends, hung from a swivel link.
export function latBar(pts, extra = 0.14) {
  const a = A(pts.haA);
  const b = A(pts.haB);
  const ax = norm(sub(a, b));
  const c = midpoint(a, b);
  const half = len(sub(a, b)) / 2 + 0.06;
  const up = norm(cross(ax, [0, 0, 1]));
  const top = add(c, up, 0.1);
  const out = [cyl(add(c, ax, -half), add(c, ax, half), 0.0135, 'chrome'), cyl(c, top, 0.006, 'chrome'), sph(top, 0.014, 'metal')];
  for (const s of [-1, 1]) {
    const e = add(c, ax, s * half);
    const tip = add(add(e, ax, s * extra), up, -0.05);
    out.push(cyl(e, tip, 0.0135, 'chrome'), cyl(add(tip, ax, -s * 0.11), tip, 0.017, 'rubber'));
  }
  return { ring: top, specs: out };
}

// ---------- cables and weight stacks ----------

// Set by the viewer for the animation being drawn: the shortest handle-to-pulley distance
// seen so far for each cable, so the stack knows how far the cable has been pulled.
export const ctx = { mins: null };
function pulled(id, from, to) {
  const d = len(sub(A(from), A(to)));
  if (!ctx.mins) return 0;
  ctx.mins[id] = Math.min(ctx.mins[id] ?? d, d);
  return Math.min(0.8, d - ctx.mins[id]);
}

// Pulley wheel at p turning about a horizontal axis.
export function pulley(p, axis = [1, 0, 0], r = 0.045) {
  p = A(p);
  const ax = norm(axis);
  return [cyl(add(p, ax, -0.011), add(p, ax, 0.011), r, 'rubber'), cyl(add(p, ax, -0.02), add(p, ax, 0.02), r * 0.3, 'metal'), cyl(add(p, ax, -0.019), add(p, ax, -0.015), r * 1.12, 'metal'), cyl(add(p, ax, 0.015), add(p, ax, 0.019), r * 1.12, 'metal')];
}

// Weight stack between two guide rods. The top plates (above the pin) rise by lift.
// along = 'x' or 'z': which way the plates are wide. Returns { specs, top } with the point
// where the cable attaches.
export function stack(x, z, lift = 0, along = 'x', height = 1.5) {
  const N = 14;
  const SEL = 5;
  const H = 0.027;
  const size = along === 'x' ? [0.24, H - 0.004, 0.1] : [0.1, H - 0.004, 0.24];
  const rod = (o) => (along === 'x' ? [x + o, 0, z] : [x, 0, z + o]);
  const out = [];
  for (const o of [-0.07, 0.07]) {
    const r = rod(o);
    out.push(cyl([r[0], 0.04, r[2]], [r[0], height, r[2]], 0.009, 'chrome'));
  }
  for (let i = 0; i < N; i++) {
    const moving = i >= N - SEL;
    out.push(box([x, 0.07 + i * H + (moving ? lift : 0), z], size, 0, 'weight'));
  }
  const pinY = 0.07 + (N - SEL) * H + lift;
  const top = 0.07 + N * H + lift;
  const pin = along === 'x' ? [x, pinY, z + 0.06] : [x + 0.06, pinY, z];
  out.push(
    box(pin, along === 'x' ? [0.035, 0.014, 0.03] : [0.03, 0.014, 0.035], 0, 'accent'),
    box([x, top + 0.012, z], along === 'x' ? [0.24, 0.03, 0.1] : [0.1, 0.03, 0.24], 0, 'metal'),
    cyl([x, pinY, z], [x, top + 0.09, z], 0.008, 'chrome'),
  );
  return { specs: out, top: [x, top + 0.09, z] };
}

// Cable from a handle ring over a list of pulleys down to a weight stack. The stack rises
// by the amount of cable pulled through the first pulley.
// pulleys: [{ p: [x,y,z], axis: [x,y,z] }]
export function cableRun(id, ring, pulleys, stackAt, along = 'x', stackHeight = 1.5) {
  const lift = pulled(id, ring, pulleys[0].p);
  const st = stack(stackAt[0], stackAt[1], lift, along, stackHeight);
  const out = [...st.specs];
  let prev = A(ring);
  for (const pl of pulleys) {
    out.push(cable(prev, pl.p), ...pulley(pl.p, pl.axis));
    prev = pl.p;
  }
  out.push(cable(prev, st.top));
  return out;
}

// Cable station: a mast with a height-adjustable pulley, a weight stack behind it, and the
// cable routed mast pulley -> top of mast -> above the stack -> stack.
// face = horizontal direction [x, z] the pulley points (toward the user).
export function cableStation(id, { x, z, face, pulleyY, h = 2.15 }, ring) {
  const fl = Math.hypot(face[0], face[1]) || 1;
  const fx = face[0] / fl;
  const fz = face[1] / fl;
  const axis = [-fz, 0, fx];
  const along = Math.abs(fx) > Math.abs(fz) ? 'z' : 'x';
  const sx = x - fx * 0.3;
  const sz = z - fz * 0.3;
  const bx = x - fx * 0.56;
  const bz = z - fz * 0.56;
  const p1 = [x + fx * 0.12, pulleyY, z + fz * 0.12];
  const p2 = [x + fx * 0.075, h - 0.09, z + fz * 0.075];
  const p3 = [sx, h - 0.09, sz];
  return [
    // mast with the sliding carriage
    box([x, h / 2, z], [0.07, h, 0.07]),
    box([x, pulleyY, z], [0.11, 0.16, 0.11], 0, 'metal'),
    box([x + fx * 0.07, pulleyY, z + fz * 0.07], along === 'x' ? [0.05, 0.05, 0.09] : [0.09, 0.05, 0.05], 0, 'metal'),
    box([x + fx * 0.04, pulleyY + 0.11, z + fz * 0.04], [0.03, 0.03, 0.03], 0, 'accent'),
    // rear post, top beam and floor frame
    box([bx, h / 2, bz], [0.07, h, 0.07]),
    tube([x, h - 0.03, z], [bx, h - 0.03, bz], 0.035),
    tube([x + fx * 0.25, 0.03, z + fz * 0.25], [bx, 0.03, bz], 0.035),
    tube([x + fx * 0.25 + axis[0] * 0.32, 0.03, z + fz * 0.25 + axis[2] * 0.32], [x + fx * 0.25 - axis[0] * 0.32, 0.03, z + fz * 0.25 - axis[2] * 0.32]),
    tube([bx + axis[0] * 0.32, 0.03, bz + axis[2] * 0.32], [bx - axis[0] * 0.32, 0.03, bz - axis[2] * 0.32]),
    ...cableRun(id, ring, [{ p: p1, axis }, { p: p2, axis }, { p: p3, axis }], [sx, sz], along, h - 0.2),
  ];
}

// ---------- plate-loaded lever machines ----------

// Lever arms from fixed pivots to the hands, each carrying plates on a horn.
// pivots: { A: [x,y,z], B: [x,y,z] }. frac = where along the arm the plates sit.
export function levers(pts, pivots, { frac = 0.6, plateR = 0.17, n = 1, gripLen = 0.14 } = {}) {
  const out = [];
  for (const k of ['A', 'B']) {
    const piv = pivots[k];
    const h = A(pts['ha' + k]);
    const ax = norm(A(pts['ax' + k] ?? [1, 0, 0]));
    const s = Math.sign(piv[0]) || 1;
    const q = add(piv, sub(h, piv), frac);
    // The arm stops at the end of the grip so it does not run through the hand.
    const gripEnd = add(h, ax, (ax[0] * s >= 0 ? 1 : -1) * (gripLen / 2 + 0.03));
    const elbow = [gripEnd[0], q[1], q[2]];
    out.push(
      cyl(add(h, ax, -gripLen / 2), add(h, ax, gripLen / 2), 0.016, 'rubber'),
      cyl(add(h, ax, -gripLen / 2 - 0.03), add(h, ax, gripLen / 2 + 0.03), 0.012, 'chrome'),
      tube(gripEnd, elbow, 0.022),
      tube(elbow, [gripEnd[0], piv[1], piv[2]], 0.026),
      cyl([gripEnd[0], q[1], q[2]], [gripEnd[0] + s * 0.2, q[1], q[2]], 0.024, 'chrome'),
      ...plates([gripEnd[0] + s * 0.05, q[1], q[2]], [s, 0, 0], plateR, n),
      cyl([piv[0] - s * 0.05, piv[1], piv[2]], [gripEnd[0] + s * 0.04, piv[1], piv[2]], 0.03, 'metal'),
    );
  }
  return out;
}

// ---------- benches and pads ----------

// A pad lying along the torso. side -1 = behind the back, +1 = under the chest.
export function pad(pelvis, lean, length = 0.85, side = -1, gap = 0.15) {
  const d = torsoDir(lean);
  const f = frontDir(lean);
  const c = add(add(pelvis, d, length / 2 - 0.12), f, side * gap);
  return rbox(c, [0.3, 0.07, length], 90 + lean);
}

export function seat(pelvis, depth = 0.42) {
  const top = pelvis[1] - 0.135;
  return [rbox([0, top, pelvis[2] + 0.12], [0.36, 0.07, depth]), tube([0, 0.03, pelvis[2] + 0.1], [0, top - 0.03, pelvis[2] + 0.1], 0.03)];
}

// Flat or inclined bench under a lying / reclined body: pads on a tube frame.
export function bench(pelvis, lean, length = 0.95) {
  const d = torsoDir(lean);
  const f = frontDir(lean);
  const out = [pad(pelvis, lean, length)];
  const flat = lean <= -80;
  if (!flat) out.push(rbox([0, pelvis[1] - 0.135, pelvis[2] + 0.12], [0.36, 0.07, 0.42]));
  // Points under the pad near its head end and near the hips.
  const head = add(add(pelvis, d, length - 0.3), f, -0.19);
  const hip = flat ? add(add(pelvis, d, -0.02), f, -0.19) : [0, pelvis[1] - 0.17, pelvis[2] + 0.12];
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
