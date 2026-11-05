/* ==========================================================================
   Inner pages: the neon eagle and a scene of its own for each page
   (<body data-scene="stars|grid|signal|showcase|updraft|growth">).
   - stars (About): a deep starfield with the odd shooting star
   - grid (Services): a neon grid floor running toward you, data rising off it
   - signal (Contact): pulses rippling out from the eagle, like a signal sent
   - showcase (Work), updraft and growth (case studies, alternating): see below
   The eagle beats its wings beside the page title, then rises and shrinks to
   a faint emblem as you scroll into the content. The pointer adds parallax.
   ========================================================================== */
import * as THREE from 'three';
import { loadEagleCanvas, makeEagle } from './neo/eagle.js?v=20261109';
import { LITE, adaptiveResolution, put6 } from './neo/eagle-shared.js?v=20261109';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = () => innerWidth < 900;
// ?scene= previews another scene on any page (used to compare options)
const asked = new URLSearchParams(location.search).get('scene');
const kind = ['stars', 'grid', 'signal', 'showcase', 'updraft', 'growth'].includes(asked) ? asked : (document.body.dataset.scene || 'stars');
const ACCENT = '#3fe6ff';                    // one palette site-wide: navy and cyan

const host = document.createElement('div');
host.className = 'neo-stage';
host.setAttribute('aria-hidden', 'true');
document.body.prepend(host);
const renderer = new THREE.WebGLRenderer({ antialias: !LITE, alpha: true, powerPreference: 'high-performance' });
const tuneQuality = adaptiveResolution(renderer);   // keeps frames smooth on any device
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 1, 30000);
let W = 0, H = 0, dist = 1000;
function resize() {
  const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
  if (w === W && h === H) return;                  // the address bar moved: nothing to redo
  W = w; H = h;
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
      put6(sPos, i * 6, s.x, base + s.y, s.z, s.x, base + s.y + s.len, s.z);
      const c = i % 4 ? accent : white;
      const f = Math.sin(Math.min(1, s.y / 1100) * Math.PI) * (0.4 + 0.6 * k);
      put6(sCol, i * 6, 0, 0, 0, c.r * f, c.g * f, c.b * f);
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

/* Work and case study pages ---------------------------------------------------
   Work uses showcase; the case studies alternate updraft and growth.
   Any page can preview a scene with ?scene=showcase|updraft|growth.
   - showcase: glowing project frames drifting in depth around the eagle
   - updraft: the eagle riding a column of rising light, trails spiralling up
   - growth: a bar chart rising on load, its growth line drawn up to the eagle */
const eaglePos = new THREE.Vector3();
const spread = (z) => (dist - z) / dist;               // how much wider the view is at depth z
const easeIn = (t) => t * t * (3 - 2 * t);

if (kind === 'showcase') {
  // one frame: an outline, a browser bar and three lines of "content"
  const L = [-0.5, -0.3, 0.5, -0.3, 0.5, -0.3, 0.5, 0.3, 0.5, 0.3, -0.5, 0.3, -0.5, 0.3, -0.5, -0.3,
    -0.5, 0.2, 0.5, 0.2,
    -0.42, 0.08, 0.1, 0.08, -0.42, -0.04, 0.28, -0.04, -0.42, -0.16, 0.0, -0.16];
  const fp = new Float32Array(L.length / 2 * 3);
  for (let j = 0; j < L.length / 2; j++) { fp[j * 3] = L[j * 2]; fp[j * 3 + 1] = L[j * 2 + 1]; }
  const frameGeo = new THREE.BufferGeometry();
  frameGeo.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  const fillGeo = new THREE.PlaneGeometry(1, 0.6);
  const N = small() ? 9 : 16;
  const frames = Array.from({ length: N }, (_, i) => {
    const g = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({ color: i % 3 ? ACCENT : '#8fb6ff', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
    g.add(new THREE.LineSegments(frameGeo, lineMat));
    const fill = new THREE.Mesh(fillGeo, additive(ACCENT, 0.04));
    g.add(fill);
    const z = -300 - Math.random() * 2600;
    g.position.z = z;
    scene.add(g);
    return { g, lineMat, fill, z, fx: Math.random() * 1.8 - 0.9, fy: Math.random() * 2.3 - 1.15, size: 220 + Math.random() * 240, v: 0.012 + Math.random() * 0.02, spin: (Math.random() - 0.5) * 0.6, ph: Math.random() * 6.28 };
  });
  update.push((t, dt, scroll, k) => {
    frames.forEach((o) => {
      o.fy += o.v * dt * (1 + k);
      if (o.fy > 1.15) { o.fy = -1.15; o.fx = Math.random() * 1.8 - 0.9; }
      const s = spread(o.z);
      // lean the frames to the right, away from the words on the left
      o.g.position.x = (o.fx * 0.5 + 0.12) * W * s;
      o.g.position.y = o.fy * H * 0.55 * s + scroll * 0.35;
      o.g.scale.set(o.size, o.size, 1);
      o.g.rotation.y = o.spin + Math.sin(t * 0.25 + o.ph) * 0.18;
      o.g.rotation.x = Math.sin(t * 0.2 + o.ph) * 0.08;
      const edge = 1 - Math.min(1, Math.abs(o.fy) * 0.9) ** 4;
      o.lineMat.opacity = (0.18 + 0.4 * k) * edge;
      o.fill.material.opacity = (0.02 + 0.05 * k) * edge;
    });
  });
}

if (kind === 'updraft') {
  const N = small() ? 520 : 1300;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const tints = [accent, new THREE.Color('#8fb6ff'), new THREE.Color('#ffd79a'), new THREE.Color('#ffffff')];
  const P = Array.from({ length: N }, (_, i) => {
    const c = tints[i % 4];
    col.set([c.r, c.g, c.b], i * 3);
    return { fx: Math.random() * 2 - 1, y: Math.random(), z: -200 - Math.random() * 3200, v: 0.05 + Math.random() * 0.14 };
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const dots = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(dots);
  // streaks: some motes leave a short line behind them
  const S = small() ? 30 : 70;
  const sPos = new Float32Array(S * 6), sCol = new Float32Array(S * 6);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sg.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  scene.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  // two trails spiralling up around the eagle
  const T = 160;
  const trails = [0, Math.PI].map((off, j) => {
    const tp = new Float32Array(T * 3), tc = new Float32Array(T * 3);
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(tp, 3));
    tg.setAttribute('color', new THREE.BufferAttribute(tc, 3));
    scene.add(new THREE.Line(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    return { tp, tc, tg, off, c: j ? tints[2] : accent };
  });
  update.push((t, dt, scroll, k, vel) => {
    const boost = 1 + Math.min(4, Math.abs(vel) / 600);
    for (let i = 0; i < N; i++) {
      const p = P[i];
      p.y += p.v * dt * boost;
      if (p.y > 1) { p.y = 0; p.fx = Math.random() * 2 - 1; }
      const s = spread(p.z);
      // denser in a column under the eagle
      pos[i * 3] = (p.fx * Math.abs(p.fx) * 0.55 + 0.22) * W * s + Math.sin(t * 0.6 + i) * 12;
      pos[i * 3 + 1] = (p.y - 0.5) * H * 1.3 * s;
      pos[i * 3 + 2] = p.z;
    }
    g.attributes.position.needsUpdate = true;
    for (let i = 0; i < S; i++) {
      const pi = (i * 7) % N, p = P[pi];
      const x = pos[pi * 3], y = pos[pi * 3 + 1], z = p.z;
      put6(sPos, i * 6, x, y, z, x, y - (30 + p.v * 500 * boost), z);
      const f = Math.sin(p.y * Math.PI) * (0.3 + 0.7 * k);
      put6(sCol, i * 6, accent.r * f, accent.g * f, accent.b * f, 0, 0, 0);
    }
    sg.attributes.position.needsUpdate = true;
    sg.attributes.color.needsUpdate = true;
    const R = Math.min(W * 0.2, H * 0.36);
    trails.forEach((tr) => {
      for (let j = 0; j < T; j++) {
        const u = j / (T - 1), a = tr.off + t * 1.1 - u * 7;
        tr.tp[j * 3] = eaglePos.x + Math.cos(a) * R * (0.6 + u * 0.6);
        tr.tp[j * 3 + 1] = eaglePos.y - H * 0.55 + u * H * 1.05;
        tr.tp[j * 3 + 2] = eaglePos.z + Math.sin(a) * R * 0.8;
        const f = Math.sin(u * Math.PI) * (0.2 + 0.6 * k) * (0.6 + 0.4 * Math.sin(a * 2));
        tr.tc[j * 3] = tr.c.r * f; tr.tc[j * 3 + 1] = tr.c.g * f; tr.tc[j * 3 + 2] = tr.c.b * f;
      }
      tr.tg.attributes.position.needsUpdate = true;
      tr.tg.attributes.color.needsUpdate = true;
    });
    dots.material.opacity = 0.35 + 0.5 * k;
  });
}

if (kind === 'growth') {
  const n = small() ? 6 : 9;
  const outline = new THREE.BufferGeometry().setFromPoints([[-0.5, 0], [0.5, 0], [0.5, 0], [0.5, 1], [0.5, 1], [-0.5, 1], [-0.5, 1], [-0.5, 0]].map(([x, y]) => new THREE.Vector3(x, y, 0)));
  const fillGeo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const bars = Array.from({ length: n }, (_, i) => {
    const g = new THREE.Group();
    const lm = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    g.add(new THREE.LineSegments(outline, lm));
    const fm = additive(i === n - 1 ? '#ffd79a' : ACCENT, 0.08);
    g.add(new THREE.Mesh(fillGeo, fm));
    scene.add(g);
    // heights climb toward the eagle, with a dip now and then like real data
    return { g, lm, fm, hgt: 0.2 + 0.8 * (i / (n - 1)) ** 1.35 + (i % 3 === 1 ? -0.07 : 0.03), delay: 0.25 + i * 0.12 };
  });
  const guideGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0.5, 0, 0)]);
  const guides = Array.from({ length: 5 }, () => {
    const l = new THREE.Line(guideGeo, new THREE.LineBasicMaterial({ color: '#8fb6ff', transparent: true, opacity: 0.12, depthWrite: false }));
    scene.add(l);
    return l;
  });
  const M = n + 1, lp = new Float32Array(M * 3), dp = new Float32Array(M * 3);
  const lineG = new THREE.BufferGeometry();
  lineG.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  const growthLine = new THREE.Line(lineG, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(growthLine);
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dotsG = new THREE.Points(dg, new THREE.PointsMaterial({ color: '#d6f8ff', size: 7, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dotsG);
  const pts = Array.from({ length: M }, () => new THREE.Vector3());
  let age = 0;
  update.push((t, dt, scroll, k) => {
    age += dt;
    const z = -500, s = spread(z);
    // the chart sits behind and below the eagle, clear of the words on the left
    const phone = small();
    const left = W * (phone ? -0.42 : 0.14) * s, right = W * (phone ? 0.4 : 0.47) * s, base = -H * (phone ? 0.2 : 0.3) * s + scroll * 0.3;
    const top = Math.max(H * 0.2, eaglePos.y * s - base - H * 0.1 * s);
    const step = (right - left) / (n - 1), bw = step * 0.56;
    bars.forEach((b, i) => {
      const grow = easeIn(Math.min(1, Math.max(0, (age - b.delay) / 0.9)));
      const hh = Math.max(1, b.hgt * top * grow);
      b.g.position.set(left + i * step, base, z);
      b.g.scale.set(bw, hh, 1);
      b.lm.opacity = (0.25 + 0.6 * k) * (0.4 + 0.6 * grow);
      b.fm.opacity = (0.04 + 0.12 * k) * grow;
      pts[i].set(left + i * step, base + hh, z + 2);
    });
    pts[n].set(eaglePos.x, eaglePos.y - H * 0.04, eaglePos.z);
    guides.forEach((l, i) => {
      l.position.set((left + right) / 2, base + (i / 4) * top, z - 4);
      l.scale.set(right - left + step, 1, 1);
      l.material.opacity = 0.05 + 0.1 * k;
    });
    // the line draws itself once the bars are up
    const draw = Math.min(1, Math.max(0, (age - 1.2) / 1.4)) * n;
    const j = Math.min(n - 1, Math.floor(draw)), f = draw - j;
    for (let i = 0; i < M; i++) {
      let p = pts[i];
      if (i > draw) p = pts[j].clone().lerp(pts[j + 1], Math.min(1, f));
      lp[i * 3] = p.x; lp[i * 3 + 1] = p.y; lp[i * 3 + 2] = p.z;
      dp[i * 3] = p.x; dp[i * 3 + 1] = p.y; dp[i * 3 + 2] = i <= draw ? p.z : -99999;
    }
    lineG.attributes.position.needsUpdate = true;
    dg.attributes.position.needsUpdate = true;
    growthLine.material.opacity = (0.3 + 0.6 * k) * (0.85 + 0.15 * Math.sin(t * 2));
    dotsG.material.opacity = 0.3 + 0.6 * k;
  });
}

/* Eagle ---------------------------------------------------------------------- */
const eagle = makeEagle(await loadEagleCanvas(), { boost: 1.2, halo: 0.3 });
scene.add(eagle.rig);
const hero = document.querySelector('.page-hero');

// ?still skips the fly-in (used to take still screenshots of the page)
let mx = 0, my = 0, tmx = 0, tmy = 0, time = 0, intro = reduce || /[?&]still\b/.test(location.search) ? 1 : 0, lastY = window.scrollY, vel = 0;
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
  eagle.rig.position.set((ex - 0.5) * W + mx * 30, (0.5 - ey) * H - my * 20 + Math.sin(time * 0.9) * (kind === 'updraft' ? 18 : 8), -(1 - iv) * 1500);
  eagle.rig.scale.setScalar(es);
  eagle.rig.rotation.y = mx * 0.55 + (kind === 'stars' || kind === 'showcase' ? Math.sin(time * 0.3) * 0.15 : 0);
  eagle.rig.rotation.z = kind === 'updraft' ? Math.sin(time * 0.7) * 0.06 : 0;   // banking on the rising air
  eagle.rig.rotation.x = my * 0.3;
  eagle.set(time, eo * iv, kind === 'grid' || kind === 'growth' ? 1.1 : kind === 'updraft' ? 1.25 : 0.85, Math.min(1, Math.abs(vel) / 3000));
  if (signalAt) signalAt.copy(eagle.rig.position);
  eaglePos.copy(eagle.rig.position);

  update.forEach((fn) => fn(time, dt, y, k, vel));
  camera.position.set(mx * 50, -my * 30, dist);
  camera.lookAt(0, 0, 0);
  tuneQuality(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
