/* Brixon — interactive cutaway house (Services) + footer skyline */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - Math.pow(1 - t, 3);

function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}
function whenVisible(el, cb) {
  let on = false;
  new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting; if (on && !was) cb(); }, { rootMargin: '80px' }).observe(el);
  return () => on;
}

/* =====================================================================
   HOUSE — every service is a part of the building
   ===================================================================== */
function house() {
  const canvas = document.getElementById('house');
  if (!canvas) return;
  const stage = canvas.parentElement, section = document.getElementById('services');
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
  scene.environmentIntensity = .45;
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 300);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbdb6a6, .8));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
  sun.position.set(14, 24, 16); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 80 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = .03; sun.shadow.radius = 5;
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .2 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.6; ground.receiveShadow = true; scene.add(ground);

  const root = new THREE.Group(); scene.add(root);
  const parts = {};
  const part = k => parts[k] ??= { subs: [], mats: [], h: 0, d: 0 };
  const sub = (k, off = [0, 0, 0]) => { const g = new THREE.Group(); root.add(g); part(k).subs.push({ g, off: new THREE.Vector3(...off) }); return g; };
  const mat = (k, color, o = {}) => {
    const m = new (o.physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({ color, roughness: o.roughness ?? .85, metalness: o.metalness ?? 0, transparent: true, opacity: o.opacity ?? 1, emissive: 0xffc60a, emissiveIntensity: 0 });
    m.userData.o = o.opacity ?? 1; if (k) part(k).mats.push(m); return m;
  };
  const put = (g, geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const box = (g, m, w, h, d, x, y, z) => put(g, new THREE.BoxGeometry(w, h, d), m, x, y, z);
  const cyl = (g, m, r, len, x, y, z, axis = 'y') => { const o = put(g, new THREE.CylinderGeometry(r, r, len, 20), m, x, y, z); if (axis === 'x') o.rotation.z = Math.PI / 2; if (axis === 'z') o.rotation.x = Math.PI / 2; return o; };

  const Y = 0xffc60a, B = 0x1b74bd, INK = 0x1a2026;
  const G1 = 1.375, G2 = 4.375, WH = 2.75; // storey wall centres / height

  /* foundation */
  { const g = sub('found', [0, -2, 0]), c = mat('found', 0xb9b3a5, { roughness: 1 });
    box(g, c, 12.6, .6, 8.6, 0, -.3, 0);
    [-6, -2, 2, 6].forEach(x => [-4, 4].forEach(z => box(g, c, 1.1, .4, 1.1, x * .975, -.8, z * .96))); }

  /* floor finishes */
  { const g = sub('floor', [0, -.9, 0]);
    const epoxy = mat('floor', 0x8c9ca4, { roughness: .1, metalness: .15 });
    box(g, epoxy, 11.6, .06, 7.6, 0, .03, 0);
    const line = mat('floor', Y, { roughness: .4 });
    box(g, line, .08, .065, 6.6, -5.4, .035, 0); box(g, line, .08, .065, 6.6, -2.5, .035, 0);
    const g2 = sub('floor'); box(g2, mat('floor', 0xb98a5a, { roughness: .5 }), 7.6, .05, 7.6, 2, 3.03, 0); }

  /* structure */
  { const g = sub('struct'), c = mat('struct', 0xcfc9bc, { roughness: .95 });
    [-6, -2, 2, 6].forEach(x => [-4, 4].forEach(z => box(g, c, .3, WH, .3, x * .975, G1, z * .96)));
    box(g, c, 12.2, .25, 8.2, 0, 2.875, 0);
    [-2, 2, 6].forEach(x => [-4, 4].forEach(z => box(g, c, .3, WH, .3, x * .975 + (x === -2 ? .1 : 0), G2, z * .96)));
    [-3.84, 3.84].forEach(z => box(g, c, 7.9, .22, .26, 2, 5.64, z));
    [-1.85, 5.85].forEach(x => box(g, c, .26, .22, 7.9, x, 5.64, 0)); }

  /* walls */
  { const w = mat('walls', 0xece8de), dark = mat('walls', 0x2a3138, { roughness: .7 }), T = .18;
    const back = sub('walls', [0, 0, -3.4]); box(back, w, 11.6, WH, T, 0, G1, -3.95); box(back, w, 7.6, WH, T, 2, G2, -3.95);
    const left = sub('walls', [-3.4, 0, 0]); box(left, w, T, WH, 7.6, -5.95, G1, 0); box(left, w, T, WH, 7.6, -1.95, G2, 0);
    const right = sub('walls', [3.4, 0, 0]);
    [G1, G2].forEach(y => { box(right, w, T, WH, 2.3, 5.95, y, -2.65); box(right, w, T, WH, 2.3, 5.95, y, 2.65); });
    const front = sub('walls', [0, 0, 3.4]);
    box(front, w, .6, WH, T, -2, G1, 3.95); box(front, w, .6, WH, T, 3.3, G1, 3.95); box(front, w, 1.2, WH, T, 5.2, G1, 3.95);
    box(front, w, 3.4, .45, T, -4, 2.525, 3.95);
    box(front, w, .6, WH, T, -1.5, G2, 3.95); box(front, dark, 3.6, WH, T, 4, G2, 3.95); }

  /* glass & aluminium */
  { const glass = mat('glass', 0x7fc0e6, { physical: true, roughness: .05, metalness: .2, opacity: .42 });
    const fr = mat('glass', INK, { roughness: .4, metalness: .6 });
    const front = sub('glass', [0, 0, 5.2]);
    box(front, glass, 4.7, WH, .06, .65, G1, 3.95); box(front, glass, 1, WH, .06, 4.1, G1, 3.95); box(front, glass, 3.4, WH, .06, .5, G2, 3.95);
    [-1.7, -.13, 1.43, 3, 3.6, 4.6].forEach(x => box(front, fr, .08, WH, .1, x, G1, 3.95));
    [-1.2, .5, 2.2].forEach(x => box(front, fr, .08, WH, .1, x, G2, 3.95));
    [[.65, 4.7, .04], [.65, 4.7, 2.71], [4.1, 1, 2.71]].forEach(([x, wd, y]) => box(front, fr, wd, .08, .1, x, y, 3.95));
    [[.5, 3.4, 3.04], [.5, 3.4, 5.71]].forEach(([x, wd, y]) => box(front, fr, wd, .08, .1, x, y, 3.95));
    box(front, mat('glass', Y, { roughness: .4 }), .06, .5, .14, 3.75, 1.3, 4.0); // door pull
    const side = sub('glass', [5.2, 0, 0]);
    [G1, G2].forEach(y => { box(side, glass, .06, WH, 3, 5.95, y, 0); [-1.5, 0, 1.5].forEach(z => box(side, fr, .1, WH, .08, 5.95, y, z)); }); }

  /* roll-up door */
  const slats = [];
  { const g = sub('rollup', [0, 0, 5.2]);
    const steel = mat('rollup', 0xaab2b8, { roughness: .4, metalness: .7 });
    for (let i = 0; i < 9; i++) slats.push(box(g, i === 0 ? mat('rollup', Y, { roughness: .5 }) : steel, 3.4, .235, .07, -4, 0, 3.98));
    box(g, mat('rollup', INK, { roughness: .5 }), 3.6, .34, .34, -4, 2.5, 4.16);
    [-5.72, -2.28].forEach(x => box(g, steel, .08, 2.3, .12, x, 1.15, 3.98)); }

  /* roof & waterproofing */
  { const c = mat('roof', 0xd6d1c5), mem = mat('roof', B, { roughness: .35 });
    const g = sub('roof', [0, 4.2, 0]);
    box(g, c, 8.8, .25, 8.8, 2, 5.875, 0); box(g, mem, 8.3, .06, 8.3, 2, 6.03, 0);
    [-4.3, 4.3].forEach(z => box(g, c, 8.8, .4, .2, 2, 6.2, z)); [-2.3, 6.3].forEach(x => box(g, c, .2, .4, 8.8, x, 6.2, 0));
    const t = sub('roof', [0, 1.7, 0]), rail = mat('roof', INK, { roughness: .5, metalness: .5 });
    box(t, mem, 3.85, .06, 7.9, -4.05, 3.03, 0);
    box(t, rail, 4, .06, .06, -4, 3.95, 4); box(t, rail, .06, .06, 8, -6, 3.95, 0);
    [-6, -4.7, -3.4, -2.1].forEach(x => box(t, rail, .05, .95, .05, x, 3.5, 4)); [-4, -2, 0, 2].forEach(z => box(t, rail, .05, .95, .05, -6, 3.5, z)); }

  /* MEP */
  { const g = sub('mep'), water = mat('mep', B, { roughness: .4, metalness: .3 }), elec = mat('mep', Y, { roughness: .45 }), duct = mat('mep', 0xc3c9ce, { roughness: .35, metalness: .8 }), dk = mat('mep', INK);
    cyl(g, water, .075, 5.6, 5.45, 2.8, -3.45); cyl(g, water, .075, 10.6, .15, 2.55, -3.45, 'x'); cyl(g, water, .06, 3.2, 3.5, 2.55, -1.85, 'z'); cyl(g, water, .06, 2.4, -4, 2.55, -2.25, 'z');
    cyl(g, elec, .05, 7.4, -2.35, 2.62, 0, 'z'); cyl(g, elec, .05, 11.4, 0, 2.62, .6, 'x'); cyl(g, elec, .05, 1.3, -2.35, 1.95, -3.6);
    box(g, dk, .14, .8, .55, -2.3, 1.3, -3.4);
    box(g, duct, 6.6, .32, .55, 2.2, 5.3, -1.2); box(g, duct, .5, .3, 2.8, 4.4, 5.3, .4); box(g, duct, .5, .3, 2.2, 0, 5.3, .1);
    box(g, duct, 1.05, .8, .42, -5.1, 3.46, -3.2); const fan = cyl(g, dk, .3, .03, -5.1, 3.46, -2.98, 'z'); fan.castShadow = false; }

  /* water treatment */
  { const v = mat('water', B, { roughness: .3, metalness: .3 }), st = mat('water', 0xc3c9ce, { roughness: .3, metalness: .9 }), yl = mat('water', Y, { roughness: .45 });
    const g = sub('water', [3.2, 0, 0]);
    [-3.2, -2.35, -1.5].forEach(z => { cyl(g, v, .32, 1.5, 7, .75 - .6, z); const cap = put(g, new THREE.SphereGeometry(.32, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), v, 7, .9, z); cap.scale.y = .6; cyl(g, st, .05, .5, 7, 1.25, z); });
    cyl(g, st, .05, 2.2, 7, 1.5, -2.35, 'z'); cyl(g, st, .05, 1.4, 6.3, 1.5, -3.45, 'x'); box(g, yl, 1.1, .08, 2.6, 7, -.56, -2.35);
    const t = sub('water', [0, 5.6, 0]);
    cyl(t, st, .85, 1.3, 4.6, 7.25, -2.3); const dome = put(t, new THREE.SphereGeometry(.85, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), st, 4.6, 7.9, -2.3); dome.scale.y = .35;
    [[-.55, -.55], [.55, -.55], [-.55, .55], [.55, .55]].forEach(([x, z]) => box(t, yl, .1, .55, .1, 4.6 + x, 6.33, -2.3 + z)); }

  /* fire detection, alarm & CCTV */
  const leds = []; let camHead, camCone;
  { const g = sub('safety'), red = mat('safety', 0xd8321f, { roughness: .45 }), wh = mat('safety', 0xf4f2ec, { roughness: .4 }), dk = mat('safety', INK, { roughness: .4 });
    const led = new THREE.MeshBasicMaterial({ color: 0xff3b1f, transparent: true });
    [[0, 2.72, 1.2], [4, 2.72, -1.2], [-4, 2.72, 0], [2, 5.5, 1.5], [3.5, 5.5, -2.2]].forEach(([x, y, z]) => {
      cyl(g, wh, .17, .06, x, y, z); const l = put(g, new THREE.SphereGeometry(.05, 10, 8), led.clone(), x, y - .05, z); l.castShadow = false; leds.push(l); });
    cyl(g, red, .035, 11.2, 0, 2.66, 2.4, 'x'); cyl(g, red, .035, 7.2, 2, 5.45, 2.6, 'x');
    box(g, red, .3, .3, .1, 2, 2.05, 4.1); cyl(g, red, .13, .06, 2, 2.05, 4.17, 'z');
    box(g, red, .26, .4, .12, -2, 1.5, 4.1);
    camHead = new THREE.Group(); camHead.position.set(5.95, 5.35, 4.1); g.add(camHead);
    box(camHead, dk, .1, .3, .1, 0, .12, -.1);
    const body = new THREE.Group(); body.rotation.x = .45; camHead.add(body);
    box(body, wh, .2, .17, .46, 0, 0, .2); cyl(body, dk, .07, .06, 0, 0, .45, 'z');
    camCone = new THREE.Mesh(new THREE.ConeGeometry(1.7, 6, 28, 1, true), new THREE.MeshBasicMaterial({ color: Y, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    camCone.rotation.x = -Math.PI / 2; camCone.position.z = 3.45; body.add(camCone); }

  /* interiors & fit-out */
  { const g = sub('interior'), ink = mat('interior', INK, { roughness: .7 }), yl = mat('interior', Y, { roughness: .5 }), wh = mat('interior', 0xf1eee6, { roughness: .6 }), tim = mat('interior', 0xb98a5a, { roughness: .6 }), bl = mat('interior', B, { roughness: .7 });
    box(g, ink, 2.6, .42, .95, .4, .27, 1.2); box(g, ink, 2.6, .5, .22, .4, .7, .78); box(g, ink, .22, .3, .95, -.8, .62, 1.2); box(g, ink, .22, .3, .95, 1.6, .62, 1.2);
    box(g, yl, .5, .16, .5, -.1, .57, 1.25); box(g, tim, 1.1, .3, .6, .4, .21, 2.5); box(g, bl, 3.4, .03, 2.4, .4, .075, 1.9);
    box(g, wh, 3.2, .88, .6, 3.9, .5, -3.4); box(g, ink, 3.3, .06, .66, 3.9, .97, -3.4); box(g, tim, 1.6, .9, .7, 3.6, .51, -1.6); box(g, ink, 1.75, .05, .82, 3.6, .98, -1.6);
    for (let i = 0; i < 10; i++) box(g, tim, .3, .275 * (i + 1), 1, -1.35 + i * .3, .06 + .1375 * (i + 1), -3.25);
    box(g, wh, 2, .4, 1.7, 4.3, 3.26, -2.7); box(g, bl, 2, .1, 1.1, 4.3, 3.5, -2.4); box(g, tim, 2.1, .9, .12, 4.3, 3.5, -3.6);
    box(g, tim, 1.5, .06, .6, .2, 3.8, -3.4); box(g, ink, .06, .74, .55, -.5, 3.42, -3.4); box(g, ink, .06, .74, .55, .9, 3.42, -3.4);
    for (let l = 0; l < 3; l++) for (let i = 0; i < 2; i++) box(g, l === 1 ? yl : wh, .8, .3, .5, -4.9 + i * .85, .22 + l * .31, -2.9); }

  /* site (not a service part) */
  { const s = new THREE.Group(); root.add(s);
    const c = new THREE.MeshStandardMaterial({ color: 0xc9c3b5, roughness: 1 }), tr = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 1 }), lf = new THREE.MeshStandardMaterial({ color: 0x7f8c5a, roughness: 1, flatShading: true });
    box(s, c, 3.6, .08, 3.2, -4, -.56, 5.9); box(s, c, 1.4, .08, 2.4, 4.1, -.56, 5.5);
    [[9.3, 3.4, 1], [-8.7, -2.2, 1.25], [8.6, -5.4, .8]].forEach(([x, z, k]) => { cyl(s, tr, .14 * k, 1.6 * k, x, -.6 + .8 * k, z); const l = put(s, new THREE.IcosahedronGeometry(1.15 * k, 0), lf, x, -.6 + 2.2 * k, z); l.rotation.set(x, z, 0); }); }

  /* ---------- services → parts + camera ---------- */
  const ALL = Object.keys(parts);
  const S = [
    { p: ['rollup'], az: -.38, el: .17, R: 25, look: [-3.6, 1.5, 2.5], e: 0 },
    { p: ['glass'], az: .55, el: .2, R: 31, look: [1.5, 2.9, 1.5], e: 0 },
    { p: ['water'], az: 1.95, el: .3, R: 31, look: [4.5, 3, -2], e: 0 },
    { p: ['safety'], az: .72, el: .3, R: 31, look: [2, 3, 1], e: 0 },
    { p: ['walls'], az: -.7, el: .32, R: 37, look: [0, 2.6, 0], e: 0 },
    { p: ['struct', 'found'], az: .6, el: .34, R: 40, look: [0, 2.4, 0], e: .5 },
    { p: ['mep', 'water'], az: 2.25, el: .48, R: 37, look: [0, 3, 0], e: 0 },
    { p: ['roof'], az: .5, el: .78, R: 36, look: [0, 4, 0], e: .22 },
    { p: ['floor'], az: .3, el: .9, R: 34, look: [0, 1.5, 0], e: 0 },
    { p: ['interior'], az: .72, el: .62, R: 32, look: [1, 2.4, 0], e: 0 },
    { p: [], az: .6, el: .36, R: 40, look: [0, 2.6, 0], e: 0, rebuild: true },
    { p: [], az: 1.0, el: .46, R: 48, look: [0, 3.4, 0], e: 1 },
  ];
  const items = [...document.querySelectorAll('#svcList li')];
  const noEl = document.getElementById('houseNo'), nameEl = document.getElementById('houseName');
  const idleName = nameEl.textContent, idleNo = noEl.textContent;
  let sel = -1, locked = false, rebuildAt = -1e9;
  const select = i => {
    if (i === sel) return;
    sel = i;
    items.forEach((li, k) => li.classList.toggle('active', k === i));
    if (i < 0) { noEl.textContent = idleNo; nameEl.textContent = idleName; return; }
    noEl.textContent = 'S—' + String(i + 1).padStart(2, '0');
    nameEl.textContent = items[i].textContent.trim();
    if (S[i].rebuild) rebuildAt = performance.now();
  };
  items.forEach((li, i) => {
    li.tabIndex = 0;
    if (fine) li.addEventListener('pointerenter', () => { if (!locked) select(i); });
    li.addEventListener('focus', () => select(i));
    li.addEventListener('click', () => { if (locked && sel === i) { locked = false; if (!fine) select(-1); } else { locked = true; select(i); } });
  });
  if (fine) document.getElementById('svcList').addEventListener('pointerleave', () => { if (!locked) select(-1); });
  else {
    // touch: the service nearest the reading line drives the house
    const pick = () => {
      if (locked) return;
      const r = section.getBoundingClientRect(), line = innerHeight * .68;
      if (r.top > innerHeight * .4 || r.bottom < line) return select(-1);
      let best = -1, bd = 1e9;
      items.forEach((li, i) => { const b = li.getBoundingClientRect(), d = Math.abs((b.top + b.bottom) / 2 - line); if (d < bd) { bd = d; best = i; } });
      select(bd < 90 ? best : -1);
    };
    addEventListener('scroll', pick, { passive: true });
  }

  // drag to orbit
  let drag = false, lx = 0, dragAz = 0, mx = 0, my = 0;
  stage.addEventListener('pointerdown', e => { drag = true; lx = e.clientX; stage.classList.add('drag'); });
  addEventListener('pointermove', e => {
    if (drag) { dragAz -= (e.clientX - lx) * .008; lx = e.clientX; }
    const r = stage.getBoundingClientRect(); mx = clamp((e.clientX - r.left) / r.width, 0, 1) - .5; my = clamp((e.clientY - r.top) / r.height, 0, 1) - .5;
  }, { passive: true });
  const end = () => { drag = false; stage.classList.remove('drag'); };
  addEventListener('pointerup', end); addEventListener('pointercancel', end);

  let aspect = 1;
  const resize = () => { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(stage); resize();

  const cur = { az: .6, el: .36, R: 40, e: 0, look: new THREE.Vector3(0, 2.6, 0) }, tgt = new THREE.Vector3();
  const visible = whenVisible(stage, () => { last = performance.now(); requestAnimationFrame(frame); });
  let last = performance.now();
  function frame(now) {
    if (!visible()) return;
    const dt = Math.min(.05, (now - last) / 1000), t = now / 1000; last = now;
    const k = reduce ? 1 : 1 - Math.pow(.0015, dt); // frame-rate independent easing
    const s = sel >= 0 ? S[sel] : null;

    // scroll opens the house up while the list is being read
    const r = section.getBoundingClientRect();
    const q = clamp((innerHeight * .7 - r.top) / Math.max(1, r.height - innerHeight * .2));
    let e = s ? s.e : smooth(.12, .4, q) * (1 - smooth(.78, .98, q)) * .85;
    if (s?.rebuild) e = (1 - easeOut(clamp((now - rebuildAt) / 1700))) * 1.5;

    const az = (s ? s.az : .6 + (reduce ? 0 : Math.sin(t * .16) * .3)) + dragAz + mx * .18;
    if (!drag && s) dragAz *= 1 - k * .5;
    cur.az += (az - cur.az) * k; cur.el += ((s ? s.el : .36) - my * .1 - cur.el) * k;
    cur.R += ((s ? s.R : 40) * Math.max(1, 1.15 / aspect) - cur.R) * k;
    cur.e += (e - cur.e) * (s?.rebuild ? 1 : k);
    cur.look.lerp(s ? tgt.set(...s.look) : tgt.set(0, 2.6, 0), k);
    camera.position.set(cur.look.x + Math.sin(cur.az) * Math.cos(cur.el) * cur.R, cur.look.y + Math.sin(cur.el) * cur.R, cur.look.z + Math.cos(cur.az) * Math.cos(cur.el) * cur.R);
    camera.lookAt(cur.look);

    const pulse = .17 + Math.sin(t * 4.2) * .07;
    for (const key of ALL) {
      const p = parts[key], on = s && s.p.includes(key), dim = s && s.p.length && !on;
      p.h += ((on ? 1 : 0) - p.h) * k; p.d += ((dim ? 1 : 0) - p.d) * k;
      for (const m of p.mats) { m.opacity = m.userData.o * (1 - .86 * p.d); m.emissiveIntensity = p.h * pulse; m.depthWrite = p.d < .5; }
      // in a rebuild, parts land one after another
      const order = ALL.indexOf(key), stag = s?.rebuild ? clamp(cur.e - order * .06, 0, 2) : cur.e;
      for (const sb of p.subs) { sb.g.position.copy(sb.off).multiplyScalar(stag); sb.g.traverse(o => { if (o.isMesh) o.castShadow = p.d < .5; }); }
    }

    // roll-up door cycles when selected
    const open = sel === 0 ? .5 - .5 * Math.cos(t * 1.3) : 0;
    slats.forEach((sl, i) => { const y = .118 + i * .2555 + open * 2.3; sl.position.y = Math.min(y, 2.42); sl.visible = y < 2.36; });
    // alarm LEDs blink; the camera sweeps and shows its field of view when selected
    leds.forEach((l, i) => l.material.opacity = (Math.sin(t * 5 + i * 1.7) > .55 ? 1 : .15) * (1 - .8 * parts.safety.d));
    camHead.rotation.y = .5 + Math.sin(t * .9) * .55;
    camCone.material.opacity = parts.safety.h * .2;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
}

/* =====================================================================
   SKYLINE — a city rising behind the footer wordmark
   ===================================================================== */
function city() {
  const canvas = document.getElementById('city');
  if (!canvas) return;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0f1316, 52, 82);
  const camera = new THREE.PerspectiveCamera(30, 2, 1, 200);
  scene.add(new THREE.HemisphereLight(0x9cc4ea, 0x0f1316, 1.1));
  const key = new THREE.DirectionalLight(0xffe6c4, 1.7); key.position.set(-20, 18, 14); scene.add(key);

  let seed = 21; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const B = [];
  for (let row = 0; row < 5; row++) for (let x = -58; x <= 58; x += 2.1 + rnd() * .5) {
    const centre = Math.exp(-(x * x) / 900);
    const h = (2 + Math.pow(rnd(), 2.2) * 15) * (.45 + centre * .75) * (1 - row * .07);
    const r = rnd();
    B.push({ x: x + (rnd() - .5) * .8, z: -row * 3.4 + (rnd() - .5), w: 1.3 + rnd() * .7, d: 1.3 + rnd() * .6, h, delay: Math.abs(x) / 58 * .8 + rnd() * .25,
      col: r < .07 ? 0xffc60a : r < .13 ? 0x1b74bd : [0x2b353e, 0x34404a, 0x232b33, 0x3d4954][Math.floor(rnd() * 4)] });
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), new THREE.MeshStandardMaterial({ roughness: .75 }), B.length);
  const c = new THREE.Color(); B.forEach((b, i) => mesh.setColorAt(i, c.setHex(b.col))); scene.add(mesh);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 80), new THREE.MeshStandardMaterial({ color: 0x151b20, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = -10;

  const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  addEventListener('resize', resize); resize();
  let px = 0, ptx = 0, pIn = 0, pInT = 0;
  addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); ptx = (e.clientX / innerWidth - .5); pInT = e.clientY > r.top - 80 ? 1 : 0; }, { passive: true });

  const m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
  let start = -1;
  const visible = whenVisible(canvas, () => { if (start < 0) start = performance.now(); requestAnimationFrame(frame); });
  function frame(now) {
    if (!visible()) return;
    const t = now / 1000, g = reduce ? 3 : (now - start) / 1000 * .75;
    px += (ptx - px) * .06; pIn += (pInT - pIn) * .05;
    const half = Math.tan(camera.fov * Math.PI / 360) * 50 * camera.aspect, cx = px * 2 * half;
    B.forEach((b, i) => {
      const k = clamp(g - b.delay), grow = 1 - Math.pow(1 - k, 3) + Math.sin(k * Math.PI) * .12;
      const near = Math.exp(-Math.pow(b.x - cx, 2) / 40) * pIn;
      const h = b.h * grow * (1 + (reduce ? 0 : Math.sin(t * 1.1 + b.x * .22 + b.z) * .05)) + near * 3.2;
      pos.set(b.x, 0, b.z); scl.set(b.w, Math.max(h, .001), b.d); mesh.setMatrixAt(i, m4.compose(pos, quat, scl));
    });
    mesh.instanceMatrix.needsUpdate = true;
    camera.position.set(px * 9, 7, 50); camera.lookAt(px * 3, 10, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
}

house();
city();
