// One entry per movement. pose(t) returns rig targets for t in 0..1 (0 = start,
// 1 = end of the lifting phase); props(pts, t) returns the equipment for that frame.
// Units are metres, Y is up, the figure faces +Z, side A is +X.
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
const armFK = (S, u, f) => {
  u = norm(u);
  const e = add(S, u, 0.3);
  return { hand: add(e, norm(f), 0.27), elbow: u };
};

const SIDE = [3.5, 1.15, 1.3];
const FRONT = [1.3, 1.3, 3.6];
const QUARTER = [2.5, 1.4, 2.9];

const SEATED_FEET = { foot: [0.18, 0.07, 0.42], knee: [0, 1, 0.4] };

// Straight body supported on the toes with the chest at height h (push-up, plank).
function plankBody(h) {
  const a = Math.asin((h - 0.1) / 1.4);
  const d = [0, Math.sin(a), Math.cos(a)];
  const ankle = [0, 0.1, -1.36];
  return {
    pelvis: add(ankle, d, 0.9),
    lean: 90 - (a * 180) / Math.PI,
    foot: [0.09, 0.1, -1.36],
    toe: [0, -1, 0.25],
    knee: [0, -1, 0],
  };
}

function curl(t, { lean = 0, pelvis = [0, 0.95, 0], upper = [0.06, -1, 0.03], from = 8, to = 140 }) {
  const a = rad(L(from, to, t));
  const arm = armFK(sh(pelvis, lean), upper, [0, -Math.cos(a), Math.sin(a)]);
  return { arm, a };
}

function seatedPress(t) {
  const pelvis = [0, 0.5, 0];
  return {
    pelvis,
    lean: -8,
    ...SEATED_FEET,
    hand: L([0.37, 1.04, 0.06], [0.21, 1.54, -0.05], t),
    elbow: [0.9, -1, 0.15],
  };
}

function pulldown(width) {
  return {
    cam: QUARTER,
    look: [0, 1.05, 0],
    dist: 1.15,
    pose: (t) => ({
      pelvis: [0, 0.5, 0],
      lean: L(-4, -14, t),
      foot: [0.16, 0.07, 0.36],
      knee: [0, 1, 0.4],
      hand: L([width, 1.54, 0.04], [width - 0.03, 1.1, 0.13], t),
      elbow: [0.6, -1, -0.35],
    }),
    props: (pts) => [
      ...P.bar(pts, width * 2 + 0.35),
      P.cable(P.midpoint(pts.haA, pts.haB), [0, 2.15, 0.08]),
      P.column(0, 0.75, 2.2),
      P.cyl([0, 2.17, 0.75], [0, 2.17, 0.02], 0.03),
      ...P.seat([0, 0.5, 0]),
      P.cyl([-0.26, 0.68, 0.22], [0.26, 0.68, 0.22], 0.05, 'pad'),
      P.cyl([0, 0.68, 0.22], [0, 0.68, 0.75], 0.025),
    ],
  };
}

function machinePress(end) {
  return {
    cam: QUARTER,
    pose: (t) => ({
      pelvis: [0, 0.5, 0],
      lean: -10,
      ...SEATED_FEET,
      hand: L([0.31, 0.97, 0.08], end, t),
      elbow: [1, -0.45, -0.3],
    }),
    props: (pts) => [
      P.pad([0, 0.5, 0], -10),
      ...P.seat([0, 0.5, 0]),
      P.column(0, -0.38, 1.75),
      P.cyl([0, 1.75, -0.38], [0, 1.7, 0.05], 0.03),
      P.cyl([-0.32, 1.7, 0.05], [0.32, 1.7, 0.05], 0.03),
      ...['haA', 'haB'].flatMap((k) => {
        const h = pts[k];
        return [P.cyl([h.x, h.y - 0.08, h.z], [h.x, h.y + 0.08, h.z], 0.018), P.cyl([h.x, h.y + 0.08, h.z], [Math.sign(h.x) * 0.32, 1.7, 0.05], 0.02)];
      }),
    ],
  };
}

const allFours = { pelvis: [0, 0.51, 0], lean: 82, hand: [0.2, 0.04, 0.5], elbow: [0.4, 0, -1], foot: [0.1, 0.06, -0.45], knee: [0, -0.6, 1], toe: [0, -0.3, -1] };

