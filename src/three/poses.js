// One entry per movement. pose(t) returns rig targets for t in 0..1 (0 = start,
// 1 = end of the lifting phase); props(pts, t) returns the equipment for that frame.
// Units are metres, Y is up, the figure faces +Z, side A is +X (the figure's left).
//
// Pose fields (see human.js): pelvis, lean, arch, headLean, hand / foot targets, elbow /
// knee pole hints, toe direction, grip (forearm rotation: 1 palms toward the biceps,
// -1 away, 0 neutral), handFwd + handPalm (explicit hand direction, for hands on the
// floor or on bars), curl (finger curl), gRot / gPos (rotate or move the whole figure).
// A plain field is mirrored to both sides; the A / B suffix sets one side.
import { torsoDir, frontDir, chestOf } from './rig.js';
import * as P from './props.js';

const rad = (d) => (d * Math.PI) / 180;
const L = (a, b, t) => (Array.isArray(a) ? a.map((x, i) => x + (b[i] - x) * t) : a + (b - a) * t);
const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const sh = (pelvis, lean) => {
  const c = chestOf(pelvis, lean);
  return [0.2, c[1], c[2]];
};
// Arm from explicit upper-arm and forearm directions (keeps the elbow pinned).
const UPPER = 0.25;
const FORE = 0.33;
const armFK = (S, u, f) => {
  u = norm(u);
  const e = add(S, u, UPPER);
  return { hand: add(e, norm(f), FORE), elbow: u };
};

const SIDE = [3.5, 1.15, 1.3];
const FRONT = [1.3, 1.3, 3.6];
const QUARTER = [2.5, 1.4, 2.9];

const SEATED_FEET = { foot: [0.18, 0.086, 0.42], knee: [0, 1, 0.4] };
const ON_FLOOR = { handFwd: [0, 0, 1], handPalm: [0, -1, 0] };

// Straight body supported on the toes with the chest at height h (push-up, plank).
function plankBody(h) {
  const a = Math.asin((h - 0.1) / 1.4);
  const d = [0, Math.sin(a), Math.cos(a)];
  const ankle = [0, 0.1, -1.36];
  return {
    pelvis: add(ankle, d, 0.9),
    lean: 90 - (a * 180) / Math.PI,
    headLean: 90 - (a * 180) / Math.PI - 18,
    foot: [0.09, 0.1, -1.36],
    toe: [0, -1, 0.35],
    knee: [0, -1, 0],
  };
}

function curl(t, { lean = 0, pelvis = [0, 0.95, 0], upper = [0.06, -1, 0.03], from = 8, to = 140 }) {
  const a = rad(L(from, to, t));
  return armFK(sh(pelvis, lean), upper, [0, -Math.cos(a), Math.sin(a)]);
}

function seatedPress(t) {
  return {
    pelvis: [0, 0.5, 0],
    lean: -8,
    ...SEATED_FEET,
    hand: L([0.37, 1.04, 0.06], [0.21, 1.54, -0.05], t),
    elbow: [0.9, -1, 0.15],
  };
}

const XA = [1, 0, 0];

// Lat pulldown station: stack in front of the user, top beam overhead, the cable running
// bar -> pulley above the bar -> pulley above the stack -> stack.
function pulldown(width) {
  return {
    cam: QUARTER,
    look: [0, 1.1, 0.35],
    dist: 1.3,
    pose: (t) => ({
      pelvis: [0, 0.5, 0],
      lean: L(-4, -14, t),
      headLean: L(-12, -8, t),
      foot: [0.17, 0.086, 0.36],
      knee: [0, 1, 0.4],
      hand: L([width, 1.56, 0.04], [width - 0.03, 1.1, 0.13], t),
      elbow: [0.6, -1, -0.35],
    }),
    props: (pts) => {
      const lb = P.latBar(pts);
      return [
        ...lb.specs,
        ...P.cableRun('pulldown', lb.ring, [{ p: [0, 2.2, 0.07], axis: XA }, { p: [0, 2.2, 1.0], axis: XA }], [0, 1.0], 'x', 2.1),
        P.box([-0.2, 1.15, 1.0], [0.06, 2.3, 0.09]),
        P.box([0.2, 1.15, 1.0], [0.06, 2.3, 0.09]),
        P.tube([-0.2, 2.3, 1.0], [0.2, 2.3, 1.0], 0.035),
        P.tube([0, 2.3, 1.0], [0, 2.3, 0.0], 0.035),
        P.box([0, 2.25, 0.07], [0.05, 0.1, 0.05], 0, 'metal'),
        P.box([0, 2.25, 1.0], [0.05, 0.1, 0.05], 0, 'metal'),
        P.tube([0, 0.03, 1.12], [0, 0.03, -0.3], 0.035),
        P.tube([-0.38, 0.03, 1.0], [0.38, 0.03, 1.0]),
        P.tube([-0.3, 0.03, -0.3], [0.3, 0.03, -0.3]),
        ...P.seat([0, 0.5, 0]),
        P.tube([0, 0.03, 0.55], [0, 0.66, 0.36], 0.026),
        P.cyl([-0.3, 0.66, 0.36], [0.3, 0.66, 0.36], 0.012, 'chrome'),
        P.cyl([-0.3, 0.66, 0.36], [-0.06, 0.66, 0.36], 0.05, 'pad'),
        P.cyl([0.06, 0.66, 0.36], [0.3, 0.66, 0.36], 0.05, 'pad'),
      ];
    },
  };
}

