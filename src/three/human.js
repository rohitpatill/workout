// Skinned human figure. Takes the same pose targets as the stick mannequin in rig.js
// (pelvis, lean, hand / foot targets, pole hints) and retargets them onto the skeleton of
// public/models/athlete.glb: torso bones follow the lean, arms and legs are solved with
// two-bone IK from the model's real joint positions, and each bone is oriented by mapping
// its rest frame (bone direction + hinge axis) onto the solved frame.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { torsoDir, frontDir } from './rig.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const v3 = (a) => (a.isVector3 ? a.clone() : V(a[0], a[1], a[2]));
const mirror = (a) => [-a[0], a[1], a[2]];
const X = V(1, 0, 0);
const Y = V(0, 1, 0);
const Z = V(0, 0, 1);
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Where things sit in the hand, measured on the model (metres from the wrist joint).
const PALM_ALONG = 0.085; // centre of an open palm
const GRIP_ALONG = 0.103; // a held handle lies just behind the knuckles...
const GRIP_DROP = 0.018; // ...this far below the bone line, plus the handle radius
const FINGERS = ['index', 'middle', 'ring', 'pinky'];
// Finger joint angles (radians) that wrap a thin bar and a thick one.
const CURL_THIN = [0.8, 1.4, 1.05];
const CURL_THICK = [0.55, 1.05, 0.75];

const DEFAULTS = {
  pelvis: [0, 0.95, 0],
  lean: 0,
  arch: 0,
  hand: [0.26, 0.9, 0.03],
  elbow: [0.3, -0.2, -1],
  foot: [0.11, 0.07, 0],
  knee: [0.12, 0, 1],
  toe: [0, 0, 1],
  grip: 0, // forearm rotation: 0 neutral (thumbs forward), 1 palms toward the biceps, -1 palms away
  curl: null, // finger curl 0..1; defaults to closed, or open when handFwd is given
};

// Quaternion of the orthonormal frame whose first axis is p and whose second axis is as
// close to s as possible.
const _m = new THREE.Matrix4();
function frame(p, s) {
  const a = p.clone().normalize();
  const c = a.clone().cross(s);
  if (c.lengthSq() < 1e-8) c.copy(a).cross(Math.abs(a.y) < 0.9 ? Y : X);
  c.normalize();
  const b = c.clone().cross(a);
  return new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(a, b, c));
}
// Rotation taking the frame (p0, s0) onto (p1, s1).
const frameRot = (p0, s0, p1, s1) => frame(p1, s1).multiply(frame(p0, s0).invert());

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
  const pp = pole.clone().addScaledVector(d, -pole.dot(d));
  if (pp.lengthSq() < 1e-8) pp.set(0, 0, 1).addScaledVector(d, -d.z);
  pp.normalize();
  return {
    mid: S.clone().addScaledVector(d, a).addScaledVector(pp, h),
    end: S.clone().addScaledVector(d, L),
    hinge: d.clone().cross(pp).normalize(), // normal of the bend plane
    pp,
  };
}

// ---------- loading ----------

const REGIONS = ['chest', 'back', 'core', 'shoulders', 'arms', 'forearms', 'glutes', 'legs', 'calves'];
// Linear-space vertex colours.
const SKIN = [0.4, 0.43, 0.49];
const SHORTS = [0.016, 0.018, 0.024];
const HOT = [1.0, 0.17, 0.03];

