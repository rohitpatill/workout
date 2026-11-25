// 3D exercise viewer: one renderer per mounted viewer, disposed when the screen changes.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Mannequin, PropPool } from './rig.js';
import { Human, loadHuman } from './human.js';
import { ANIMS } from './poses.js';
import { ctx as propCtx } from './props.js';

const BG = 0x12151b;
const rad = (d) => (d * Math.PI) / 180;
const ease = (x) => x * x * (3 - 2 * x);

// Rubber gym flooring: dark speckled tiles with faint seams.
function floorTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#23272f';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const v = 28 + Math.random() * 46;
    g.fillStyle = `rgba(${v + 8},${v + 12},${v + 22},${0.25 + Math.random() * 0.4})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 1.6, 1 + Math.random() * 1.6);
  }
  g.strokeStyle = 'rgba(8,9,12,0.9)';
  g.lineWidth = 3;
  g.strokeRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function setupRenderer(renderer) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
}

function buildStage(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 7, 15);

  // Soft studio reflections for the metal and skin, plus a key light that casts the shadow.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = env;
  scene.environmentIntensity = 0.55;

  const key = new THREE.DirectionalLight(0xfff1e0, 2.3);
  key.position.set(2.5, 5, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -2.4;
  key.shadow.camera.right = key.shadow.camera.top = 2.4;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 12;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb4ff, 1.3);
  rim.position.set(-3.5, 3, -3);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1c22, 0.35));

  const floorGeo = new THREE.CircleGeometry(8, 64);
  const floorMap = floorTexture();
  const floorMat = new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.92, metalness: 0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.002;
  floor.receiveShadow = true;
  scene.add(floor);

  const stage = new THREE.Group();
  const props = new PropPool();
  stage.add(props.group);
  scene.add(stage);

  const state = { man: null, highlight: [] };
  const setFigure = (man) => {
    if (state.man) stage.remove(state.man.group);
    state.man = man;
    stage.add(man.group);
    man.setHighlight(state.highlight);
  };
  const setHighlight = (keys) => {
    state.highlight = keys;
    state.man?.setHighlight(keys);
  };
  const apply = (anim, t) => {
    if (!state.man) return;
    const pose = anim.pose(t);
    const r = pose.gRot ?? [0, 0, 0];
    const p = pose.gPos ?? [0, 0, 0];
    stage.rotation.set(rad(r[0]), rad(r[1]), rad(r[2]));
    stage.position.set(p[0], p[1], p[2]);
    const pts = state.man.update(pose);
    // Each animation remembers its cables' shortest lengths so weight stacks rise correctly.
    propCtx.mins = anim.cableMins ??= {};
    props.update(anim.props ? anim.props(pts, t) : []);
    return pts;
  };
  // Run through the whole movement once so those shortest lengths are known up front.
  const prime = (anim) => {
    if (!state.man || anim.primed) return;
    for (let i = 0; i <= 10; i++) apply(anim, i / 10);
    anim.primed = true;
  };
  const toWorld = (v) => {
    stage.updateMatrixWorld();
    return stage.localToWorld(v.clone());
  };
  const dispose = () => {
    state.man?.dispose();
    props.dispose();
    floorGeo.dispose();
    floorMat.dispose();
    floorMap.dispose();
    env.dispose();
  };
  return { scene, apply, prime, dispose, setFigure, setHighlight, toWorld, ready: () => !!state.man };
}

// Realistic figure if the model loads, the simple mannequin if it does not.
async function loadFigure() {
  try {
    return new Human(await loadHuman());
  } catch (err) {
    console.warn('Human model failed to load, using the simple mannequin.', err);
    return new Mannequin();
  }
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

const NOOP = { dispose() {}, setPlaying() {}, setSpeed() {}, resetView() {}, setView() {}, zoom() {}, setFull() {} };

export function createViewer(container, animKey, { highlight = [], onPhase } = {}) {
  const anim = ANIMS[animKey];
  if (!anim) return NOOP;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch {
    container.innerHTML = '<div class="viewer-fallback">3D preview is not available on this device.</div>';
    return NOOP;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  setupRenderer(renderer);
  container.appendChild(renderer.domElement);

  const stage = buildStage(renderer);
  stage.setHighlight(highlight);
  let disposed = false;
  loadFigure().then((man) => {
    if (disposed) return;
    stage.setFigure(man);
    stage.prime(anim);
  });

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 50);
  const canvas = renderer.domElement;
  // Inline, the page must stay scrollable: the mouse wheel and vertical swipes scroll the
  // page, sideways swipes rotate the figure. In full view every gesture goes to the figure.
  let full = false;
  const wheelGuard = (e) => {
    if (!full) e.stopImmediatePropagation();
  };
  canvas.addEventListener('wheel', wheelGuard); // registered before OrbitControls on purpose
  const controls = new OrbitControls(camera, canvas);
  canvas.style.touchAction = 'pan-y';
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 0.45;
  controls.maxDistance = 9;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;

  const resetView = () => {
    const look = frame(camera, anim, container.clientWidth / Math.max(container.clientHeight, 1));
    controls.target.set(look[0], look[1], look[2]);
    controls.update();
  };
  // Preset angles around the exercise's own focus point, at its default distance.
  const setView = (name) => {
    resetView();
    if (name === 'default') return;
    const t = controls.target;
    const d = camera.position.distanceTo(t);
    const dir = { front: [0, 0.12, 1], side: [1, 0.12, 0], back: [0, 0.12, -1], top: [0.001, 1, 0.12] }[name];
    const n = Math.hypot(...dir);
    camera.position.set(t.x + (dir[0] / n) * d, t.y + (dir[1] / n) * d, t.z + (dir[2] / n) * d);
    controls.update();
  };
  const zoom = (factor) => {
    const t = controls.target;
    const d = Math.min(controls.maxDistance, Math.max(controls.minDistance, camera.position.distanceTo(t) * factor));
    camera.position.sub(t).setLength(d).add(t);
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
    if (playing && stage.ready()) time += timer.getDelta() * speed;
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
    stage.apply(anim, t);
    controls.update();
    renderer.render(stage.scene, camera);
  });

  return {
    setPlaying(v) {
      playing = v;
    },
    setSpeed(v) {
      speed = v;
    },
    resetView,
    setView,
    zoom,
    setFull(v) {
      full = v;
      canvas.style.touchAction = v ? 'none' : 'pan-y';
    },
    dispose() {
      disposed = true;
      canvas.removeEventListener('wheel', wheelGuard);
      renderer.setAnimationLoop(null);
      ro.disconnect();
      timer.dispose();
      controls.dispose();
      stage.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

// Renders still frames of animations for the #/debug contact sheet. view can override the
// camera: { cam: [x,y,z], look: [x,y,z] | 'hand', fov }.
export async function renderSheet(keys, size = 260, times = null, view = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(size, size);
  setupRenderer(renderer);
  const stage = buildStage(renderer);
  stage.setFigure(await loadFigure());
  const camera = new THREE.PerspectiveCamera(view.fov ?? 34, 1, 0.05, 50);
  const out = [];
  for (const key of keys) {
    const anim = ANIMS[key];
    stage.prime(anim);
    stage.setHighlight(view.hl ?? []);
    const shots = [];
    for (const t of times ?? (anim.loop ? [0.1, 0.6] : [0, 1])) {
      const pts = stage.apply(anim, t);
      if (view.cam || view.look) {
        let look = view.look ?? anim.look ?? [0, 0.8, 0];
        if (look === 'hand' && pts) {
          const h = stage.toWorld(pts.haA);
          look = [h.x, h.y, h.z];
        }
        const cam = view.cam ?? anim.cam ?? [2.5, 1.4, 2.9];
        const rel = view.look === 'hand';
        camera.position.set(rel ? look[0] + cam[0] : cam[0], rel ? look[1] + cam[1] : cam[1], rel ? look[2] + cam[2] : cam[2]);
        camera.lookAt(look[0], look[1], look[2]);
      } else frame(camera, anim, 1);
      renderer.render(stage.scene, camera);
      shots.push(renderer.domElement.toDataURL('image/jpeg', 0.9));
    }
    out.push({ key, shots });
  }
  stage.dispose();
  renderer.dispose();
  return out;
}
