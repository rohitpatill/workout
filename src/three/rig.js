// Procedural mannequin. A pose is a small set of targets (pelvis, torso lean, hand and
// foot positions); elbows and knees are solved with two-bone IK, and every body part is
// a cylinder or sphere stretched between the solved points.
import * as THREE from 'three';

const rad = (d) => (d * Math.PI) / 180;
const v3 = (a) => (a.isVector3 ? a.clone() : new THREE.Vector3(a[0], a[1], a[2]));
const mirror = (a) => [-a[0], a[1], a[2]];

export const BODY = { torso: 0.5, shoulderW: 0.2, hipW: 0.1, upper: 0.3, fore: 0.27, thigh: 0.45, shin: 0.45, head: 0.2 };

// lean: 0 = upright, +90 = horizontal face down, -90 = lying on the back (head toward -Z).
export const torsoDir = (lean) => [0, Math.cos(rad(lean)), Math.sin(rad(lean))];
export const frontDir = (lean) => [0, -Math.sin(rad(lean)), Math.cos(rad(lean))];
export const chestOf = (pelvis, lean) => {
  const d = torsoDir(lean);
  return [pelvis[0], pelvis[1] + d[1] * BODY.torso, pelvis[2] + d[2] * BODY.torso];
};

const DEFAULTS = {
  pelvis: [0, 0.95, 0],
  lean: 0,
  arch: 0,
  hand: [0.26, 0.9, 0.03],
  elbow: [0.3, -0.2, -1],
  foot: [0.11, 0.07, 0],
  knee: [0.12, 0, 1],
  toe: [0, 0, 1],
};