function prepare(gltf, normalMap) {
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const rest = {};
  scene.traverse((o) => {
    if (!o.isBone) return;
    rest[o.name] = {
      q: o.getWorldQuaternion(new THREE.Quaternion()),
      p: o.getWorldPosition(V()),
      lq: o.quaternion.clone(),
      lp: o.position.clone(),
    };
  });
  const P = (n) => rest[n].p;
  const dims = {
    upper: P('lowerarm_l').distanceTo(P('upperarm_l')),
    fore: P('hand_l').distanceTo(P('lowerarm_l')),
    thigh: P('calf_l').distanceTo(P('thigh_l')),
    calf: P('foot_l').distanceTo(P('calf_l')),
    hipMid: P('thigh_l').clone().add(P('thigh_r')).multiplyScalar(0.5),
  };

  let body = null;
  scene.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    o.frustumCulled = false;
    o.castShadow = true;
    o.receiveShadow = true;
    if (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count) body = o;
  });

  // Per-vertex muscle-region weights, from skin weights plus rest-pose position and normal.
  const geo = body.geometry;
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const si = geo.attributes.skinIndex;
  const sw = geo.attributes.skinWeight;
  const names = body.skeleton.bones.map((b) => b.name);
  const n = pos.count;
  const regions = Object.fromEntries(REGIONS.map((r) => [r, new Float32Array(n)]));
  const shorts = new Float32Array(n);
  const yHip = dims.hipMid.y;
  const ySh = P('upperarm_l').y;
  const shL = P('upperarm_l');
  const shR = P('upperarm_r');
  const p = V();
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(pos, i);
    const w = {};
    for (let k = 0; k < 4; k++) {
      const key = names[si.getComponent(i, k)].replace(/_[lr]$/, '').replace(/_0\d$/, '');
      w[key] = (w[key] ?? 0) + sw.getComponent(i, k);
    }
    const g = (k) => w[k] ?? 0;
    const torso = g('pelvis') + g('spine') + g('clavicle');
    const front = smooth(-0.25, 0.3, nor.getZ(i));
    const delt = smooth(0.16, 0.085, Math.min(p.distanceTo(shL), p.distanceTo(shR))) * (1 - g('lowerarm'));
    const glute = (g('pelvis') + g('thigh')) * (1 - front) * smooth(yHip - 0.15, yHip - 0.09, p.y) * (1 - smooth(yHip + 0.07, yHip + 0.13, p.y));
    regions.shoulders[i] = delt;
    regions.arms[i] = g('upperarm') * (1 - delt);
    regions.forearms[i] = g('lowerarm');
    regions.chest[i] = torso * front * smooth(ySh - 0.27, ySh - 0.2, p.y) * (1 - smooth(ySh + 0.0, ySh + 0.06, p.y)) * (1 - delt);
    regions.core[i] = torso * front * smooth(yHip + 0.0, yHip + 0.05, p.y) * (1 - smooth(ySh - 0.29, ySh - 0.22, p.y));
    regions.back[i] = torso * (1 - front) * smooth(yHip + 0.1, yHip + 0.18, p.y) * (1 - smooth(ySh + 0.02, ySh + 0.08, p.y)) * (1 - delt);
    regions.glutes[i] = glute;
    regions.legs[i] = g('thigh') * (1 - glute);
    regions.calves[i] = g('calf');
    shorts[i] = Math.min(1, g('pelvis') + g('thigh') + g('spine')) * smooth(yHip - 0.24, yHip - 0.225, p.y) * (1 - smooth(yHip + 0.065, yHip + 0.08, p.y));
  }
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.userData.regions = regions;
  geo.userData.shorts = shorts;

  const skin = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.02, normalMap, normalScale: new THREE.Vector2(1.15, 1.15) });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.5 });
  scene.traverse((o) => {
    if (o.isSkinnedMesh) o.material = o === body ? skin : dark;
  });
  return { scene, rest, dims, bodyName: body.name, materials: [skin, dark] };
}

let cache = null;
export function loadHuman() {
  cache ??= (async () => {
    const base = import.meta.env.BASE_URL + 'models/';
    const [gltf, normalMap] = await Promise.all([new GLTFLoader().loadAsync(base + 'athlete.glb'), new THREE.TextureLoader().loadAsync(base + 'athlete-normal.webp')]);
    normalMap.flipY = false;
    normalMap.colorSpace = THREE.NoColorSpace;
    normalMap.anisotropy = 4;
    const template = prepare(gltf, normalMap);
    if (import.meta.env.DEV) window.__human = template;
    return template;
  })();
  return cache;
}

// ---------- figure ----------

export class Human {
  constructor(template) {
    this.t = template;
    this.group = SkeletonUtils.clone(template.scene);
    this.b = {};
    this.group.traverse((o) => {
      if (o.isBone) this.b[o.name] = o;
      if (o.isSkinnedMesh && o.name === template.bodyName) this.body = o;
    });
    // Finger curl axis in each bone's local space: world Z at rest (fingers point along +-X).
    this.curlAxis = {};
    for (const side of ['l', 'r'])
      for (const f of FINGERS)
        for (const j of [1, 2, 3]) {
          const name = `${f}_0${j}_${side}`;
          this.curlAxis[name] = Z.clone().applyQuaternion(template.rest[name].q.clone().invert());
        }
    this.thumbCache = new Map();
    this.W = {};
    this.pos = {};
    this.setHighlight([]);
  }

