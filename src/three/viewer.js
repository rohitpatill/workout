// 3D exercise viewer: one renderer per mounted viewer, disposed when the screen changes.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Mannequin, PropPool } from './rig.js';
import { ANIMS } from './poses.js';

const BG = 0x12151b;
const rad = (d) => (d * Math.PI) / 180;
const ease = (x) => x * x * (3 - 2 * x);

function buildStage() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2f3a, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb4ff, 0.9);
  rim.position.set(-4, 3, -3);
  scene.add(rim);

  const floorGeo = new THREE.CircleGeometry(2.2, 48);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1b1f27, roughness: 0.95 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.002;
  scene.add(floor);

  const stage = new THREE.Group();
  const man = new Mannequin();
  const props = new PropPool();
  stage.add(man.group, props.group);
  scene.add(stage);

  const apply = (anim, t) => {
    const pose = anim.pose(t);
    const r = pose.gRot ?? [0, 0, 0];
    const p = pose.gPos ?? [0, 0, 0];
    stage.rotation.set(rad(r[0]), rad(r[1]), rad(r[2]));
    stage.position.set(p[0], p[1], p[2]);
    const pts = man.update(pose);
    props.update(anim.props ? anim.props(pts, t) : []);
  };
  const dispose = () => {
    man.dispose();
    props.dispose();
    floorGeo.dispose();
    floorMat.dispose();
  };
  return { scene, man, apply, dispose };
}

function frame(camera, anim, aspect) {
  const look = anim.look ?? [0, 0.8, 0];
  const cam = anim.cam ?? [2.5, 1.4, 2.9];
  // Narrow (portrait) canvases need the camera further back to keep the figure in frame.
  const k = (anim.dist ?? 1) * (aspect < 1 ? 1 / Math.max(aspect, 0.6) : 1) * 0.98;
  camera.position.set(look[0] + (cam[0] - look[0]) * k, look[1] + (cam[1] - look[1]) * k, look[2] + (cam[2] - look[2]) * k);
  camera.lookAt(look[0], look[1], look[2]);
  return look;
}

// Lift (0 -> 1), short hold, slower lowering (1 -> 0), short rest.
const CYCLE = { up: 1.2, hold: 0.35, down: 1.8, rest: 0.35 };
function phaseAt(time) {
  const total = CYCLE.up + CYCLE.hold + CYCLE.down + CYCLE.rest;
  let x = time % total;
  if (x < CYCLE.up) return { t: ease(x / CYCLE.up), phase: 0 };
  x -= CYCLE.up;
  if (x < CYCLE.hold) return { t: 1, phase: 0 };
  x -= CYCLE.hold;
  if (x < CYCLE.down) return { t: 1 - ease(x / CYCLE.down), phase: 1 };
  return { t: 0, phase: 1 };
}

export function createViewer(container, animKey, { highlight = [], onPhase } = {}) {
  const anim = ANIMS[animKey];
  if (!anim) return { dispose() {}, setPlaying() {}, setSpeed() {}, resetView() {} };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch {
    container.innerHTML = '<div class="viewer-fallback">3D preview is not available on this device.</div>';
    return { dispose() {}, setPlaying() {}, setSpeed() {}, resetView() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const { scene, man, apply, dispose: disposeStage } = buildStage();
  man.setHighlight(highlight);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 9;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;

  const resetView = () => {
    const look = frame(camera, anim, container.clientWidth / Math.max(container.clientHeight, 1));
    controls.target.set(look[0], look[1], look[2]);
    controls.update();
  };
  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  resetView();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  const timer = new THREE.Timer();
  timer.connect(document);
  let time = 0;
  let playing = true;
  let speed = 1;
  let lastPhase = -1;

  renderer.setAnimationLoop(() => {
    timer.update();
    if (playing) time += timer.getDelta() * speed;
    let t;
    let phase = 0;
    if (anim.loop) {
      t = (time / anim.loop) % 1;
    } else if (anim.hold) {
      t = 0.5 + 0.5 * Math.sin(time * 1.6);
    } else {
      ({ t, phase } = phaseAt(time));
    }
    if (phase !== lastPhase) {
      lastPhase = phase;
      onPhase?.(phase);
    }
    apply(anim, t);
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    setPlaying(v) {
      playing = v;
    },
    setSpeed(v) {
      speed = v;
    },
    resetView,
    dispose() {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      timer.dispose();
      controls.dispose();
      disposeStage();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

// Renders still frames of every animation (start and end) for the #/debug contact sheet.
export function renderSheet(keys, size = 260) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(size, size);
  const { scene, apply, dispose } = buildStage();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  const out = [];
  for (const key of keys) {
    const anim = ANIMS[key];
    frame(camera, anim, 1);
    const shots = [];
    for (const t of anim.loop ? [0.1, 0.6] : [0, 1]) {
      apply(anim, t);
      renderer.render(scene, camera);
      shots.push(renderer.domElement.toDataURL('image/jpeg', 0.8));
    }
    out.push({ key, shots });
  }
  dispose();
  renderer.dispose();
  return out;
}
