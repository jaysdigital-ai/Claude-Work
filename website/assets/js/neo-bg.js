/* ==========================================================================
   Inner pages: the neon eagle and a scene of its own for each page
   (<body data-scene="stars|grid|signal">).
   - stars (About): a deep starfield with the odd shooting star
   - grid (Services): a neon grid floor running toward you, data rising off it
   - signal (Contact): pulses rippling out from the eagle, like a signal sent
   The eagle beats its wings beside the page title, then rises and shrinks to
   a faint emblem as you scroll into the content. The pointer adds parallax.
   ========================================================================== */
import * as THREE from 'three';
import { loadEagleCanvas, makeEagle } from './neo/eagle.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = () => innerWidth < 900;
const kind = document.body.dataset.scene || 'stars';
const ACCENT = '#3fe6ff';                    // one palette site-wide: navy and cyan

const host = document.createElement('div');
host.className = 'neo-stage';
host.setAttribute('aria-hidden', 'true');
document.body.prepend(host);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 1, 30000);
let W = 0, H = 0, dist = 1000;
function resize() {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  dist = (H / 2) / Math.tan(THREE.MathUtils.degToRad(20));
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

const additive = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const accent = new THREE.Color(ACCENT);
const update = [];                                        // per-scene frame callbacks

/* Scenes --------------------------------------------------------------------- */
if (kind === 'stars') {
  const N = small() ? 900 : 2200;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const cyan = new THREE.Color('#3fe6ff'), blue = new THREE.Color('#8fb6ff'), white = new THREE.Color('#ffffff');
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 6000;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 6000;
    pos[i * 3 + 2] = -Math.random() * 5000 - 100;
    const c = [cyan, blue, white, white][i % 4];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false }));
  scene.add(stars);
  // shooting stars: a short bright line that streaks across now and then
  const shots = Array.from({ length: 3 }, () => {
    const m = new THREE.LineBasicMaterial({ color: '#d6f8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(-220, 90, 0)]), m);
    scene.add(l);
    return { l, t: Math.random() * -6 };
  });
  update.push((t, dt, scroll, k) => {
    stars.rotation.z = t * 0.006;
    stars.position.y = scroll * 0.25;
    stars.material.opacity = 0.5 + 0.35 * k;
    shots.forEach((s) => {
      s.t += dt;
      if (s.t > 1.1) { s.t = -3 - Math.random() * 6; s.l.position.set((Math.random() * 0.8 + 0.1) * W - W / 2, Math.random() * H * 0.4, -200); }
      const p = Math.max(0, s.t);
      s.l.position.x -= dt * 900 * (s.t > 0 ? 1 : 0);
      s.l.position.y += dt * 380 * (s.t > 0 ? 1 : 0);
      s.l.material.opacity = s.t > 0 ? Math.sin(Math.min(1, p) * Math.PI) * 0.9 * k : 0;
    });
  });
}

if (kind === 'grid') {
  const size = 12000, div = 120, cell = size / div;
  const grid = new THREE.GridHelper(size, div, ACCENT, ACCENT);
  grid.material.transparent = true;
  grid.material.opacity = 0.32;
  grid.material.blending = THREE.AdditiveBlending;
  grid.material.depthWrite = false;
  scene.add(grid);
  scene.fog = new THREE.Fog('#050318', 600, 5200);
  grid.material.fog = true;
  // data streams rising off the floor
  const N = small() ? 40 : 90;
  const sPos = new Float32Array(N * 6), sCol = new Float32Array(N * 6);
  const streams = Array.from({ length: N }, () => ({ x: (Math.random() - 0.5) * 5000, z: -Math.random() * 4500 - 200, y: Math.random() * 900, len: 40 + Math.random() * 140, v: 60 + Math.random() * 140 }));
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sg.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  const lines = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
  scene.add(lines);
  const white = new THREE.Color('#ffffff');
  let run = 0;
  update.push((t, dt, scroll, k, vel) => {
    grid.position.y = -H * 0.62;
    run = (run + dt * (40 + Math.min(600, Math.abs(vel) * 0.5))) % cell;
    grid.position.z = run;
    grid.material.opacity = 0.14 + 0.24 * k;
    streams.forEach((s, i) => {
      s.y += s.v * dt;
      if (s.y > 1100) s.y = 0;
      const base = -H * 0.62;
      sPos.set([s.x, base + s.y, s.z, s.x, base + s.y + s.len, s.z], i * 6);
      const c = i % 4 ? accent : white;
      const f = Math.sin(Math.min(1, s.y / 1100) * Math.PI) * (0.4 + 0.6 * k);
      sCol.set([0, 0, 0, c.r * f, c.g * f, c.b * f], i * 6);
    });
    sg.attributes.position.needsUpdate = true;
    sg.attributes.color.needsUpdate = true;
  });
}

let signalAt = null;
if (kind === 'signal') {
  const ringGeo = new THREE.RingGeometry(0.97, 1, 128);
  const rings = Array.from({ length: 5 }, (_, i) => {
    const r = new THREE.Mesh(ringGeo, additive(i % 2 ? '#8fb6ff' : '#3fe6ff', 0));
    scene.add(r);
    return { r, phase: i / 5 };
  });
  // a faint dot field, like a map seen from above
  const N = small() ? 500 : 1300;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 4000; pos[i * 3 + 1] = (Math.random() - 0.5) * 3000; pos[i * 3 + 2] = -Math.random() * 1500 - 300; }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dots = new THREE.Points(dg, new THREE.PointsMaterial({ color: '#a9c4ff', size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0.5, depthWrite: false }));
  scene.add(dots);
  signalAt = new THREE.Vector3();
  update.push((t, dt, scroll, k) => {
    const R = Math.max(W, H) * 0.9;
    rings.forEach((o) => {
      const p = (t * 0.22 + o.phase) % 1;
      o.r.position.copy(signalAt);
      o.r.position.z -= 20;
      o.r.scale.setScalar(40 + p * R);
      o.r.material.opacity = (1 - p) * (1 - p) * 0.55 * (0.35 + 0.65 * k);
    });
    dots.position.y = scroll * 0.15;
    dots.material.opacity = 0.3 + 0.3 * k;
  });
}