  setHighlight(keys = []) {
    const geo = this.body.geometry;
    const { regions, shorts } = geo.userData;
    const col = geo.attributes.color;
    for (let i = 0; i < col.count; i++) {
      let h = 0;
      for (const k of keys) if (regions[k]) h = Math.max(h, regions[k][i]);
      h = Math.min(1, h * 1.15) * (1 - 0.75 * shorts[i]);
      const s = shorts[i];
      col.setXYZ(
        i,
        (SKIN[0] + (SHORTS[0] - SKIN[0]) * s) * (1 - h) + HOT[0] * h,
        (SKIN[1] + (SHORTS[1] - SKIN[1]) * s) * (1 - h) + HOT[1] * h,
        (SKIN[2] + (SHORTS[2] - SKIN[2]) * s) * (1 - h) + HOT[2] * h,
      );
    }
    col.needsUpdate = true;
  }

  // Local rotations for the three thumb joints so the thumb wraps under a handle of radius
  // gr. Worked out in the rest pose (fingers along +-X, palm down, handle along Z) by
  // aiming each joint at a point on a circle around the handle, then blended by curl.
  _thumb(sfx, s, gr, curl) {
    const key = `${sfx}|${gr}|${curl.toFixed(2)}`;
    if (this.thumbCache.has(key)) return this.thumbCache.get(key);
    const { rest } = this.t;
    const names = [1, 2, 3, 4].map((j) => (j < 4 ? `thumb_0${j}_${sfx}` : `thumb_04_leaf_${sfx}`));
    const hand = rest[`hand_${sfx}`];
    const centre = V(s * GRIP_ALONG, -(GRIP_DROP + gr), 0).add(hand.p);
    const rho = gr + 0.014;
    const around = (deg, z) => {
      const a = (deg * Math.PI) / 180;
      return V(centre.x - s * rho * Math.cos(a), centre.y - rho * Math.sin(a), hand.p.z + z);
    };
    const aims = [around(-15, 0.05), around(65, 0.058), around(140, 0.064)];
    const out = [];
    let R = new THREE.Quaternion();
    let p = rest[names[0]].p.clone();
    let parentW = hand.q.clone();
    const k = Math.min(1, Math.max(0, (curl - 0.3) / 0.6));
    for (let j = 0; j < 3; j++) {
      const seg = rest[names[j + 1]].p.clone().sub(rest[names[j]].p);
      const cur = seg.clone().applyQuaternion(R).normalize();
      const want = aims[j].clone().sub(p).normalize();
      R = new THREE.Quaternion().setFromUnitVectors(cur, want).multiply(R);
      p = p.clone().add(seg.applyQuaternion(R));
      const W = R.clone().multiply(rest[names[j]].q);
      out.push(rest[names[j]].lq.clone().slerp(parentW.clone().invert().multiply(W), k));
      parentW = W;
    }
    this.thumbCache.set(key, out);
    return out;
  }

  // World position of a bone from its parent's solved world transform.
  _fk(name, parent) {
    this.pos[name] = this.t.rest[name].lp.clone().applyQuaternion(this.W[parent]).add(this.pos[parent]);
    return this.pos[name];
  }

  _setWorld(name, rot) {
    this.W[name] = rot.clone().multiply(this.t.rest[name].q);
  }

  _applyLocal(name, parent) {
    this.b[name].quaternion.copy(this.W[parent]).invert().multiply(this.W[name]);
  }

