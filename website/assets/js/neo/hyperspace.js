/* ==========================================================================
   Home · Hyperspace eagle
   The artwork on a bendable 3D surface: its wings beat in a slow wave from
   the body out to the tips. It flies down a tunnel of starlight rings with light
   streaks rushing past. Scrolling speeds the tunnel up (and widens the lens
   for a warp feel); the dive through the eagle goes to full warp, then it
   pulls back to a distant emblem.
   ========================================================================== */
import * as THREE from 'three';
import { loadEagleCanvas, makeEagle } from './eagle.js?v=20261108';

// Starlight colours: gold and violet rings, warm white and lilac streaks
const ringColour = (i) => (i % 3 === 0 ? '#ffcf8a' : '#6a4cff');
const streakColour = () => new THREE.Color(Math.random() < 0.7 ? '#fff3dc' : '#c9a6ff');

const { onFrame, small } = window.neo;
const host = document.querySelector('[data-neo-stage]');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 1, 20000);

/* Eagle (shared with the inner pages: neo/eagle.js) ----------------------- */const eagle = makeEagle(await loadEagleCanvas());const rig = eagle.rig;scene.add(rig);

/* Tunnel of rings -------------------------------------------------------- */
const RINGS = 26, GAP = 420;
const ringGeo = new THREE.RingGeometry(0.985, 1, 96);
const rings = [];
for (let i = 0; i < RINGS; i++) {
  const m = new THREE.MeshBasicMaterial({ color: ringColour(i), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const r = new THREE.Mesh(ringGeo, m);
  r.position.z = -i * GAP - 200;
  r.userData.spin = (Math.random() - 0.5) * 0.2;
  scene.add(r);
  rings.push(r);
}

/* Light streaks ------------------------------------------------------------ */
const STREAKS = small() ? 140 : 320;
const sPos = new Float32Array(STREAKS * 6), sCol = new Float32Array(STREAKS * 6);
const streaks = [];
for (let i = 0; i < STREAKS; i++) {
  const a = Math.random() * Math.PI * 2, rad = 0.35 + Math.random() * 0.65;
  streaks.push({ a, rad, z: -Math.random() * RINGS * GAP, len: 60 + Math.random() * 200, c: streakColour() });
}
const sGeo = new THREE.BufferGeometry();
sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
const streakLines = new THREE.LineSegments(sGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(streakLines);

let W = 0, H = 0, dist = 1000;
function resize() {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  dist = (H / 2) / Math.tan(THREE.MathUtils.degToRad(40 / 2));
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

let speed = 0;
onFrame((st, dt) => {
  const intro = st.intro * st.intro * (3 - 2 * st.intro);
  eagle.set(st.time, st.o * intro * (1 - st.burst * 0.7), 0.6 + 0.4 * Math.sin(st.time * 0.4) + st.burst, Math.min(1, Math.abs(st.vel) / 3000));

  // warp: lens widens with scroll speed and the dive
  const warp = Math.min(1, Math.abs(st.vel) / 2500) * 0.6 + st.burst;
  camera.fov += ((40 + warp * 28) - camera.fov) * Math.min(1, dt * 4);
  camera.updateProjectionMatrix();
  camera.position.set(st.mx * 60, -st.my * 40, dist);
  camera.lookAt(0, 0, 0);

  const size = st.base * st.s;
  // intro: flies in from deep in the tunnel
  rig.position.set((st.x - 0.5) * W, (0.5 - st.y) * H + Math.sin(st.time * 0.9) * 10, -(1 - intro) * 4000);
  rig.scale.setScalar(size);
  rig.rotation.y = st.mx * 0.6;
  rig.rotation.x = st.my * 0.35 - 0.05;
  rig.rotation.z = -st.mx * 0.12;

  // tunnel speed: idle drift, faster with scrolling, full warp on the dive
  speed += ((180 + Math.abs(st.vel) * 1.4 + st.burst * 5000) - speed) * Math.min(1, dt * 3);
  const R = Math.max(W, H) * 0.75;
  // the tunnel stays faint while there is text to read (see neo.js)
  const tunnelO = Math.max(st.tunnel, st.burst);
  rings.forEach((r, i) => {
    r.position.z += speed * dt;
    if (r.position.z > dist) r.position.z -= RINGS * GAP;
    r.scale.setScalar(R);
    r.rotation.z += r.userData.spin * dt;
    const depth = 1 - Math.min(1, -r.position.z / (RINGS * GAP));
    r.material.opacity = tunnelO * depth * depth * (i % 3 === 0 ? 0.55 : 0.32);
  });
  streaks.forEach((s, i) => {
    s.z += speed * dt * 2.2;
    if (s.z > dist) s.z -= RINGS * GAP;
    const x = Math.cos(s.a) * s.rad * R, y = Math.sin(s.a) * s.rad * R;
    const len = s.len * (1 + speed / 600);
    sPos.set([x, y, s.z, x, y, s.z - len], i * 6);
    const f = Math.min(1, (s.z + RINGS * GAP) / (RINGS * GAP)) * tunnelO;
    sCol.set([s.c.r * f, s.c.g * f, s.c.b * f, 0, 0, 0], i * 6);
  });
  sGeo.attributes.position.needsUpdate = true;
  sGeo.attributes.color.needsUpdate = true;
  renderer.render(scene, camera);
});