/* Eagle ---------------------------------------------------------------------- */
const eagle = makeEagle(await loadEagleCanvas(), { boost: 1.2, halo: 0.3 });
scene.add(eagle.rig);
const hero = document.querySelector('.page-hero');

let mx = 0, my = 0, tmx = 0, tmy = 0, time = 0, intro = reduce ? 1 : 0, lastY = window.scrollY, vel = 0;
window.addEventListener('pointermove', (e) => { tmx = e.clientX / innerWidth - 0.5; tmy = e.clientY / innerHeight - 0.5; }, { passive: true });
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
let last = performance.now();
function frame() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;
  intro = Math.min(1, intro + dt / 1.8);
  mx += (tmx - mx) * Math.min(1, dt * 3);
  my += (tmy - my) * Math.min(1, dt * 3);
  const y = window.scrollY;
  vel += ((y - lastY) / Math.max(dt, 0.001) - vel) * Math.min(1, dt * 8);
  lastY = y;

  // 1 in the page title, 0 once you are reading the content
  const heroH = hero ? hero.offsetHeight : H;
  const t = ease(Math.min(1, Math.max(0, y / (heroH * 0.85))));
  const k = 1 - t;
  const phone = small();
  const from = phone ? { x: 0.72, y: 0.2, s: Math.min(W * 0.62, H * 0.32), o: 0.7 }
    : { x: kind === 'signal' ? 0.8 : 0.78, y: kind === 'grid' ? 0.4 : 0.44, s: Math.min(W * 0.4, H * 0.66), o: 1 };
  const to = phone ? { x: 0.86, y: 0.1, s: W * 0.3, o: 0.12 } : { x: 0.9, y: 0.16, s: H * 0.24, o: 0.22 };
  const ex = mix(from.x, to.x, t), ey = mix(from.y, to.y, t), es = mix(from.s, to.s, t), eo = mix(from.o, to.o, t);
  const iv = ease(intro);
  eagle.rig.position.set((ex - 0.5) * W + mx * 30, (0.5 - ey) * H - my * 20 + Math.sin(time * 0.9) * 8, -(1 - iv) * 1500);
  eagle.rig.scale.setScalar(es);
  eagle.rig.rotation.y = mx * 0.55 + (kind === 'stars' ? Math.sin(time * 0.3) * 0.15 : 0);
  eagle.rig.rotation.x = my * 0.3;
  eagle.set(time, eo * iv, kind === 'grid' ? 1.1 : 0.85);
  if (signalAt) signalAt.copy(eagle.rig.position);

  update.forEach((fn) => fn(time, dt, y, k, vel));
  camera.position.set(mx * 50, -my * 30, dist);
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