// Plate-loaded press: each handle is on a lever arm that swings about a fixed pivot, so
// the hands travel on an arc. Angles are measured from straight down, toward the front.
function leverPress({ py, pz, r, a0, a1, cam = QUARTER }) {
  const pivots = { A: [0.37, py, pz], B: [-0.37, py, pz] };
  return {
    cam,
    look: [0, 0.95, 0.05],
    dist: 1.1,
    pose: (t) => {
      const a = rad(L(a0, a1, t));
      return {
        pelvis: [0, 0.5, 0],
        lean: -10,
        ...SEATED_FEET,
        hand: [0.3, py - r * Math.cos(a), pz + r * Math.sin(a)],
        elbow: [1, -0.5, -0.3],
        gripR: 0.016,
      };
    },
    props: (pts) => [
      P.pad([0, 0.5, 0], -10),
      ...P.seat([0, 0.5, 0]),
      ...P.levers(pts, pivots, { frac: 0.55 }),
      // frame: two rear uprights carrying the pivot axle, joined on the floor and at the top
      ...[-1, 1].flatMap((sd) => [
        P.tube([sd * 0.68, 0.03, pz - 0.3], [sd * 0.68, py, pz], 0.032),
        P.tube([sd * 0.68, py, pz], [sd * 0.5, py, pz], 0.032),
        P.tube([sd * 0.68, 0.03, pz - 0.55], [sd * 0.68, 0.03, 0.6]),
      ]),
      P.tube([-0.68, py, pz], [0.68, py, pz], 0.02),
      P.tube([-0.68, 0.03, pz - 0.3], [0.68, 0.03, pz - 0.3]),
      P.tube([0, 0.03, pz - 0.3], [0, 0.03, 0.12]),
    ],
  };
}

// Cable station exercises share this: the handle helper returns a ring, the cable runs
// from that ring through the station to its weight stack.
const station = (id, at, handle) => [...handle.specs, ...P.cableStation(id, at, handle.ring)];

const allFours = { pelvis: [0, 0.51, 0], lean: 82, hand: [0.2, 0.04, 0.5], elbow: [0.4, 0, -1], foot: [0.1, 0.07, -0.45], knee: [0, -0.6, 1], toe: [0, -0.3, -1], ...ON_FLOOR };