  update(pose) {
    const q = { ...DEFAULTS, ...pose };
    const { rest, dims } = this.t;
    const R0 = (n) => rest[n].p;
    const W = this.W;
    const pos = this.pos;

    // ----- torso -----
    const dir = v3(torsoDir(q.lean));
    const front = v3(frontDir(q.lean));
    const pelvisPt = v3(q.pelvis);
    const chest = pelvisPt.clone().addScaledVector(dir, 0.5);
    const mid = pelvisPt.clone().addScaledVector(dir, 0.25).addScaledVector(front, q.arch);
    const dirLow = mid.clone().sub(pelvisPt).normalize();
    const dirUp = chest.clone().sub(mid).normalize();
    const headDir = v3(torsoDir(q.headLean ?? q.lean));

    const Rp = frameRot(Y, X, dirLow, X);
    const R3 = frameRot(Y, X, dirUp, X);
    const R2 = Rp.clone().slerp(R3, 0.5);
    const Rh = frameRot(Y, X, headDir, X);
    const Rn = R3.clone().slerp(Rh, 0.5);

    W.root = rest.root.q;
    pos.root = rest.root.p;
    this._setWorld('pelvis', Rp);
    pos.pelvis = R0('pelvis').clone().sub(dims.hipMid).applyQuaternion(Rp).add(pelvisPt);
    this._setWorld('spine_01', Rp);
    this._setWorld('spine_02', R2);
    this._setWorld('spine_03', R3);
    this._setWorld('neck_01', Rn);
    this._setWorld('Head', Rh);
    this._fk('spine_01', 'pelvis');
    this._fk('spine_02', 'spine_01');
    this._fk('spine_03', 'spine_02');
    this._fk('neck_01', 'spine_03');
    this._fk('Head', 'neck_01');

    this.b.pelvis.position.copy(pos.pelvis).sub(pos.root).applyQuaternion(W.root.clone().invert());
    this._applyLocal('pelvis', 'root');
    this._applyLocal('spine_01', 'pelvis');
    this._applyLocal('spine_02', 'spine_01');
    this._applyLocal('spine_03', 'spine_02');
    this._applyLocal('neck_01', 'spine_03');
    this._applyLocal('Head', 'neck_01');

    const pts = { pelvis: pelvisPt, mid, chest, head: pos.Head.clone().addScaledVector(headDir, 0.1) };

    for (const [key, s, sfx] of [['A', 1, 'l'], ['B', -1, 'r']]) {
      const pick = (name) => q[name + key] ?? (q[name] === undefined || q[name] === null ? null : s > 0 || typeof q[name] === 'number' ? q[name] : mirror(q[name]));
      const N = (n) => `${n}_${sfx}`;

      // ----- arm -----
      const target = v3(pick('hand'));
      const pole = v3(pick('elbow'));
      const handFwd = pick('handFwd') ? v3(pick('handFwd')).normalize() : null;
      const curl = pick('curl') ?? (handFwd ? 0.12 : 1);
      const gr = pick('gripR') ?? 0.014;
      const grip = pick('grip') ?? 0;
      // A closed hand holds its handle under the knuckles; an open hand rests on the palm.
      const holding = curl > 0.5;
      const along = holding ? GRIP_ALONG : PALM_ALONG;
      const off = holding ? GRIP_DROP + gr : 0;
      const s0 = s > 0 ? Y : Y.clone().negate();
      const pu = R0(N('lowerarm')).clone().sub(R0(N('upperarm')));
      const pf = R0(N('hand')).clone().sub(R0(N('lowerarm')));
      const c0 = R0(N('upperarm')).clone().sub(R0(N('clavicle'))).normalize();
      let Rc = R3;
      let Rhand = null;
      let palmN = null;
      if (handFwd) {
        const ph = R0(N('middle_01')).clone().sub(R0(N('hand')));
        Rhand = frameRot(ph, Y.clone().negate(), handFwd, v3(pick('handPalm') ?? [0, -1, 0]));
        palmN = Y.clone().negate().applyQuaternion(Rhand);
      }
      let S;
      let arm;
      let E;
      let f;
      let wrist;
      // The palm direction depends on the solved arm, and the wrist target depends on the
      // palm direction, so a few passes settle both (and the collarbone lift).
      for (let pass = 0; pass < 4; pass++) {
        this._fk(N('clavicle'), 'spine_03');
        this._setWorld(N('clavicle'), Rc);
        S = this._fk(N('upperarm'), N('clavicle'));
        const wt = target.clone();
        if (palmN) wt.addScaledVector(palmN, -off);
        if (handFwd) wt.addScaledVector(handFwd, -along);
        arm = ik(S, wt, dims.upper, handFwd ? dims.fore : dims.fore + along, pole);
        E = arm.mid;
        f = arm.end.clone().sub(E).normalize();
        wrist = E.clone().addScaledVector(f, dims.fore);
        if (!handFwd) {
          // Forearm rotation toward a palms-up (grip 1) or palms-down (grip -1) hold.
          const palmNat = arm.hinge.clone().multiplyScalar(-s);
          const flex = arm.pp.clone().negate();
          flex.addScaledVector(f, -flex.dot(f));
          let twist = 0;
          if (grip && flex.lengthSq() > 1e-6) {
            flex.normalize();
            twist = grip * Math.atan2(f.dot(palmNat.clone().cross(flex)), palmNat.dot(flex));
          }
          const Rf = frameRot(pf, s0, f, arm.hinge);
          this._setWorld(N('lowerarm'), new THREE.Quaternion().setFromAxisAngle(f, twist * 0.35).multiply(Rf));
          Rhand = new THREE.Quaternion().setFromAxisAngle(f, twist).multiply(Rf);
          palmN = Y.clone().negate().applyQuaternion(Rhand);
        } else {
          this._setWorld(N('lowerarm'), frameRot(pf, s0, f, arm.hinge));
        }
        if (pass === 0) {
          // Raise the collarbone as the upper arm lifts, like a real shoulder.
          const lift = Math.max(0, E.clone().sub(S).normalize().dot(dirUp));
          if (lift > 0.05) {
            const c0w = c0.clone().applyQuaternion(R3);
            const c1 = c0w.clone().addScaledVector(dirUp, 0.5 * lift).normalize();
            Rc = new THREE.Quaternion().setFromUnitVectors(c0w, c1).multiply(R3);
          }
        }
      }
      const u = E.clone().sub(S).normalize();
      this._setWorld(N('upperarm'), frameRot(pu, s0, u, arm.hinge));
      this._setWorld(N('hand'), Rhand);
      this._applyLocal(N('clavicle'), 'spine_03');
      this._applyLocal(N('upperarm'), N('clavicle'));
      this._applyLocal(N('lowerarm'), N('upperarm'));
      this._applyLocal(N('hand'), N('lowerarm'));
      const gripPt = wrist.clone().addScaledVector(handFwd ?? f, along).addScaledVector(palmN, off);

      // Fingers wrap the handle; the thumb closes around it from the other side.
      const thick = Math.min(1, Math.max(0, (gr - 0.014) / 0.02));
      for (const fn of FINGERS)
        for (const j of [1, 2, 3]) {
          const name = `${fn}_0${j}_${sfx}`;
          const angle = curl * (CURL_THIN[j - 1] + (CURL_THICK[j - 1] - CURL_THIN[j - 1]) * thick);
          this.b[name].quaternion.copy(rest[name].lq).multiply(new THREE.Quaternion().setFromAxisAngle(this.curlAxis[name], -s * angle));
        }
      const thumb = this._thumb(sfx, s, gr, curl);
      for (let j = 0; j < 3; j++) this.b[`thumb_0${j + 1}_${sfx}`].quaternion.copy(thumb[j]);

      pts['sh' + key] = S;
      pts['el' + key] = E;
      pts['wr' + key] = wrist;
      pts['ha' + key] = gripPt;
      // Axis of a handle held in this hand (across the palm), and the palm facing.
      pts['ax' + key] = Z.clone().applyQuaternion(Rhand);
      pts['palm' + key] = palmN.clone();

      // ----- leg -----
      this._fk(N('thigh'), 'pelvis');
      const H = pos[N('thigh')];
      const leg = ik(H, v3(pick('foot')), dims.thigh, dims.calf, v3(pick('knee')));
      const K = leg.mid;
      const A = leg.end;
      const negX = X.clone().negate();
      const pt = R0(N('calf')).clone().sub(R0(N('thigh')));
      const pc = R0(N('foot')).clone().sub(R0(N('calf')));
      const toe = v3(pick('toe')).normalize();
      this._setWorld(N('thigh'), frameRot(pt, negX, K.clone().sub(H), leg.hinge));
      this._setWorld(N('calf'), frameRot(pc, negX, A.clone().sub(K), leg.hinge));
      this._setWorld(N('foot'), frameRot(Z, negX, toe, leg.hinge));
      this._applyLocal(N('thigh'), 'pelvis');
      this._applyLocal(N('calf'), N('thigh'));
      this._applyLocal(N('foot'), N('calf'));

      pts['hip' + key] = H;
      pts['kn' + key] = K;
      pts['an' + key] = A;
      pts['toe' + key] = A.clone().addScaledVector(toe, 0.17);
    }
    return pts;
  }

  dispose() {
    // Geometry, materials and textures belong to the cached template shared by all viewers.
  }
}