function ik(S, T, l1, l2, pole) {
  const d = T.clone().sub(S);
  let len = d.length();
  if (len < 1e-5) {
    d.set(0, -1, 0);
    len = 1e-5;
  }
  d.normalize();
  const L = Math.min(Math.max(len, Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-4);
  const a = (l1 * l1 - l2 * l2 + L * L) / (2 * L);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const p = pole.clone().addScaledVector(d, -pole.dot(d));
  if (p.lengthSq() < 1e-8) p.set(0, 0, 1).addScaledVector(d, -d.z);
  p.normalize();
  return {
    mid: S.clone().addScaledVector(d, a).addScaledVector(p, h),
    end: S.clone().addScaledVector(d, L),
  };
}

// Side A is +X, side B is -X. A plain `hand` / `foot` / `elbow` / `knee` / `toe` value is
// mirrored to both sides; `handA`, `handB` etc. override one side.
export function solve(pose) {
  const q = { ...DEFAULTS, ...pose };
  const dir = v3(torsoDir(q.lean));
  const front = v3(frontDir(q.lean));
  const pelvis = v3(q.pelvis);
  const chest = pelvis.clone().addScaledVector(dir, BODY.torso);
  const mid = pelvis.clone().addScaledVector(dir, BODY.torso / 2).addScaledVector(front, q.arch);
  const head = chest.clone().addScaledVector(v3(torsoDir(q.headLean ?? q.lean)), BODY.head);
  const pts = { pelvis, chest, mid, head };
  for (const [key, s] of [['A', 1], ['B', -1]]) {
    const pick = (name) => q[name + key] ?? (s > 0 ? q[name] : mirror(q[name]));
    const sh = chest.clone().add(new THREE.Vector3(s * BODY.shoulderW, 0, 0));
    const hip = pelvis.clone().add(new THREE.Vector3(s * BODY.hipW, 0, 0));
    const arm = ik(sh, v3(pick('hand')), BODY.upper, BODY.fore, v3(pick('elbow')));
    const leg = ik(hip, v3(pick('foot')), BODY.thigh, BODY.shin, v3(pick('knee')));
    pts['sh' + key] = sh;
    pts['el' + key] = arm.mid;
    pts['ha' + key] = arm.end;
    pts['hip' + key] = hip;
    pts['kn' + key] = leg.mid;
    pts['an' + key] = leg.end;
    pts['toe' + key] = leg.end.clone().addScaledVector(v3(pick('toe')).normalize(), 0.17);
  }
  return pts;
}

const Y = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();

function placeCyl(mesh, a, b, rx, rz = rx) {
  tmp.subVectors(b, a);
  const len = Math.max(tmp.length(), 1e-4);
  mesh.position.addVectors(a, b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(Y, tmp.divideScalar(len));
  mesh.scale.set(rx, len, rz);
}

export const GEO = {
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  taper: new THREE.CylinderGeometry(1, 0.82, 1, 18),
  sph: new THREE.SphereGeometry(1, 22, 16),
  box: new THREE.BoxGeometry(1, 1, 1),
};

export class Mannequin {
  constructor() {
    this.group = new THREE.Group();
    this.matBody = new THREE.MeshStandardMaterial({ color: 0xc9d1de, roughness: 0.55, metalness: 0.05 });
    this.matHot = new THREE.MeshStandardMaterial({ color: 0xff7a3d, roughness: 0.5, emissive: 0x4a1a05 });
    this.parts = [];
    const add = (geo, keys) => {
      const mesh = new THREE.Mesh(geo, this.matBody);
      this.group.add(mesh);
      this.parts.push({ mesh, keys });
      return mesh;
    };
    this.m = {
      lower: add(GEO.cyl, ['core']),
      upper: add(GEO.taper, ['chest', 'back']),
      pelvis: add(GEO.sph, ['glutes']),
      yoke: add(GEO.cyl, ['chest', 'back']),
      neck: add(GEO.cyl, []),
      head: add(GEO.sph, []),
    };
    for (const k of ['A', 'B']) {
      this.m['sh' + k] = add(GEO.sph, ['shoulders']);
      this.m['ua' + k] = add(GEO.cyl, ['arms']);
      this.m['el' + k] = add(GEO.sph, ['arms']);
      this.m['fa' + k] = add(GEO.cyl, ['forearms']);
      this.m['ha' + k] = add(GEO.sph, []);
      this.m['hip' + k] = add(GEO.sph, ['glutes']);
      this.m['th' + k] = add(GEO.cyl, ['legs']);
      this.m['kn' + k] = add(GEO.sph, ['legs']);
      this.m['shn' + k] = add(GEO.cyl, ['calves']);
      this.m['ft' + k] = add(GEO.cyl, []);
    }
  }

  setHighlight(keys = []) {
    for (const p of this.parts) p.mesh.material = p.keys.some((k) => keys.includes(k)) ? this.matHot : this.matBody;
  }

  update(pose) {
    const p = solve(pose);
    const m = this.m;
    placeCyl(m.lower, p.pelvis, p.mid, 0.15, 0.1);
    placeCyl(m.upper, p.mid, p.chest, 0.185, 0.11);
    m.pelvis.position.copy(p.pelvis);
    m.pelvis.scale.set(0.165, 0.11, 0.115);
    placeCyl(m.yoke, p.shA, p.shB, 0.062);
    placeCyl(m.neck, p.chest, p.head, 0.042);
    m.head.position.copy(p.head);
    m.head.scale.setScalar(0.105);
    for (const k of ['A', 'B']) {
      m['sh' + k].position.copy(p['sh' + k]);
      m['sh' + k].scale.setScalar(0.07);
      placeCyl(m['ua' + k], p['sh' + k], p['el' + k], 0.05);
      m['el' + k].position.copy(p['el' + k]);
      m['el' + k].scale.setScalar(0.046);
      placeCyl(m['fa' + k], p['el' + k], p['ha' + k], 0.04);
      m['ha' + k].position.copy(p['ha' + k]);
      m['ha' + k].scale.setScalar(0.047);
      m['hip' + k].position.copy(p['hip' + k]);
      m['hip' + k].scale.setScalar(0.085);
      placeCyl(m['th' + k], p['hip' + k], p['kn' + k], 0.078);
      m['kn' + k].position.copy(p['kn' + k]);
      m['kn' + k].scale.setScalar(0.062);
      placeCyl(m['shn' + k], p['kn' + k], p['an' + k], 0.054);
      placeCyl(m['ft' + k], p['an' + k], p['toe' + k], 0.045, 0.04);
    }
    return p;
  }

  dispose() {
    this.matBody.dispose();
    this.matHot.dispose();
  }
}

// Equipment is described each frame as a list of simple specs (see props.js) and drawn
// from pooled meshes, so benches, bars and cables can follow the body.
export class PropPool {
  constructor() {
    this.group = new THREE.Group();
    this.mats = {
      metal: new THREE.MeshStandardMaterial({ color: 0x8a94a6, roughness: 0.4, metalness: 0.5 }),
      pad: new THREE.MeshStandardMaterial({ color: 0x4d5669, roughness: 0.8 }),
      weight: new THREE.MeshStandardMaterial({ color: 0x3a3f4c, roughness: 0.45, metalness: 0.4 }),
      cable: new THREE.MeshStandardMaterial({ color: 0x9aa3b2, roughness: 0.4, metalness: 0.5 }),
    };
    this.pool = { cyl: [], box: [], sph: [] };
  }

  _get(type, i) {
    const list = this.pool[type];
    if (!list[i]) {
      list[i] = new THREE.Mesh(GEO[type], this.mats.metal);
      this.group.add(list[i]);
    }
    return list[i];
  }

  update(specs) {
    const n = { cyl: 0, box: 0, sph: 0 };
    for (const s of specs) {
      const mesh = this._get(s.t, n[s.t]++);
      mesh.visible = true;
      mesh.material = this.mats[s.c] ?? this.mats.metal;
      if (s.t === 'cyl') {
        placeCyl(mesh, v3(s.a), v3(s.b), s.r);
      } else if (s.t === 'box') {
        mesh.position.set(s.p[0], s.p[1], s.p[2]);
        mesh.rotation.set(rad(s.rx ?? 0), 0, 0);
        mesh.scale.set(s.s[0], s.s[1], s.s[2]);
      } else {
        mesh.position.set(s.p[0], s.p[1], s.p[2]);
        mesh.scale.setScalar(s.r);
      }
    }
    for (const type of Object.keys(n)) for (let i = n[type]; i < this.pool[type].length; i++) this.pool[type][i].visible = false;
  }

  dispose() {
    Object.values(this.mats).forEach((m) => m.dispose());
  }
}