export const ANIMS = {
  inclineDbPress: {
    cam: QUARTER,
    pose: (t) => ({
      pelvis: [0, 0.5, 0],
      lean: -40,
      foot: [0.2, 0.086, 0.5],
      knee: [0, 1, 0.3],
      hand: L([0.34, 0.95, -0.2], [0.19, 1.43, -0.3], t),
      elbow: [0.7, -1, 0.1],
    }),
    props: (pts) => [...P.bench([0, 0.5, 0], -40), ...P.dbs(pts)],
  },

  flatDbPress: {
    cam: QUARTER,
    look: [0, 0.6, 0],
    pose: (t) => ({
      pelvis: [0, 0.56, 0.25],
      lean: -90,
      foot: [0.22, 0.086, 0.75],
      knee: [0, 1, 0.5],
      hand: L([0.36, 0.66, -0.13], [0.2, 1.1, -0.2], t),
      elbow: [1, -0.6, 0.3],
    }),
    props: (pts) => [...P.bench([0, 0.56, 0.25], -90, 1.15), ...P.dbs(pts)],
  },

  machineChestPress: leverPress({ py: 1.72, pz: 0.02, r: 0.75, a0: 5, a1: 37 }),

  inclineMachinePress: leverPress({ py: 1.76, pz: -0.25, r: 0.82, a0: 25, a1: 57 }),

  seatedDbPress: {
    cam: FRONT,
    look: [0, 0.95, 0],
    pose: seatedPress,
    props: (pts) => [...P.bench([0, 0.5, 0], -8, 0.9), ...P.dbs(pts)],
  },

  machineShoulderPress: (() => {
    // Lever arms pivot behind the shoulders; the handles rise on an arc.
    const py = 1.22;
    const pz = -0.52;
    const r = 0.6;
    const pivots = { A: [0.4, py, pz], B: [-0.4, py, pz] };
    return {
      cam: QUARTER,
      look: [0, 1.0, -0.1],
      dist: 1.1,
      pose: (t) => {
        const a = rad(L(-18, 34, t));
        return {
          pelvis: [0, 0.5, 0],
          lean: -8,
          ...SEATED_FEET,
          hand: [0.33, py + r * Math.sin(a), pz + r * Math.cos(a)],
          elbow: [0.9, -1, 0.15],
          gripR: 0.016,
        };
      },
      props: (pts) => [
        P.pad([0, 0.5, 0], -8),
        ...P.seat([0, 0.5, 0]),
        ...P.levers(pts, pivots, { frac: 0.6 }),
        ...[-1, 1].flatMap((sd) => [
          P.tube([sd * 0.7, 0.03, pz], [sd * 0.7, py, pz], 0.032),
          P.tube([sd * 0.7, py, pz], [sd * 0.5, py, pz], 0.032),
          P.tube([sd * 0.7, 0.03, pz - 0.3], [sd * 0.7, 0.03, 0.5]),
        ]),
        P.tube([-0.7, 0.03, pz], [0.7, 0.03, pz]),
        P.tube([0, 0.03, pz], [0, 0.03, 0.12]),
      ],
    };
  })(),

  cableFly: {
    cam: FRONT,
    look: [0, 1.05, 0],
    dist: 1.35,
    pose: (t) => {
      const a = rad(90 * t);
      return {
        pelvis: [0, 0.94, 0],
        lean: 10,
        footA: [0.14, 0.086, 0.2],
        footB: [-0.14, 0.086, -0.25],
        hand: [0.05 + 0.67 * Math.cos(a), 1.4 - 0.2 * Math.sin(a), 0.07 + 0.45 * Math.sin(a)],
        elbow: [0.3, 0.2, -1],
        grip: 1,
        gripR: 0.015,
      };
    },
    props: (pts) => {
      const hA = P.dHandle(pts.haA, pts.axA, [1.13, 1.95, -0.1]);
      const hB = P.dHandle(pts.haB, pts.axB, [-1.13, 1.95, -0.1]);
      return [
        ...station('flyA', { x: 1.25, z: -0.1, face: [-1, 0], pulleyY: 1.95 }, hA),
        ...station('flyB', { x: -1.25, z: -0.1, face: [1, 0], pulleyY: 1.95 }, hB),
        P.tube([-1.25, 2.15, -0.1], [1.25, 2.15, -0.1], 0.035),
      ];
    },
  },

  lateralRaise: {
    cam: FRONT,
    look: [0, 0.95, 0],
    pose: (t) => {
      const a = rad(L(8, 88, t));
      return { hand: add([0.2, 1.45, 0], [Math.sin(a), -Math.cos(a), 0.1], 0.55), elbow: [0, 0.3, -1] };
    },
    props: (pts) => P.dbs(pts),
  },

  ropePushdown: {
    cam: SIDE,
    look: [0, 1.05, 0.4],
    dist: 1.15,
    pose: (t) => {
      const pelvis = [0, 0.95, -0.02];
      const a = rad(L(100, 6, t));
      const arm = armFK(sh(pelvis, 12), [0.1, -1, 0.02], [0, -Math.cos(a), Math.sin(a)]);
      return { pelvis, lean: 12, foot: [0.14, 0.086, 0], hand: arm.hand, elbow: arm.elbow, gripR: 0.012 };
    },
    props: (pts) => station('pushdown', { x: 0, z: 0.72, face: [0, -1], pulleyY: 1.95 }, P.rope(pts, [0, 1.95, 0.6])),
  },

  pushUp: {
    cam: SIDE,
    look: [0, 0.3, -0.6],
    pose: (t) => ({ ...plankBody(L(0.2, 0.6, t)), hand: [0.3, 0.03, 0], elbow: [0.6, 0.2, -1], ...ON_FLOOR }),
    props: () => [],
  },

  plank: {
    cam: SIDE,
    look: [0, 0.25, -0.6],
    hold: true,
    pose: (t) => ({ ...plankBody(0.35 + 0.012 * t), hand: [0.15, 0.04, 0.3], elbow: [0, -1, -0.15], ...ON_FLOOR }),
    props: () => [],
  },

  latPulldown: pulldown(0.38),
  widePulldown: pulldown(0.54),

  chestSupportedRow: {
    cam: SIDE,
    look: [0, 0.65, 0],
    pose: (t) => ({
      pelvis: [0, 0.75, -0.25],
      lean: 50,
      headLean: 35,
      foot: [0.15, 0.09, -0.78],
      knee: [0, -0.2, 1],
      toe: [0, -0.6, 1],
      hand: L([0.22, 0.52, 0.15], [0.27, 0.88, 0.02], t),
      elbow: [0.3, 0.6, -1],
    }),
    props: (pts) => [
      P.pad([0, 0.75, -0.25], 50, 0.8, 1),
      P.tube([0, 0.9, 0.36], [0, 0.03, 0.42]),
      P.tube([0, 0.66, 0.08], [0, 0.03, -0.1]),
      P.tube([0, 0.03, -0.1], [0, 0.03, 0.42]),
      P.tube([-0.26, 0.03, 0.42], [0.26, 0.03, 0.42]),
      P.tube([-0.22, 0.03, -0.1], [0.22, 0.03, -0.1]),
      ...P.dbs(pts),
    ],
  },

  seatedCableRow: {
    cam: SIDE,
    look: [0, 0.75, 0.7],
    dist: 1.3,
    pose: (t) => ({
      pelvis: [0, 0.5, 0],
      lean: L(8, -5, t),
      foot: [0.13, 0.42, 0.84],
      knee: [0, 1, 0],
      toe: [0, 0.944, 0.33],
      hand: L([0.07, 0.86, 0.5], [0.1, 0.8, 0.14], t),
      elbow: [0.3, -0.2, -1],
      gripR: 0.015,
    }),
    props: (pts) => {
      const vh = P.vHandle(pts, [0, 0.62, 1.3]);
      const n = [0, -0.33, 0.944]; // sole direction of the feet
      const plate = (an, toe) => {
        const m = P.midpoint(an, toe);
        return [m[0], m[1] + n[1] * 0.1, m[2] + n[2] * 0.1];
      };
      const pA = plate(pts.anA, pts.toeA);
      const pB = plate(pts.anB, pts.toeB);
      return [
        ...vh.specs,
        ...P.cableRun('row', vh.ring, [{ p: [0, 0.62, 1.3], axis: XA }, { p: [0, 1.78, 1.36], axis: XA }, { p: [0, 1.78, 1.7], axis: XA }], [0, 1.7], 'x', 1.7),
        // bench
        P.rbox([0, 0.325, 0.05], [0.34, 0.08, 0.9]),
        P.tube([0, 0.03, -0.25], [0, 0.29, -0.25]),
        P.tube([0, 0.03, 0.35], [0, 0.29, 0.35]),
        P.tube([-0.25, 0.03, -0.25], [0.25, 0.03, -0.25]),
        // foot plates on their own supports
        P.box(pA, [0.17, 0.32, 0.025], 19, 'metal'),
        P.box(pB, [0.17, 0.32, 0.025], 19, 'metal'),
        P.tube([pA[0], pA[1], pA[2] + 0.02], [pA[0], 0.03, pA[2] + 0.12], 0.022),
        P.tube([pB[0], pB[1], pB[2] + 0.02], [pB[0], 0.03, pB[2] + 0.12], 0.022),
        P.tube([-0.3, 0.03, 1.07], [0.3, 0.03, 1.07]),
        // mast with the low pulley, and the stack tower behind it
        P.box([-0.06, 0.93, 1.33], [0.03, 1.86, 0.07]),
        P.box([0.06, 0.93, 1.33], [0.03, 1.86, 0.07]),
        P.box([-0.2, 0.93, 1.7], [0.06, 1.86, 0.09]),
        P.box([0.2, 0.93, 1.7], [0.06, 1.86, 0.09]),
        P.tube([-0.2, 1.86, 1.7], [0.2, 1.86, 1.7], 0.035),
        P.tube([0, 1.86, 1.3], [0, 1.86, 1.7], 0.035),
        P.tube([0, 0.03, -0.25], [0, 0.03, 1.82], 0.035),
        P.tube([-0.36, 0.03, 1.7], [0.36, 0.03, 1.7]),
      ];
    },
  },

  facePull: {
    cam: QUARTER,
    look: [0, 1.1, 0.7],
    dist: 1.35,
    pose: (t) => ({
      footA: [0.15, 0.086, 0.12],
      footB: [-0.15, 0.086, -0.2],
      pelvis: [0, 0.94, -0.03],
      lean: -3,
      hand: L([0.08, 1.55, 0.52], [0.32, 1.62, 0.04], t),
      elbow: [1, 0.35, -0.3],
      gripR: 0.012,
    }),
    props: (pts) => station('facepull', { x: 0, z: 1.55, face: [0, -1], pulleyY: 1.62 }, P.rope(pts, [0, 1.62, 1.43])),
  },

  dbCurl: {
    cam: QUARTER,
    look: [0, 0.95, 0],
    pose: (t) => ({ ...curl(t, {}), grip: 1 }),
    props: (pts) => P.dbs(pts),
  },

  hammerCurl: {
    cam: QUARTER,
    look: [0, 0.95, 0],
    pose: (t) => curl(t, {}),
    props: (pts) => P.dbs(pts),
  },

  ezCurl: {
    cam: QUARTER,
    look: [0, 0.95, 0],
    pose: (t) => ({ ...curl(t, { upper: [0.02, -1, 0.03] }), grip: 0.85 }),
    props: (pts) => P.bar(pts, 1.2, 0.11),
  },

  inclineDbCurl: {
    cam: SIDE,
    look: [0, 0.7, -0.1],
    pose: (t) => {
      const pelvis = [0, 0.5, 0];
      return { pelvis, lean: -35, foot: [0.2, 0.086, 0.5], knee: [0, 1, 0.3], ...curl(t, { pelvis, lean: -35, upper: [0.05, -1, -0.05], from: 5, to: 130 }), grip: 1 };
    },
    props: (pts) => [...P.bench([0, 0.5, 0], -35), ...P.dbs(pts)],
  },

  legPress: {
    cam: [3.4, 1.5, 1.2],
    look: [0, 0.65, 0.45],
    dist: 1.2,
    pose: (t) => ({
      pelvis: [0, 0.35, 0],
      lean: -50,
      headLean: -42,
      foot: L([0.15, 0.66, 0.37], [0.15, 0.88, 0.63], t),
      knee: [0.2, 1, -0.2],
      toe: [0, 0.77, -0.64],
      hand: [0.31, 0.3, 0.12],
      elbow: [0.5, 0, -1],
      gripR: 0.016,
    }),
    props: (pts) => {
      // The sled rides on two rails inclined 40 degrees; the foot plate faces down the rails.
      const u = [0, 0.64, 0.77];
      const up = [0, 0.77, -0.64];
      const m = P.midpoint(pts.anA, pts.anB);
      const c = [0, m[1] + u[1] * 0.095 + up[1] * 0.07, m[2] + u[2] * 0.095 + up[2] * 0.07];
      const L0 = [0.24, 0.1]; // (y, z) of the low end of the rails
      const sAlong = (c[1] - L0[0]) * u[1] + (c[2] - L0[1]) * u[2];
      const on = [L0[0] + u[1] * sAlong, L0[1] + u[2] * sAlong];
      const top = [L0[0] + u[1] * 1.6, L0[1] + u[2] * 1.6];
      return [
        P.pad([0, 0.35, 0], -50),
        P.rbox([0, 0.2, 0.1], [0.36, 0.07, 0.32], -14),
        P.tube([0, 0.03, -0.5], [0, 0.42, -0.42], 0.03),
        P.tube([0, 0.03, 0.05], [0, 0.16, 0.08], 0.03),
        ...[-1, 1].flatMap((sd) => [
          P.tube([sd * 0.4, L0[0], L0[1]], [sd * 0.4, top[0], top[1]], 0.026),
          P.tube([sd * 0.4, top[0], top[1]], [sd * 0.4, 0.03, top[1]]),
          P.tube([sd * 0.4, L0[0], L0[1]], [sd * 0.4, 0.03, L0[1]]),
          P.tube([sd * 0.4, 0.03, -0.55], [sd * 0.4, 0.03, top[1]]),
          // carriage on the rail, with a weight horn
          P.box([sd * 0.4, on[0], on[1]], [0.09, 0.09, 0.3], -40, 'metal'),
          P.cyl([sd * 0.4, on[0], on[1]], [sd * 0.62, on[0], on[1]], 0.024, 'chrome'),
          ...P.plates([sd * 0.47, on[0], on[1]], [sd, 0, 0], 0.2, 2),
          P.tube([sd * 0.25, on[0], on[1]], [sd * 0.25, c[1], c[2]], 0.022),
          // hand grip beside the seat
          P.tube([sd * 0.31, 0.03, 0.12], [sd * 0.31, 0.24, 0.12], 0.018),
        ]),
        P.tube([-0.4, on[0], on[1]], [0.4, on[0], on[1]], 0.026),
        P.tube([-0.4, top[0], top[1]], [0.4, top[0], top[1]]),
        P.tube([-0.4, 0.03, -0.55], [0.4, 0.03, -0.55]),
        P.box(c, [0.6, 0.5, 0.03], -40, 'metal'),
        ...P.grips(pts, 0.12),
      ];
    },
  },

  gobletSquat: {
    cam: QUARTER,
    pose: (t) => {
      const pelvis = L([0, 0.5, -0.24], [0, 0.95, 0], t);
      const lean = L(26, 3, t);
      const c = chestOf(pelvis, lean);
      const hand = add(add(c, frontDir(lean), 0.22), torsoDir(lean), -0.12);
      return { pelvis, lean, headLean: lean * 0.3, foot: [0.2, 0.086, 0], knee: [0.4, 0, 1], toe: [0.3, 0, 1], hand: [0.07, hand[1], hand[2]], elbow: [0.5, -1, 0], curl: 0.6 };
    },
    props: (pts) => {
      const m = P.midpoint(pts.haA, pts.haB);
      return P.db([m[0], m[1] + 0.02, m[2]], [0, 1, 0]);
    },
  },

  lyingLegCurl: {
    cam: SIDE,
    look: [0, 0.6, 0],
    pose: (t) => {
      const b = rad(L(5, 115, t));
      return {
        pelvis: [0, 0.62, 0],
        lean: 90,
        headLean: 80,
        foot: add([0.1, 0.62, -0.43], [0, Math.sin(b), -Math.cos(b)], 0.46),
        knee: [0, -1, -0.2],
        toe: [0, -Math.cos(b), -Math.sin(b)],
        hand: [0.26, 0.42, 0.72],
        elbow: [1, 0, -0.3],
        gripR: 0.016,
      };
    },
    props: (pts, t) => {
      // The lever turns about the knee axis; its roller sits on the back of the ankles.
      const b = rad(L(5, 115, t));
      const piv = [0.3, 0.62, -0.43];
      const r = [0, pts.anA.y + Math.cos(b) * 0.1, pts.anA.z + Math.sin(b) * 0.1];
      const mid = [0.3, (piv[1] + r[1]) / 2, (piv[2] + r[2]) / 2];
      return [
        P.rbox([0, 0.5, 0.2], [0.42, 0.08, 1.1]),
        P.tube([0, 0.46, -0.2], [0, 0.03, -0.2]),
        P.tube([0, 0.46, 0.6], [0, 0.03, 0.6]),
        P.tube([0, 0.03, -0.45], [0, 0.03, 0.75]),
        P.tube([-0.3, 0.03, -0.45], [0.3, 0.03, -0.45]),
        P.tube([-0.3, 0.03, 0.75], [0.3, 0.03, 0.75]),
        P.tube([0.3, 0.03, -0.45], piv, 0.026),
        P.cyl([0.24, piv[1], piv[2]], [0.36, piv[1], piv[2]], 0.035, 'metal'),
        P.tube(piv, [0.3, r[1], r[2]], 0.022),
        P.cyl([-0.24, r[1], r[2]], [0.3, r[1], r[2]], 0.012, 'chrome'),
        P.cyl([-0.24, r[1], r[2]], [0.24, r[1], r[2]], 0.05, 'pad'),
        P.cyl(mid, [mid[0] + 0.16, mid[1], mid[2]], 0.02, 'chrome'),
        ...P.plates([mid[0] + 0.04, mid[1], mid[2]], [1, 0, 0], 0.13, 1),
        ...[-1, 1].map((sd) => P.tube([sd * 0.26, 0.42, 0.72], [sd * 0.12, 0.46, 0.6], 0.016)),
        ...P.grips(pts, 0.12),
      ];
    },
  },

  legExtension: {
    cam: SIDE,
    look: [0, 0.65, 0.25],
    pose: (t) => {
      const b = rad(L(-10, 80, t));
      return {
        pelvis: [0, 0.62, 0],
        lean: -15,
        headLean: -5,
        foot: add([0.1, 0.62, 0.43], [0, -Math.cos(b), Math.sin(b)], 0.46),
        knee: [0, 1, 1],
        toe: [0, Math.sin(b), Math.cos(b)],
        hand: [0.29, 0.53, 0.08],
        elbow: [0.4, 0, -1],
        gripR: 0.016,
      };
    },
    props: (pts, t) => {
      // The lever turns about the knee axis; its roller sits on the front of the ankles.
      const b = rad(L(-10, 80, t));
      const piv = [0.3, 0.62, 0.43];
      const r = [0, pts.anA.y + Math.sin(b) * 0.1, pts.anA.z + Math.cos(b) * 0.1];
      const mid = [0.3, (piv[1] + r[1]) / 2, (piv[2] + r[2]) / 2];
      return [
        P.pad([0, 0.62, 0], -15),
        P.rbox([0, 0.485, 0.17], [0.42, 0.08, 0.5]),
        P.tube([0, 0.44, 0.1], [0, 0.03, 0.1]),
        P.tube([0, 0.03, -0.4], [0, 0.03, 0.5]),
        P.tube([-0.3, 0.03, -0.4], [0.3, 0.03, -0.4]),
        P.tube([-0.3, 0.03, 0.5], [0.3, 0.03, 0.5]),
        P.tube([0.3, 0.03, 0.5], piv, 0.026),
        P.cyl([0.24, piv[1], piv[2]], [0.36, piv[1], piv[2]], 0.035, 'metal'),
        P.tube(piv, [0.3, r[1], r[2]], 0.022),
        P.cyl([-0.24, r[1], r[2]], [0.3, r[1], r[2]], 0.012, 'chrome'),
        P.cyl([-0.24, r[1], r[2]], [0.24, r[1], r[2]], 0.05, 'pad'),
        P.cyl(mid, [mid[0] + 0.16, mid[1], mid[2]], 0.02, 'chrome'),
        ...P.plates([mid[0] + 0.04, mid[1], mid[2]], [1, 0, 0], 0.13, 1),
        ...[-1, 1].map((sd) => P.tube([sd * 0.29, 0.53, 0.08], [sd * 0.2, 0.46, 0.08], 0.016)),
        ...P.grips(pts, 0.12),
      ];
    },
  },

  calfRaise: {
    cam: SIDE,
    look: [0, 0.8, 0],
    pose: (t) => {
      const ay = L(0.16, 0.28, t);
      const toe = norm([0, 0.13 - ay, 0.15]);
      return { pelvis: [0, ay + 0.88, -0.02], foot: [0.1, ay, -0.03], toe, hand: [0.27, ay + 0.83, 0.02] };
    },
    props: (pts) => [P.box([0, 0.05, 0.17], [0.6, 0.1, 0.22], 0, 'rubber'), ...P.dbs(pts)],
  },

  sidePlank: {
    cam: FRONT,
    look: [0, 0.4, 0],
    hold: true,
    pose: (t) => {
      const arm = armFK([0.19, 1.45, 0], [0.94, -0.34, 0], [0, 0, 1]);
      return {
        gRot: [0, 0, -70],
        gPos: [-0.75, 0.03, 0],
        pelvis: [0.05 - 0.05 * t, 0.97, 0],
        footA: [0.04, 0.086, 0],
        footB: [-0.07, 0.086, 0],
        handA: arm.hand,
        elbowA: arm.elbow,
        handFwdA: [0, 0, 1],
        handPalmA: [0.94, -0.34, 0],
        handB: [-0.23, 0.98, 0.06],
        elbowB: [-0.3, 0, -1],
        curlB: 0.3,
      };
    },
    props: () => [],
  },

  pallofPress: {
    cam: [2.2, 1.5, 3.2],
    look: [-0.55, 1.0, 0.2],
    dist: 1.3,
    pose: (t) => {
      // Both hands hold one D-handle at the breastbone: the left hand grips it, the right
      // hand wraps over the left. The cable pulls sideways; the arms press straight ahead.
      const h = L([0, 1.22, 0.2], [0, 1.22, 0.56], t);
      return {
        pelvis: [0, 0.91, 0],
        lean: 2,
        foot: [0.21, 0.086, 0],
        knee: [0.3, 0, 1],
        toe: [0.15, 0, 1],
        handA: h,
        handB: h,
        elbow: [0.7, -1, -0.3],
        gripRA: 0.015,
        gripRB: 0.04,
      };
    },
    props: (pts) => station('pallof', { x: -1.5, z: 0.38, face: [1, 0], pulleyY: 1.22 }, P.dHandle(pts.haA, [0, 1, 0], [-1.38, 1.22, 0.38])),
  },

  oneArmDbRow: {
    cam: [3.3, 1.2, 1.6],
    look: [0, 0.6, 0],
    pose: (t) => ({
      pelvis: [0, 0.85, -0.3],
      lean: 75,
      headLean: 60,
      footA: [0.15, 0.086, -0.55],
      footB: [-0.12, 0.086, -0.1],
      knee: [0, 0, 1],
      handA: L([0.22, 0.43, 0.2], [0.27, 0.82, 0.04], t),
      elbowA: [0.2, 1, -0.8],
      handB: [-0.2, 0.5, 0.3],
      elbowB: [-0.5, 0, -1],
      handFwdB: [0, 0, 1],
      handPalmB: [0, -1, 0],
    }),
    props: (pts) => [
      P.rbox([-0.25, 0.43, 0.45], [0.3, 0.08, 1.0]),
      P.tube([-0.25, 0.39, 0.1], [-0.25, 0.03, 0.1]),
      P.tube([-0.25, 0.39, 0.8], [-0.25, 0.03, 0.8]),
      P.tube([-0.45, 0.03, 0.1], [-0.05, 0.03, 0.1]),
      P.tube([-0.45, 0.03, 0.8], [-0.05, 0.03, 0.8]),
      ...P.db(pts.haA, pts.axA),
    ],
  },

  dips: {
    cam: QUARTER,
    look: [0, 1.15, 0],
    dist: 1.15,
    pose: (t) => {
      const lean = L(22, 8, t);
      const chest = [0, L(1.2, 1.62, t), L(0.08, 0.0, t)];
      const pelvis = add(chest, torsoDir(lean), -0.5);
      return {
        pelvis,
        lean,
        headLean: lean - 12,
        hand: [0.3, 1.05, 0],
        elbow: [0.15, 0, -1],
        handFwd: [0, 0, 1],
        handPalm: [0, -1, 0],
        curl: 0.9,
        gripR: 0.022,
        foot: add(pelvis, [0.1, -0.72, -0.38]),
        knee: [0, 0, 1],
        toe: [0, -1, -0.3],
      };
    },
    props: () =>
      [-1, 1].flatMap((sd) => [
        P.cyl([sd * 0.3, 1.05, -0.4], [sd * 0.3, 1.05, 0.35], 0.022, 'chrome'),
        P.cyl([sd * 0.3, 1.05, 0.23], [sd * 0.3, 1.05, 0.35], 0.026, 'rubber'),
        P.tube([sd * 0.3, 0.03, -0.4], [sd * 0.3, 1.05, -0.4], 0.03),
        P.tube([sd * 0.3, 0.55, -0.4], [sd * 0.3, 1.05, -0.05], 0.022),
        P.tube([sd * 0.3, 0.03, -0.65], [sd * 0.3, 0.03, 0.45]),
        P.tube([sd * 0.3, 0.5, -0.4], [0, 0.5, -0.4]),
      ]),
  },

  rearDeltFly: {
    cam: FRONT,
    look: [0, 0.8, 0.1],
    pose: (t) => {
      const pelvis = [0, 0.9, -0.25];
      const a = rad(L(5, 85, t));
      return {
        pelvis,
        lean: 70,
        headLean: 50,
        foot: [0.15, 0.086, -0.25],
        hand: add(sh(pelvis, 70), [Math.sin(a), -Math.cos(a), 0], 0.54),
        elbow: [0, 0.5, -1],
      };
    },
    props: (pts) => P.dbs(pts),
  },

  overheadTricepsExt: {
    cam: SIDE,
    look: [0, 1.1, -0.5],
    dist: 1.35,
    pose: (t) => {
      const pelvis = [0, 0.94, 0];
      const lean = 15;
      const up = rad(25);
      const g = rad(25 - L(125, 8, t));
      const arm = armFK(sh(pelvis, lean), [0.06, Math.cos(up), Math.sin(up)], [-0.25, Math.cos(g), Math.sin(g)]);
      return { pelvis, lean, footA: [0.12, 0.086, 0.25], footB: [-0.12, 0.086, -0.3], toeB: [0, -0.35, 1], hand: arm.hand, elbow: arm.elbow, gripR: 0.012 };
    },
    props: (pts) => station('ohext', { x: 0, z: -1.3, face: [0, 1], pulleyY: 1.75 }, P.rope(pts, [0, 1.75, -1.18])),
  },

  hangingKneeRaise: {
    cam: [2.8, 1.5, 3.4],
    look: [0, 1.2, 0],
    dist: 1.3,
    pose: (t) => ({
      pelvis: [0, 1.09, L(0, -0.04, t)],
      lean: L(0, -10, t),
      headLean: 0,
      hand: [0.28, 2.15, 0],
      elbow: [1, -0.3, -0.2],
      gripR: 0.018,
      foot: L([0.1, 0.2, 0.04], [0.1, 0.72, 0.4], t),
      knee: [0, 0.3, 1],
      toe: [0, -0.5, 1],
    }),
    props: () => [
      P.cyl([-0.68, 2.15, 0], [0.68, 2.15, 0], 0.018, 'chrome'),
      ...[-1, 1].flatMap((sd) => [P.tube([sd * 0.68, 0.03, 0], [sd * 0.68, 2.2, 0], 0.035), P.tube([sd * 0.68, 0.03, -0.6], [sd * 0.68, 0.03, 0.6]), P.tube([sd * 0.68, 0.7, 0], [sd * 0.68, 0.03, -0.5], 0.024)]),
    ],
  },

  rdl: {
    cam: SIDE,
    look: [0, 0.8, 0.1],
    pose: (t) => ({
      pelvis: L([0, 0.9, -0.24], [0, 0.95, 0], t),
      lean: L(70, 0, t),
      headLean: L(45, 0, t),
      foot: [0.13, 0.086, 0],
      knee: [0.1, 0, 1],
      hand: L([0.22, 0.5, 0.15], [0.22, 0.89, 0.13], t),
      elbow: [0.3, 0, -1],
      grip: -1,
    }),
    props: (pts) => P.bar(pts, 1.8, true),
  },

  bulgarianSplitSquat: {
    cam: SIDE,
    look: [0, 0.7, -0.15],
    pose: (t) => {
      const pelvis = L([0, 0.55, -0.02], [0, 0.88, 0], t);
      const lean = L(15, 8, t);
      const s = sh(pelvis, lean);
      return {
        pelvis,
        lean,
        headLean: 0,
        footA: [0.12, 0.086, 0.35],
        kneeA: [0, 0, 1],
        footB: [-0.12, 0.5, -0.55],
        kneeB: [0, -1, 0.3],
        toeB: [0, -0.3, -1],
        hand: [0.26, s[1] - 0.55, s[2]],
      };
    },
    props: (pts) => [
      P.rbox([0, 0.4, -0.75], [0.9, 0.08, 0.32]),
      P.tube([-0.35, 0.36, -0.75], [-0.35, 0.03, -0.75]),
      P.tube([0.35, 0.36, -0.75], [0.35, 0.03, -0.75]),
      P.tube([-0.35, 0.03, -0.95], [-0.35, 0.03, -0.55]),
      P.tube([0.35, 0.03, -0.95], [0.35, 0.03, -0.55]),
      ...P.dbs(pts),
    ],
  },

  hipThrust: {
    cam: SIDE,
    look: [0, 0.45, 0.1],
    pose: (t) => {
      const lean = L(-57, -88, t);
      const pelvis = add([0, 0.52, -0.3], torsoDir(lean), -0.5);
      const b = add(pelvis, frontDir(lean), 0.17);
      return { pelvis, lean, headLean: L(-40, -75, t), foot: [0.15, 0.086, 0.62], knee: [0, 1, 0.2], hand: [0.34, b[1], b[2]], elbow: [1, 0, -0.4], grip: -1 };
    },
    props: (pts) => [
      P.rbox([0, 0.36, -0.54], [1.0, 0.1, 0.3]),
      P.tube([-0.4, 0.31, -0.54], [-0.4, 0.03, -0.54]),
      P.tube([0.4, 0.31, -0.54], [0.4, 0.03, -0.54]),
      P.tube([-0.4, 0.03, -0.72], [-0.4, 0.03, -0.36]),
      P.tube([0.4, 0.03, -0.72], [0.4, 0.03, -0.36]),
      ...P.bar(pts, 1.8, true),
      P.cyl([-0.2, pts.haA.y, pts.haA.z], [0.2, pts.haA.y, pts.haA.z], 0.04, 'pad'),
    ],
  },

  backExtension: {
    cam: SIDE,
    look: [0, 0.75, 0.2],
    pose: (t) => {
      const pelvis = [0, 0.89, 0.08];
      const lean = L(120, 45, t);
      const m = add(add(pelvis, torsoDir(lean), 0.36), frontDir(lean), 0.16);
      return { pelvis, lean, headLean: lean - 10, foot: [0.1, 0.26, -0.56], toe: [0, -0.7, 0.7], knee: [0, -1, 1], hand: [-0.06, m[1], m[2]], elbow: [1, 0.3, 0], curl: 0.3 };
    },
    props: () => [
      P.rbox([0, 0.68, 0.17], [0.42, 0.1, 0.34], -45),
      P.tube([0, 0.63, 0.2], [0, 0.03, 0.4]),
      P.tube([0, 0.63, 0.2], [0, 0.14, -0.62]),
      P.cyl([-0.22, 0.2, -0.47], [0.22, 0.2, -0.47], 0.05, 'pad'),
      P.box([0, 0.1, -0.68], [0.4, 0.24, 0.03], -45, 'metal'),
      P.tube([0, 0.03, -0.7], [0, 0.03, 0.4]),
      P.tube([-0.25, 0.03, 0.4], [0.25, 0.03, 0.4]),
      P.tube([-0.25, 0.03, -0.7], [0.25, 0.03, -0.7]),
    ],
  },

  inclineWalk: {
    cam: SIDE,
    look: [0, 0.85, 0],
    loop: 1.1,
    pose: (t) => {
      const p = 2 * Math.PI * t;
      const step = (ph) => [0.11, 0.09 + 0.09 * Math.max(0, Math.cos(ph)), 0.27 * Math.sin(ph)];
      const a = step(p);
      const b = step(p + Math.PI);
      return {
        gRot: [-6, 0, 0],
        gPos: [0, 0.17, 0],
        pelvis: [0, 0.95 + 0.012 * Math.cos(2 * p), 0],
        lean: 12,
        headLean: 6,
        footA: a,
        footB: [-b[0], b[1], b[2]],
        handA: [0.27, 0.95, -0.2 * Math.sin(p) + 0.05],
        handB: [-0.27, 0.95, 0.2 * Math.sin(p) + 0.05],
        curl: 0.5,
      };
    },
    props: () => [
      P.box([0, -0.085, 0.05], [0.8, 0.15, 1.8]),
      P.box([0, -0.005, 0.05], [0.56, 0.02, 1.66], 0, 'rubber'),
      P.box([0.34, 0.0, 0.05], [0.1, 0.03, 1.8], 0, 'metal'),
      P.box([-0.34, 0.0, 0.05], [0.1, 0.03, 1.8], 0, 'metal'),
      P.tube([0.4, -0.05, 0.75], [0.4, 1.15, 0.9]),
      P.tube([-0.4, -0.05, 0.75], [-0.4, 1.15, 0.9]),
      P.cyl([-0.4, 1.15, 0.9], [0.4, 1.15, 0.9], 0.022, 'rubber'),
      P.tube([0.4, 1.0, 0.88], [0.4, 0.95, 0.45], 0.02),
      P.tube([-0.4, 1.0, 0.88], [-0.4, 0.95, 0.45], 0.02),
      P.rbox([0, 1.27, 0.94], [0.44, 0.24, 0.04], -25, 'rubber', 0.015),
      P.box([0, 1.27, 0.915], [0.3, 0.14, 0.005], -25, 'accent'),
    ],
  },

  catCow: {
    cam: SIDE,
    look: [0, 0.4, 0.2],
    pose: (t) => ({ ...allFours, arch: L(0.05, -0.08, t), headLean: L(55, 125, t) }),
    props: () => [],
  },

  birdDog: {
    cam: SIDE,
    look: [0, 0.45, 0.1],
    dist: 1.15,
    pose: (t) => ({
      ...allFours,
      headLean: 80,
      handA: L([0.2, 0.04, 0.5], [0.2, 0.6, 1.02], t),
      footB: L([-0.1, 0.07, -0.45], [-0.1, 0.5, -0.88], t),
      toeB: [0, -0.4, -1],
    }),
    props: () => [],
  },

  deadBug: {
    cam: SIDE,
    look: [0, 0.35, 0],
    dist: 1.15,
    pose: (t) => ({
      pelvis: [0, 0.12, 0],
      lean: -90,
      hand: [0.2, 0.68, -0.5],
      handA: L([0.2, 0.68, -0.5], [0.2, 0.2, -1.02], t),
      elbow: [0.3, 0, 1],
      curl: 0.25,
      foot: [0.1, 0.57, 0.45],
      footB: L([-0.1, 0.57, 0.45], [-0.1, 0.2, 0.86], t),
      knee: [0, 1, -0.3],
      toe: [0, 1, 0.2],
    }),
    props: () => [],
  },

  gluteBridge: {
    cam: SIDE,
    look: [0, 0.3, 0],
    pose: (t) => {
      const lean = L(-90, -127, t);
      const pelvis = add([0, 0.12, -0.5], torsoDir(lean), -0.5);
      return { pelvis, lean, headLean: -90, foot: [0.15, 0.086, 0.45], knee: [0, 1, 0], hand: [0.3, 0.04, 0.0], elbow: [1, 0, 0], ...ON_FLOOR };
    },
    props: () => [],
  },
};