export const ANIMS = {
  inclineDbPress: {
    cam: QUARTER,
    pose: (t) => ({
      pelvis: [0, 0.5, 0],
      lean: -40,
      foot: [0.2, 0.07, 0.5],
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
      foot: [0.22, 0.07, 0.75],
      knee: [0, 1, 0.5],
      hand: L([0.37, 0.6, -0.2], [0.2, 1.1, -0.25], t),
      elbow: [1, -0.6, 0.3],
    }),
    props: (pts) => [...P.bench([0, 0.56, 0.25], -90, 1.15), ...P.dbs(pts)],
  },

  machineChestPress: machinePress([0.24, 0.98, 0.46]),
  inclineMachinePress: machinePress([0.24, 1.3, 0.37]),

  seatedDbPress: {
    cam: FRONT,
    look: [0, 0.95, 0],
    pose: seatedPress,
    props: (pts) => [P.pad([0, 0.5, 0], -8), ...P.seat([0, 0.5, 0]), ...P.dbs(pts)],
  },

  machineShoulderPress: {
    cam: QUARTER,
    look: [0, 0.95, 0],
    pose: seatedPress,
    props: (pts) => [
      P.pad([0, 0.5, 0], -8),
      ...P.seat([0, 0.5, 0]),
      P.column(0, -0.5, 1.3),
      P.cyl([-0.36, 1.25, -0.5], [0.36, 1.25, -0.5], 0.03),
      ...['haA', 'haB'].flatMap((k) => {
        const h = pts[k];
        return [P.cyl([h.x, h.y, h.z - 0.08], [h.x, h.y, h.z + 0.08], 0.018), P.cyl([h.x, h.y, h.z - 0.08], [Math.sign(h.x) * 0.36, 1.25, -0.5], 0.02)];
      }),
    ],
  },

  cableFly: {
    cam: FRONT,
    look: [0, 1.0, 0],
    dist: 1.2,
    pose: (t) => {
      const a = rad(90 * t);
      return {
        pelvis: [0, 0.94, 0],
        lean: 10,
        foot: [0.16, 0.07, 0],
        hand: [0.04 + 0.68 * Math.cos(a), 1.4 - 0.2 * Math.sin(a), 0.07 + 0.45 * Math.sin(a)],
        elbow: [0.3, 0.2, -1],
      };
    },
    props: (pts) => [P.column(1.05, -0.1), P.column(-1.05, -0.1), P.cable(pts.haA, [1.05, 1.95, -0.1]), P.cable(pts.haB, [-1.05, 1.95, -0.1])],
  },

  lateralRaise: {
    cam: FRONT,
    look: [0, 0.95, 0],
    pose: (t) => {
      const a = rad(L(8, 88, t));
      return { hand: add([0.2, 1.45, 0], [Math.sin(a), -Math.cos(a), 0.1], 0.55), elbow: [0, 0.3, -1] };
    },
    props: (pts) => P.dbs(pts, [0, 0, 1]),
  },

  ropePushdown: {
    cam: SIDE,
    look: [0, 1.0, 0.15],
    pose: (t) => {
      const pelvis = [0, 0.95, -0.02];
      const a = rad(L(100, 6, t));
      const arm = armFK(sh(pelvis, 12), [0.1, -1, 0.02], [0, -Math.cos(a), Math.sin(a)]);
      return { pelvis, lean: 12, foot: [0.14, 0.07, 0], hand: arm.hand, elbow: arm.elbow };
    },
    props: (pts) => [P.column(0, 0.7), P.cyl([0, 2.08, 0.7], [0, 2.08, 0.42], 0.03), P.cable(pts.haA, [0, 2.05, 0.42]), P.cable(pts.haB, [0, 2.05, 0.42])],
  },

  pushUp: {
    cam: SIDE,
    look: [0, 0.3, -0.6],
    pose: (t) => ({ ...plankBody(L(0.2, 0.6, t)), hand: [0.3, 0.04, 0], elbow: [0.6, 0.2, -1] }),
    props: () => [],
  },

  plank: {
    cam: SIDE,
    look: [0, 0.25, -0.6],
    hold: true,
    pose: (t) => ({ ...plankBody(0.35 + 0.012 * t), hand: [0.15, 0.05, 0.3], elbow: [0, -1, -0.15] }),
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
      foot: [0.15, 0.07, -0.78],
      knee: [0, -0.2, 1],
      toe: [0, -0.6, 1],
      hand: L([0.22, 0.52, 0.15], [0.27, 0.88, 0.02], t),
      elbow: [0.3, 0.6, -1],
    }),
    props: (pts) => [
      P.pad([0, 0.75, -0.25], 50, 0.8, 1),
      P.box([0, 0.42, 0.3], [0.1, 0.84, 0.1], 0, 'metal'),
      P.box([0, 0.25, -0.12], [0.1, 0.5, 0.1], 0, 'metal'),
      P.box([0, 0.03, 0.05], [0.5, 0.05, 0.9], 0, 'metal'),
      ...P.dbs(pts, [0, 0, 1]),
    ],
  },

  seatedCableRow: {
    cam: SIDE,
    look: [0, 0.7, 0.5],
    dist: 1.1,
    pose: (t) => ({
      pelvis: [0, 0.5, 0],
      lean: L(8, -5, t),
      foot: [0.12, 0.45, 0.83],
      knee: [0, 1, 0],
      toe: [0, 1, 0.3],
      hand: L([0.1, 0.86, 0.5], [0.14, 0.8, 0.14], t),
      elbow: [0.3, -0.2, -1],
    }),
    props: (pts) => [
      P.box([0, 0.3, 0.05], [0.34, 0.1, 0.9]),
      P.box([0, 0.13, 0.05], [0.12, 0.26, 0.6], 0, 'metal'),
      P.box([0, 0.5, 0.97], [0.5, 0.3, 0.04], -15, 'metal'),
      P.column(0, 1.4, 1.3),
      ...P.bar(pts, 0.34),
      P.cable(P.midpoint(pts.haA, pts.haB), [0, 0.75, 1.38]),
    ],
  },

  facePull: {
    cam: QUARTER,
    look: [0, 1.05, 0.4],
    dist: 1.15,
    pose: (t) => ({
      foot: [0.16, 0.07, 0],
      lean: -3,
      hand: L([0.08, 1.55, 0.52], [0.32, 1.62, 0.04], t),
      elbow: [1, 0.35, -0.3],
    }),
    props: (pts) => [P.column(0, 1.3), P.cable(pts.haA, [0, 1.72, 1.27]), P.cable(pts.haB, [0, 1.72, 1.27])],
  },

  dbCurl: {
    cam: QUARTER,
    look: [0, 0.95, 0],
    pose: (t) => {
      const { arm } = curl(t, {});
      return { hand: arm.hand, elbow: arm.elbow };
    },
    props: (pts) => P.dbs(pts, [1, 0, 0]),
  },

  hammerCurl: {
    cam: QUARTER,
    look: [0, 0.95, 0],
    pose: (t) => {
      const { arm } = curl(t, {});
      return { hand: arm.hand, elbow: arm.elbow };
    },
    props: (pts, t) => {
      const a = rad(L(8, 140, t));
      return P.dbs(pts, [0, Math.sin(a), Math.cos(a)]);
    },
  },

  ezCurl: {
    cam: QUARTER,
    look: [0, 0.95, 0],
    pose: (t) => {
      const { arm } = curl(t, { upper: [0.02, -1, 0.03] });
      return { hand: arm.hand, elbow: arm.elbow };
    },
    props: (pts) => P.bar(pts, 1.2, true).map((s) => (s.c === 'weight' ? { ...s, r: 0.11 } : s)),
  },

  inclineDbCurl: {
    cam: SIDE,
    look: [0, 0.7, -0.1],
    pose: (t) => {
      const pelvis = [0, 0.5, 0];
      const { arm } = curl(t, { pelvis, lean: -35, upper: [0.05, -1, -0.05], from: 5, to: 130 });
      return { pelvis, lean: -35, foot: [0.2, 0.07, 0.5], knee: [0, 1, 0.3], hand: arm.hand, elbow: arm.elbow };
    },
    props: (pts) => [...P.bench([0, 0.5, 0], -35), ...P.dbs(pts, [1, 0, 0])],
  },

  legPress: {
    cam: SIDE,
    look: [0, 0.6, 0.25],
    pose: (t) => ({
      pelvis: [0, 0.35, 0],
      lean: -50,
      foot: L([0.14, 0.66, 0.37], [0.14, 0.88, 0.63], t),
      knee: [0.15, 1, -0.2],
      toe: [0, 0.77, -0.64],
      hand: [0.29, 0.33, 0.08],
      elbow: [0.5, 0, -1],
    }),
    props: (pts) => {
      const m = P.midpoint(pts.anA, pts.anB);
      const c = [0, m[1] + 0.1, m[2] - 0.01];
      return [
        P.pad([0, 0.35, 0], -50),
        P.box([0, 0.1, -0.05], [0.36, 0.2, 0.55], 0, 'metal'),
        P.box(c, [0.55, 0.5, 0.04], -40, 'metal'),
        P.cyl([0.33, 0.25, 0.2], [0.33, 1.0, 1.1], 0.025),
        P.cyl([-0.33, 0.25, 0.2], [-0.33, 1.0, 1.1], 0.025),
        P.cyl([0.33, 1.0, 1.1], [0.33, 0, 1.1], 0.025),
        P.cyl([-0.33, 1.0, 1.1], [-0.33, 0, 1.1], 0.025),
      ];
    },
  },

  gobletSquat: {
    cam: QUARTER,
    pose: (t) => {
      const pelvis = L([0, 0.5, -0.24], [0, 0.95, 0], t);
      const lean = L(26, 3, t);
      const c = chestOf(pelvis, lean);
      const hand = add(add(c, frontDir(lean), 0.2), torsoDir(lean), -0.1);
      return { pelvis, lean, foot: [0.2, 0.07, 0], knee: [0.4, 0, 1], hand: [0.06, hand[1], hand[2]], elbow: [0.5, -1, 0] };
    },
    props: (pts) => {
      const m = P.midpoint(pts.haA, pts.haB);
      return P.db(m, [0, 1, 0]);
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
        foot: add([0.1, 0.62, -0.45], [0, Math.sin(b), -Math.cos(b)], 0.45),
        knee: [0, -1, -0.2],
        toe: [0, -Math.cos(b), -Math.sin(b)],
        hand: [0.25, 0.45, 0.75],
        elbow: [1, 0, -0.3],
      };
    },
    props: (pts, t) => {
      const b = rad(L(5, 115, t));
      const r = [0, pts.anA.y + Math.cos(b) * 0.1, pts.anA.z + Math.sin(b) * 0.1];
      return [
        P.box([0, 0.5, 0.15], [0.4, 0.1, 1.15]),
        P.box([0, 0.22, 0.15], [0.14, 0.45, 0.7], 0, 'metal'),
        P.cyl([-0.24, r[1], r[2]], [0.24, r[1], r[2]], 0.05, 'pad'),
        P.cyl([0.27, 0.6, -0.45], [0.27, r[1], r[2]], 0.02),
        P.cyl([0.27, 0.6, -0.45], [0.27, 0.3, -0.1], 0.02),
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
        foot: add([0.1, 0.62, 0.45], [0, -Math.cos(b), Math.sin(b)], 0.45),
        knee: [0, 1, 1],
        toe: [0, Math.sin(b), Math.cos(b)],
        hand: [0.28, 0.55, 0.05],
        elbow: [0.4, 0, -1],
      };
    },
    props: (pts, t) => {
      const b = rad(L(-10, 80, t));
      const r = [0, pts.anA.y + Math.sin(b) * 0.1, pts.anA.z + Math.cos(b) * 0.1];
      return [
        P.pad([0, 0.62, 0], -15),
        P.box([0, 0.47, 0.2], [0.4, 0.08, 0.5]),
        P.box([0, 0.22, 0.1], [0.14, 0.44, 0.3], 0, 'metal'),
        P.cyl([-0.24, r[1], r[2]], [0.24, r[1], r[2]], 0.05, 'pad'),
        P.cyl([0.27, 0.6, 0.45], [0.27, r[1], r[2]], 0.02),
      ];
    },
  },

  calfRaise: {
    cam: SIDE,
    look: [0, 0.8, 0],
    pose: (t) => {
      const ay = L(0.15, 0.27, t);
      const toe = norm([0, 0.13 - ay, 0.15]);
      return { pelvis: [0, ay + 0.895, -0.02], foot: [0.1, ay, -0.03], toe, hand: [0.27, ay + 0.84, 0.02] };
    },
    props: (pts) => [P.box([0, 0.05, 0.16], [0.6, 0.1, 0.22], 0, 'metal'), ...P.dbs(pts, [0, 0, 1])],
  },

  sidePlank: {
    cam: FRONT,
    look: [0, 0.4, 0],
    hold: true,
    pose: (t) => {
      const arm = armFK([0.2, 1.47, 0], [0.94, -0.34, 0], [0, 0, 1]);
      return {
        gRot: [0, 0, -70],
        gPos: [-0.75, 0, 0],
        pelvis: [0.05 - 0.05 * t, 0.97, 0],
        footA: [0.04, 0.07, 0],
        footB: [-0.07, 0.07, 0],
        handA: arm.hand,
        elbowA: arm.elbow,
        handB: [-0.21, 0.98, 0.06],
        elbowB: [-0.3, 0, -1],
      };
    },
    props: () => [],
  },

  pallofPress: {
    cam: QUARTER,
    look: [-0.3, 0.95, 0.1],
    dist: 1.1,
    pose: (t) => {
      const h = L([0.03, 1.2, 0.16], [0.03, 1.2, 0.55], t);
      return { pelvis: [0, 0.92, 0], foot: [0.2, 0.07, 0], handA: h, handB: [-h[0], h[1], h[2]], elbow: [0.6, -1, -0.2] };
    },
    props: (pts) => [P.column(-1.3, 0.15, 1.9), P.cable(P.midpoint(pts.haA, pts.haB), [-1.3, 1.2, 0.15])],
  },

  oneArmDbRow: {
    cam: [3.3, 1.2, 1.6],
    look: [0, 0.6, 0],
    pose: (t) => ({
      pelvis: [0, 0.85, -0.3],
      lean: 75,
      footA: [0.15, 0.07, -0.55],
      footB: [-0.12, 0.07, -0.1],
      knee: [0, 0, 1],
      handA: L([0.22, 0.43, 0.2], [0.27, 0.82, 0.04], t),
      elbowA: [0.2, 1, -0.8],
      handB: [-0.2, 0.5, 0.27],
      elbowB: [-0.5, 0, -1],
    }),
    props: (pts) => [P.box([-0.25, 0.43, 0.4], [0.3, 0.08, 1.0]), P.box([-0.25, 0.2, 0.4], [0.1, 0.4, 0.6], 0, 'metal'), ...P.db(pts.haA, [0, 0, 1])],
  },

  dips: {
    cam: QUARTER,
    look: [0, 1.15, 0],
    dist: 1.15,
    pose: (t) => {
      const lean = L(22, 8, t);
      const chest = [0, L(1.2, 1.62, t), L(0.08, 0.0, t)];
      const d = torsoDir(lean);
      const pelvis = add(chest, d, -0.5);
      return { pelvis, lean, hand: [0.3, 1.09, 0], elbow: [0.15, 0, -1], foot: add(pelvis, [0.1, -0.72, -0.38]), knee: [0, 0, 1], toe: [0, -1, -0.3] };
    },
    props: () => [
      P.cyl([0.3, 1.05, -0.4], [0.3, 1.05, 0.35], 0.025),
      P.cyl([-0.3, 1.05, -0.4], [-0.3, 1.05, 0.35], 0.025),
      P.column(0.3, -0.4, 1.05),
      P.column(-0.3, -0.4, 1.05),
    ],
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
        foot: [0.15, 0.07, -0.25],
        hand: add(sh(pelvis, 70), [Math.sin(a), -Math.cos(a), 0], 0.54),
        elbow: [0, 0.5, -1],
      };
    },
    props: (pts) => P.dbs(pts, [0, 0, 1]),
  },

  overheadTricepsExt: {
    cam: SIDE,
    look: [0, 1.05, -0.2],
    dist: 1.15,
    pose: (t) => {
      const pelvis = [0, 0.94, 0];
      const lean = 15;
      const up = rad(25);
      const g = rad(25 - L(125, 8, t));
      const arm = armFK(sh(pelvis, lean), [0.06, Math.cos(up), Math.sin(up)], [-0.25, Math.cos(g), Math.sin(g)]);
      return { pelvis, lean, footA: [0.12, 0.07, 0.25], footB: [-0.12, 0.07, -0.3], hand: arm.hand, elbow: arm.elbow };
    },
    props: (pts) => [P.column(0, -1.1), P.cable(pts.haA, [0, 1.75, -1.07]), P.cable(pts.haB, [0, 1.75, -1.07])],
  },

  hangingKneeRaise: {
    cam: [2.8, 1.5, 3.4],
    look: [0, 1.2, 0],
    dist: 1.3,
    pose: (t) => ({
      pelvis: [0, 1.09, L(0, -0.04, t)],
      lean: L(0, -10, t),
      hand: [0.26, 2.15, 0],
      foot: L([0.1, 0.2, 0.04], [0.1, 0.72, 0.4], t),
      knee: [0, 0.3, 1],
      toe: [0, -0.5, 1],
    }),
    props: () => [P.cyl([-0.65, 2.15, 0], [0.65, 2.15, 0], 0.02), P.column(0.65, 0, 2.15), P.column(-0.65, 0, 2.15)],
  },

  rdl: {
    cam: SIDE,
    look: [0, 0.8, 0.1],
    pose: (t) => ({
      pelvis: L([0, 0.9, -0.24], [0, 0.95, 0], t),
      lean: L(70, 0, t),
      foot: [0.13, 0.07, 0],
      knee: [0.1, 0, 1],
      hand: L([0.22, 0.5, 0.15], [0.22, 0.89, 0.13], t),
      elbow: [0.3, 0, -1],
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
        footA: [0.12, 0.07, 0.35],
        kneeA: [0, 0, 1],
        footB: [-0.12, 0.5, -0.55],
        kneeB: [0, -1, 0.3],
        toeB: [0, -0.3, -1],
        hand: [0.26, s[1] - 0.55, s[2]],
      };
    },
    props: (pts) => [P.box([0, 0.4, -0.75], [0.9, 0.08, 0.35]), P.box([0, 0.18, -0.75], [0.6, 0.36, 0.1], 0, 'metal'), ...P.dbs(pts, [0, 0, 1])],
  },

  hipThrust: {
    cam: SIDE,
    look: [0, 0.45, 0.1],
    pose: (t) => {
      const lean = L(-57, -88, t);
      const d = torsoDir(lean);
      const pelvis = add([0, 0.52, -0.3], d, -0.5);
      const f = frontDir(lean);
      const b = add(pelvis, f, 0.15);
      return { pelvis, lean, headLean: L(-40, -75, t), foot: [0.15, 0.07, 0.62], knee: [0, 1, 0.2], hand: [0.33, b[1], b[2]], elbow: [1, 0, -0.4] };
    },
    props: (pts) => [P.box([0, 0.36, -0.52], [1.0, 0.1, 0.32]), P.box([0, 0.15, -0.52], [0.7, 0.3, 0.1], 0, 'metal'), ...P.bar(pts, 1.8, true)],
  },

  backExtension: {
    cam: SIDE,
    look: [0, 0.75, 0.2],
    pose: (t) => {
      const pelvis = [0, 0.89, 0.08];
      const lean = L(120, 45, t);
      const m = add(add(pelvis, torsoDir(lean), 0.3), frontDir(lean), 0.14);
      return { pelvis, lean, foot: [0.1, 0.25, -0.56], toe: [0, -0.7, 0.7], knee: [0, -1, 1], hand: [0.05, m[1], m[2]], elbow: [1, 0.3, 0] };
    },
    props: () => [
      P.box([0, 0.7, 0.13], [0.42, 0.1, 0.36], -45),
      P.cyl([0, 0.66, 0.17], [0, 0, 0.35], 0.03),
      P.cyl([0, 0.66, 0.17], [0, 0.12, -0.6], 0.03),
      P.cyl([-0.22, 0.2, -0.47], [0.22, 0.2, -0.47], 0.05, 'pad'),
      P.box([0, 0.03, -0.1], [0.5, 0.05, 1.2], 0, 'metal'),
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
        pelvis: [0, 0.95 + 0.012 * Math.cos(2 * p), 0],
        lean: 12,
        footA: a,
        footB: [-b[0], b[1], b[2]],
        handA: [0.27, 0.95, -0.2 * Math.sin(p) + 0.05],
        handB: [-0.27, 0.95, 0.2 * Math.sin(p) + 0.05],
      };
    },
    props: () => [
      P.box([0, 0.0, 0.05], [0.75, 0.05, 1.7], 0, 'weight'),
      P.cyl([0.4, 0, 0.7], [0.4, 1.15, 0.85], 0.025),
      P.cyl([-0.4, 0, 0.7], [-0.4, 1.15, 0.85], 0.025),
      P.cyl([-0.4, 1.15, 0.85], [0.4, 1.15, 0.85], 0.025),
      P.box([0, 1.22, 0.88], [0.4, 0.2, 0.04], -25),
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
      footB: L([-0.1, 0.06, -0.45], [-0.1, 0.5, -0.88], t),
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
      return { pelvis, lean, headLean: -90, foot: [0.15, 0.07, 0.45], knee: [0, 1, 0], hand: [0.3, 0.05, -0.05], elbow: [1, 0, 0] };
    },
    props: () => [],
  },
};
